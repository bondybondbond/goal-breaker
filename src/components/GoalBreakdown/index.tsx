import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Check, X, Target, Edit3, Move, Eye, EyeOff, Focus, Menu } from 'lucide-react';
import { ConnectionLines } from '../ConnectionLines';
import { gridToPosition, getNextRowForLevel, GRID, calculateChildPosition, standardizeGoalPositions } from '../../utils/gridHelpers';
import { getLevelStyle, getLevelStats, getLevelLabel } from '../../utils/styleHelpers';
import { exportToMermaid, copyToClipboard, importFromMermaid } from '../../utils/mermaidHelpers';
import ConfettiCelebration from '../ConfettiCelebration';
import GoalCardMenu from '../GoalCardMenu';
import GoalCard from '../GoalCard';

// Types for celebration system
type CelebrationType = 'humble' | 'nice' | 'awesome' | 'epic';

const GoalBreaker = () => {
  const [goals, setGoals] = useState([]);
  const [mainGoal, setMainGoal] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [currentView, setCurrentView] = useState('canvas'); // 'canvas' or 'list'
  const [currentDirection, setCurrentDirection] = useState('right-left'); // 'right-left', 'left-right', 'up-down'
  const [draggedGoal, setDraggedGoal] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connections, setConnections] = useState([]);
  const [hiddenLevels, setHiddenLevels] = useState(new Set());
  const [focusedGoal, setFocusedGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null); // Track which card shows navigation buttons
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState('');
  
  // Celebration state - visual only, no messages
  const [celebration, setCelebration] = useState<{
    isVisible: boolean;
    type: CelebrationType;
  }>({
    isVisible: false,
    type: 'humble'
  });
  
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight - 80  // Account for header
  });



  // Initialize with empty state - user defines problem directly on canvas
  useEffect(() => {
    if (!isStarted) {
      setIsStarted(true);
      // Start with no offset since canvas is now viewport-sized
      setCanvasOffset({ x: 0, y: 0 });
    }
  }, [isStarted]);

  // Handle window resize to keep canvas viewport-sized
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight - 80
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const newConnections = [];
    const visibleGoals = getVisibleGoals();
    const visibleGoalIds = new Set(visibleGoals.map(g => g.id));
    
    goals.forEach(goal => {
      if (goal.parentId !== null) {
        const parent = goals.find(g => g.id === goal.parentId);
        if (parent && visibleGoalIds.has(parent.id)) {
          // Check if child is visible
          if (visibleGoalIds.has(goal.id)) {
            // Normal connection: both parent and child are visible
            // Direction-aware connection points
            let fromX, fromY, toX, toY, midX, midY, curveOffset, path;
            
            if (currentDirection === 'up-down') {
              // Top-down: connect from bottom of parent to top of child
              fromX = parent.position.x + GRID.CARD_WIDTH / 2; // Center of parent card
              fromY = parent.position.y + GRID.CARD_HEIGHT;    // Bottom edge of parent
              toX = goal.position.x + GRID.CARD_WIDTH / 2;     // Center of child card
              toY = goal.position.y;                           // Top edge of child
              
              // Create vertical line with slight curve
              midY = fromY + (toY - fromY) / 2;
              curveOffset = 20; // Small fixed curve for visual appeal
              path = `M ${fromX} ${fromY} Q ${fromX - curveOffset} ${midY} ${toX} ${toY}`;
            } else {
              // Horizontal layouts (left-right and right-left)
              fromX = currentDirection === 'left-right' 
                ? parent.position.x + GRID.CARD_WIDTH  // Right edge of parent card
                : parent.position.x;                   // Left edge of parent card
              fromY = parent.position.y + GRID.CARD_HEIGHT / 2; // Middle height of parent
              toX = currentDirection === 'left-right'
                ? goal.position.x                      // Left edge of child card  
                : goal.position.x + GRID.CARD_WIDTH;   // Right edge of child card
              toY = goal.position.y + GRID.CARD_HEIGHT / 2; // Middle height of child
              
              // Create straight horizontal line with slight curve
              midX = fromX + (toX - fromX) / 2;
              curveOffset = 20; // Small fixed curve for visual appeal
              path = `M ${fromX} ${fromY} Q ${midX} ${fromY - curveOffset} ${toX} ${toY}`;
            }
            
            newConnections.push({
              id: `${parent.id}-${goal.id}`,
              from: { x: fromX, y: fromY },
              to: { x: toX, y: toY },
              completed: parent.completed && goal.completed,
              path: path,
              type: 'normal'
            });
          } else {
            // Child is hidden - create placeholder connection
            let fromX, fromY, toX, toY;
            
            if (currentDirection === 'up-down') {
              // Top-down: placeholder below parent
              fromX = parent.position.x + GRID.CARD_WIDTH / 2; // Center of parent card
              fromY = parent.position.y + GRID.CARD_HEIGHT;    // Bottom edge of parent
              toX = fromX;                                     // Same X position
              toY = fromY + 120;                               // Placeholder below
            } else {
              // Horizontal layouts
              fromX = currentDirection === 'left-right' 
                ? parent.position.x + GRID.CARD_WIDTH  // Right edge of parent card
                : parent.position.x;                   // Left edge of parent card
              fromY = parent.position.y + GRID.CARD_HEIGHT / 2;
              toX = currentDirection === 'left-right'
                ? fromX + 120                          // Placeholder to the right
                : fromX - 120;                         // Placeholder to the left
              toY = fromY;
            }
            
            // Count hidden children for this parent
            const hiddenChildren = goals.filter(g => 
              g.parentId === parent.id && !visibleGoalIds.has(g.id)
            ).length;
            
            // Only add placeholder if we haven't already added one for this parent
            const existingPlaceholder = newConnections.find(c => 
              c.type === 'placeholder' && c.parentId === parent.id
            );
            
            if (!existingPlaceholder) {
              newConnections.push({
                id: `placeholder-${parent.id}`,
                from: { x: fromX, y: fromY },
                to: { x: toX, y: toY },
                completed: false,
                path: `M ${fromX} ${fromY} L ${toX} ${toY}`,
                type: 'placeholder',
                parentId: parent.id,
                hiddenCount: hiddenChildren
              });
            }
          }
        }
      }
    });
    setConnections(newConnections);
  }, [goals, hiddenLevels, focusedGoal, GRID.CARD_WIDTH, GRID.CARD_HEIGHT, currentDirection]);

  // Re-position all goals when direction changes
  useEffect(() => {
    if (goals.length > 0) {
      const standardizedGoals = standardizeGoalPositions(goals, canvasSize.width, canvasSize.height, currentDirection);
      setGoals(standardizedGoals);
    }
  }, [currentDirection, canvasSize.width, canvasSize.height]);

  // Calculate existing levels from goals array
  const existingLevels = [...new Set(goals.map(goal => goal.level))].sort();

  // Celebration type logic - purely visual, escalating spectacle
  const getCelebrationType = (goal): CelebrationType => {
    // EPIC: Main goals (level 0) - rocket launch! 🚀
    if (goal.level === 0) {
      return 'epic';
    }
    
    // AWESOME: Goals with children (bigger impact) - confetti rain 🎉
    const hasChildren = goals.some(g => g.parentId === goal.id);
    if (hasChildren) {
      return 'awesome';
    }
    
    // NICE: Regular sub-goals - high five burst 🙌
    if (goal.level === 1) {
      return 'nice';
    }
    
    // HUMBLE: Deep nested tasks - simple thumbs up 👍
    return 'humble';
  };

  // Goal management functions
  const updateGoal = (id, newText) => {
    setGoals(goals.map(goal => 
      goal.id === id 
        ? { ...goal, text: newText, isEditing: false }
        : goal
    ));
  };

  const startEditing = (id) => {
    setGoals(goals.map(goal => 
      goal.id === id 
        ? { ...goal, isEditing: true }
        : goal
    ));
  };

  const toggleComplete = (id) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    
    const wasCompleted = goal.completed;
    const willBeCompleted = !wasCompleted;
    
    // Update the goal
    setGoals(goals.map(goal => 
      goal.id === id 
        ? { ...goal, completed: !goal.completed }
        : goal
    ));
    
    // Trigger celebration only when completing (not uncompleting)
    if (willBeCompleted) {
      const celebrationType = getCelebrationType(goal);
      
      setCelebration({
        isVisible: true,
        type: celebrationType
      });
    }
  };

  const deleteGoal = (id) => {
    const goalToDelete = goals.find(goal => goal.id === id);
    if (!goalToDelete) return;
    
    // Create confirmation message based on goal type and children
    const children = goals.filter(goal => goal.parentId === id);
    let confirmMessage;
    
    if (goalToDelete.level === 0) {
      // Main goal
      if (children.length > 0) {
        confirmMessage = `Are you sure you want to delete this main goal?\n\nThis will also delete ${children.length} sub-task(s).`;
      } else {
        confirmMessage = "Are you sure you want to delete this main goal?";
      }
    } else {
      // Sub-goal
      if (children.length > 0) {
        confirmMessage = `Are you sure you want to delete "${goalToDelete.text || 'this task'}"?\n\nThis will also delete ${children.length} sub-task(s).`;
      } else {
        confirmMessage = `Are you sure you want to delete "${goalToDelete.text || 'this task'}"?`;
      }
    }
    
    // Show confirmation dialog
    const confirmed = window.confirm(confirmMessage);
    
    if (confirmed) {
      setGoals(goals.filter(goal => goal.id !== id && goal.parentId !== id));
    }
  };;

  const reset = () => {
    setGoals([]);
    setMainGoal('');
    setCanvasOffset({ x: 0, y: 0 });
  };

  // Export functionality
  const handleExport = async () => {
    try {
      // Find the main goal (level 0 goals)
      const mainGoals = goals.filter(g => g.level === 0);
      
      if (mainGoals.length === 0 && goals.length === 0) {
        setExportMessage('❌ No goals to export');
        setTimeout(() => setExportMessage(''), 2000);
        return;
      }
      
      // For now, use the first main goal as the primary one
      // In the future, we might want to handle multiple main goals
      const primaryMainGoal = mainGoals.length > 0 ? mainGoals[0].text : 'Untitled Goal';
      
      // Generate mermaid diagram
      const mermaidCode = exportToMermaid(primaryMainGoal, goals);
      
      if (!mermaidCode) {
        setExportMessage('❌ No content to export');
        setTimeout(() => setExportMessage(''), 2000);
        return;
      }
      
      // Copy to clipboard
      const success = await copyToClipboard(mermaidCode);
      
      if (success) {
        setExportMessage('✅ Mermaid code copied!');
      } else {
        setExportMessage('❌ Failed to copy');
      }
      
      // Clear message after 2 seconds
      setTimeout(() => setExportMessage(''), 2000);
      
    } catch (error) {
      console.error('Export failed:', error);
      setExportMessage('❌ Export failed');
      setTimeout(() => setExportMessage(''), 2000);
    }
  };;


  // Import functionality
  const handleImportClick = () => {
    if (goals.length > 0) {
      // Show confirmation dialog
      const confirmed = window.confirm(
        'You have existing goals. Importing will replace your current structure. Continue?'
      );
      if (!confirmed) {
        setIsMenuOpen(false);
        return;
      }
    }
    setIsImportModalOpen(true);
    setImportText('');
    setImportMessage('');
  };

  const handleImportCancel = () => {
    setIsImportModalOpen(false);
    setImportText('');
    setImportMessage('');
  };

  const handleImportConfirm = () => {
    if (!importText.trim()) {
      setImportMessage('❌ Please enter Mermaid code');
      return;
    }

    const result = importFromMermaid(importText);
    
    if (!result.success) {
      setImportMessage(`❌ ${result.error}`);
      return;
    }

    // Import successful - replace current goals
    setGoals(result.goals || []);
    setIsImportModalOpen(false);
    setIsMenuOpen(false);
    setImportMessage('');
    setImportText('');
    setCanvasOffset({ x: 0, y: 0 }); // Reset canvas position
    
    // Show success message briefly
    setExportMessage('✅ Goals imported successfully!');
    setTimeout(() => setExportMessage(''), 2000);
  };

  // Redistribute all children intelligently around their parent (like Mermaid Live)
  const redistributeChildren = (parent, children, canvasWidth, canvasHeight, direction) => {
    if (children.length === 0) return [];
    
    const spacing = GRID.CARD_HEIGHT + GRID.VERTICAL_GAP;
    
    // Calculate X position based on direction
    let x;
    if (direction === 'up-down') {
      x = parent.position.x;
    } else if (direction === 'left-right') {
      x = GRID.MARGIN + ((parent.level + 1) * GRID.COLUMN_WIDTH);
    } else {
      x = canvasWidth - GRID.MARGIN - (((parent.level + 1) + 1) * GRID.COLUMN_WIDTH);
    }
    
    // Calculate Y positions for intelligent distribution
    return children.map((child, index) => {
      let y;
      
      if (direction === 'up-down') {
        // Top-down: position below parent
        y = parent.position.y + GRID.ROW_HEIGHT;
      } else {
        // Horizontal layouts: distribute around parent intelligently
        if (children.length === 1) {
          // Single child: same level as parent
          y = parent.position.y;
        } else if (children.length === 2) {
          // Two children: balanced above and below parent
          const parentCenterY = parent.position.y + (GRID.CARD_HEIGHT / 2);
          const offset = spacing / 2;
          
          if (index === 0) {
            y = parentCenterY - offset - (GRID.CARD_HEIGHT / 2);
          } else {
            y = parentCenterY + offset - (GRID.CARD_HEIGHT / 2);
          }
        } else {
          // Three or more: distribute evenly around parent
          const parentCenterY = parent.position.y + (GRID.CARD_HEIGHT / 2);
          const totalHeight = (children.length - 1) * spacing;
          const startY = parentCenterY - (totalHeight / 2) - (GRID.CARD_HEIGHT / 2);
          
          y = startY + (index * spacing);
        }
      }
      
      return {
        ...child,
        position: {
          x: Math.max(GRID.MARGIN, x),
          y: Math.max(GRID.MARGIN, y)
        }
      };
    });
  };

  const addSubGoal = (parentId) => {
    const parent = goals.find(g => g.id === parentId);
    if (!parent) return;

    // Get existing children
    const existingChildren = goals.filter(g => g.parentId === parentId);
    
    const newId = Math.max(0, ...goals.map(g => g.id), 0) + 1;
    const newLevel = parent.level + 1;

    // Create the new goal first
    const newGoal = {
      id: newId,
      text: '',
      completed: false,
      level: newLevel,
      gridRow: existingChildren.length,
      parentId: parentId,
      position: { x: 0, y: 0 }, // Temporary position
      isEditing: true,
      children: []
    };

    // Update goals with the new child and redistribute all children
    setGoals(prev => {
      const updatedGoals = [...prev, newGoal];
      
      // Get all children of this parent (including the new one)
      const allChildren = updatedGoals.filter(g => g.parentId === parentId);
      
      // Redistribute all children intelligently (like Mermaid Live)
      const redistributedChildren = redistributeChildren(parent, allChildren, canvasSize.width, canvasSize.height, currentDirection);
      
      // Update the goals array with new positions
      return updatedGoals.map(goal => {
        const redistributed = redistributedChildren.find(child => child.id === goal.id);
        return redistributed || goal;
      });
    });
  };

  const addSiblingGoal = (goalId, direction = 'below') => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    // Get existing siblings at same level with same parent
    const existingSiblings = goals.filter(g => 
      g.parentId === goal.parentId && 
      g.level === goal.level && 
      g.id !== goalId
    );
    
    const newId = Math.max(0, ...goals.map(g => g.id), 0) + 1;
    const horizontalGap = GRID.COLUMN_WIDTH - GRID.CARD_WIDTH; // 80px gap
    const verticalGap = GRID.CARD_HEIGHT + GRID.VERTICAL_GAP; // Vertical spacing
    
    let newPosition;
    let goalUpdates = [];

    if (direction === 'left') {
      // TOP-DOWN VIEW: Position new sibling to the left of current goal
      newPosition = {
        x: goal.position.x - GRID.CARD_WIDTH - horizontalGap,
        y: goal.position.y
      };
      
      // Push existing siblings that are to the left further left
      goalUpdates = existingSiblings
        .filter(sibling => sibling.position.x < goal.position.x)
        .map(sibling => ({
          ...sibling,
          position: {
            ...sibling.position,
            x: sibling.position.x - GRID.CARD_WIDTH - horizontalGap
          }
        }));
        
    } else if (direction === 'right') {
      // TOP-DOWN VIEW: Position new sibling to the right of current goal
      newPosition = {
        x: goal.position.x + GRID.CARD_WIDTH + horizontalGap,
        y: goal.position.y
      };
      
      // Push existing siblings that are to the right further right
      goalUpdates = existingSiblings
        .filter(sibling => sibling.position.x > goal.position.x)
        .map(sibling => ({
          ...sibling,
          position: {
            ...sibling.position,
            x: sibling.position.x + GRID.CARD_WIDTH + horizontalGap
          }
        }));
        
    } else if (direction === 'above') {
      // HORIZONTAL VIEWS: Position new sibling above current goal
      newPosition = {
        x: goal.position.x,
        y: goal.position.y - verticalGap
      };
      
      // Push existing siblings that are above further up
      goalUpdates = existingSiblings
        .filter(sibling => sibling.position.y < goal.position.y)
        .map(sibling => ({
          ...sibling,
          position: {
            ...sibling.position,
            y: sibling.position.y - verticalGap
          }
        }));
        
    } else if (direction === 'below') {
      // HORIZONTAL VIEWS: Position new sibling below current goal
      newPosition = {
        x: goal.position.x,
        y: goal.position.y + verticalGap
      };
      
      // Push existing siblings that are below further down
      goalUpdates = existingSiblings
        .filter(sibling => sibling.position.y > goal.position.y)
        .map(sibling => ({
          ...sibling,
          position: {
            ...sibling.position,
            y: sibling.position.y + verticalGap
          }
        }));
        
    } else {
      // Fallback - position below (for backwards compatibility)
      const allSameLevelGoals = [...existingSiblings, goal];
      const maxY = Math.max(...allSameLevelGoals.map(g => g.position.y));
      
      newPosition = {
        x: goal.position.x,
        y: maxY + GRID.CARD_HEIGHT + GRID.VERTICAL_GAP
      };
    }

    const newGoal = {
      id: newId,
      text: '',
      completed: false,
      level: goal.level,
      gridRow: existingSiblings.length + 1,
      parentId: goal.parentId,
      position: newPosition,
      isEditing: true,
      children: []
    };

    setGoals(prev => {
      let updatedGoals = [...prev];
      
      // Apply position updates to existing siblings (for pushing them away)
      if (goalUpdates.length > 0) {
        updatedGoals = updatedGoals.map(g => {
          const update = goalUpdates.find(update => update.id === g.id);
          return update || g;
        });
      }
      
      // Add the new goal
      updatedGoals.push(newGoal);
      
      // Force a re-render to ensure connectors update
      setTimeout(() => {
        setGoals(current => [...current]);
      }, 10);
      return updatedGoals;
    });
  };

  const toggleLevelVisibility = (level) => {
    const newHidden = new Set(hiddenLevels);
    if (newHidden.has(level)) {
      newHidden.delete(level);
    } else {
      newHidden.add(level);
    }
    setHiddenLevels(newHidden);
  };

  const toggleFocus = (goalId) => {
    setFocusedGoal(focusedGoal === goalId ? null : goalId);
  };

  const handleCelebrationComplete = () => {
    setCelebration({
      isVisible: false,
      type: 'humble'
    });
  };

  // Get visible goals based on focus and hidden levels
  const getVisibleGoals = () => {
    let visibleGoals = goals.filter(goal => !hiddenLevels.has(goal.level));
    
    if (focusedGoal) {
      const focusedGoalData = goals.find(g => g.id === focusedGoal);
      if (focusedGoalData) {
        const relatedGoals = new Set();
        
        // Add focused goal and its ancestors
        let current = focusedGoalData;
        while (current) {
          relatedGoals.add(current.id);
          current = goals.find(g => g.id === current.parentId);
        }
        
        // Add all descendants
        const addDescendants = (goalId) => {
          const children = goals.filter(g => g.parentId === goalId);
          children.forEach(child => {
            relatedGoals.add(child.id);
            addDescendants(child.id);
          });
        };
        addDescendants(focusedGoal);
        
        visibleGoals = visibleGoals.filter(goal => relatedGoals.has(goal.id));
      }
    }
    
    return visibleGoals;
  };

  // Add a new root-level goal
  const addRootGoal = (position = null) => {
    const newId = Math.max(0, ...goals.map(g => g.id), 0) + 1;
    const newRow = getNextRowForLevel(0, goals);
    
    // Position ultimate goal on the right side of canvas
    const newPosition = position || (goals.length === 0 
      ? { 
          x: currentDirection === 'left-right' 
            ? GRID.MARGIN 
            : canvasSize.width - GRID.MARGIN - GRID.CARD_WIDTH, // Direction-aware positioning
          y: (canvasSize.height - GRID.CARD_HEIGHT) / 2 
        }
      : gridToPosition(0, newRow, canvasSize.width, currentDirection));

    const newGoal = {
      id: newId,
      text: '',
      completed: false,
      level: 0,
      gridRow: newRow,
      parentId: null,
      position: newPosition,
      isEditing: true,
      children: []
    };

    setGoals(prev => [...prev, newGoal]);
  };

  // Canvas event handlers

  const handleCanvasMouseDown = (e) => {
    // Left click (button 0) to clear selection when clicking on canvas background
    const isLeftButton = e.button === 0;
    const isMiddleButton = e.button === 1;
    
    if (isLeftButton) {
      // Check if clicking on canvas background (not on a goal card)
      if (e.target === e.currentTarget) {
        setSelectedGoal(null);
      }
    }
    
    if (isMiddleButton) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e) => {
    // Handle middle mouse panning
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
    
    // Handle spacebar + mouse panning (Figma style)
    if (spacePressed && !isPanning) {
      if (!panStart.x && !panStart.y) {
        // Initialize pan start position when spacebar panning begins
        setPanStart({ x: e.clientX, y: e.clientY });
      } else {
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        setCanvasOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    }
    
    // Handle goal dragging
    if (draggedGoal) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - canvasRect.left - canvasOffset.x - dragOffset.x;
      const mouseY = e.clientY - canvasRect.top - canvasOffset.y - dragOffset.y;

      setGoals(goals.map(goal => 
        goal.id === draggedGoal.id 
          ? { ...goal, position: { x: mouseX, y: mouseY } }
          : goal
      ));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggedGoal(null);
  };

  const handleCanvasKeyDown = (e) => {
    if (e.code === 'Space') {
      // Don't prevent spacebar if user is editing text
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        return;
      }
      setSpacePressed(true);
      e.preventDefault();
    }
  };

  const handleCanvasKeyUp = (e) => {
    if (e.code === 'Space') {
      // Don't prevent spacebar if user is editing text
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        return;
      }
      setSpacePressed(false);
      setPanStart({ x: 0, y: 0 }); // Reset pan start for next spacebar use
      e.preventDefault();
    }
  };

  const handleGoalDragStart = (goal, e) => {
    // Prevent canvas panning when starting to drag a goal
    e.stopPropagation();
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Calculate the offset from the mouse to the goal's top-left corner
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    const goalX = goal.position.x + canvasOffset.x;
    const goalY = goal.position.y + canvasOffset.y;
    
    setDragOffset({
      x: mouseX - goalX,
      y: mouseY - goalY
    });
    
    setDraggedGoal(goal);
  };

  // Render list view component
  const renderListView = () => {
    const renderGoalItem = (goal, depth = 0) => {
      const children = goals.filter(g => g.parentId === goal.id);
      const levelStyle = getLevelStyle(goal.level, goal.completed);
      
      return (
        <div key={goal.id} className="space-y-2">
          <div 
            className={`flex items-center gap-3 p-3 rounded-lg border-2 ${levelStyle.border} ${levelStyle.bg} transition-all hover:shadow-md`}
            style={{ marginLeft: `${depth * 24}px` }}
          >
            <button
              onClick={() => toggleComplete(goal.id)}
              className={`p-1 rounded transition-colors ${
                goal.completed 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white border-2 border-gray-300 hover:border-green-400'
              }`}
            >
              <Check size={14} />
            </button>
            
            {goal.isEditing ? (
              <div className="flex-1 relative">
                <input
                  type="text"
                  defaultValue={goal.text}
                  className="w-full p-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  placeholder={goal.level === 0 ? "What's your main goal?" : "Enter task..."}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.target.value.trim()) {
                        updateGoal(goal.id, e.target.value);
                      }
                    }
                    if (e.key === 'Escape') {
                      if (goal.level > 0 && !goal.text) {
                        deleteGoal(goal.id);
                      } else {
                        updateGoal(goal.id, goal.text || '');
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value) {
                      updateGoal(goal.id, value);
                    } else if (goal.level > 0) {
                      deleteGoal(goal.id);
                    } else {
                      updateGoal(goal.id, '');
                    }
                  }}
                />

              </div>
            ) : (
              <p 
                className={`flex-1 cursor-pointer p-2 rounded transition-colors ${
                  goal.completed ? 'line-through text-green-700' : `hover:bg-gray-200 ${levelStyle.color}`
                } ${goal.level === 0 ? 'font-bold text-lg' : 'font-medium'}`}
                onClick={() => startEditing(goal.id)}
              >
                {goal.text || (goal.level === 0 ? "Click to define your main goal..." : "Click to add task...")}
              </p>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => addSubGoal(goal.id)}
                className="text-purple-600 hover:bg-purple-100 p-1 rounded"
              >
                <Plus size={16} />
              </button>
              
              {goal.level > 0 && (
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="text-red-600 hover:bg-red-100 p-1 rounded"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          
          {children.length > 0 && (
            <div className="space-y-2">
              {children.map(child => renderGoalItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="p-6 max-w-4xl mx-auto" style={{ marginTop: '80px' }}>
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div 
              className="p-6 border-4 border-dashed border-yellow-300 rounded-xl text-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition-colors"
              onClick={() => {
                const newGoal = {
                  id: 1,
                  text: '',
                  completed: false,
                  level: 0,
                  gridRow: 0,
                  parentId: null,
                  position: {
                    x: (canvasSize.width - GRID.CARD_WIDTH) / 2,
                    y: (canvasSize.height - GRID.CARD_HEIGHT) / 2
                  },
                  children: [],
                  isEditing: true
                };
                setGoals([newGoal]);
              }}
            >
              <Target className="mx-auto mb-3 text-yellow-600" size={48} />
              <h2 className="text-xl font-bold text-yellow-800 mb-2">Start Breaking Down Your Goal</h2>
              <p className="text-yellow-700">Click here to define your main goal and start breaking it down</p>
            </div>
          ) : (
            goals
              .filter(goal => goal.level === 0)
              .map(rootGoal => renderGoalItem(rootGoal))
          )}
        </div>
      </div>
    );
  };

  // Component logic - should be inside the main component function
  if (!isStarted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
      {/* ===== HEADER SECTION ===== */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex justify-between items-center px-6 py-4">
          {/* Left side: Logo and Menu button */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Target className="text-yellow-600" size={24} />
              <h1 className="text-xl font-bold text-gray-800">Goal Breaker</h1>
              {focusedGoal && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Focus Mode Active
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              <Menu size={20} />
              <span>Menu</span>
            </button>
          </div>

          {/* Right side: Controls and placeholders */}
          <div className="flex items-center gap-4">
            {/* Direction Toggle */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-lg border border-gray-200">
              <button
                onClick={() => setCurrentDirection('right-left')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 group relative ${
                  currentDirection === 'right-left' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                ⬅️
                {/* Tooltip below */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Right to Left
                  <div className="text-[10px] text-gray-300">Goal on right</div>
                </div>
              </button>
              <button
                onClick={() => setCurrentDirection('left-right')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 group relative ${
                  currentDirection === 'left-right' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                ➡️
                {/* Tooltip below */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Left to Right
                  <div className="text-[10px] text-gray-300">Goal on left</div>
                </div>
              </button>
              <button
                onClick={() => setCurrentDirection('up-down')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 group relative ${
                  currentDirection === 'up-down' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                ⬇️
                {/* Tooltip below */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Up to Down
                  <div className="text-[10px] text-gray-300">Goal on top</div>
                </div>
              </button>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-lg border border-gray-200">
              <button
                onClick={() => {
                  // When switching to canvas view, standardize all goal positions
                  if (currentView !== 'canvas' && goals.length > 0) {
                    const standardizedGoals = standardizeGoalPositions(goals, canvasSize.width, canvasSize.height, currentDirection);
                    setGoals(standardizedGoals);
                  }
                  setCurrentView('canvas');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currentView === 'canvas' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Canvas
              </button>
              <button
                onClick={() => setCurrentView('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currentView === 'list' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                List
              </button>
            </div>

            {/* Share placeholder */}
            <button className="px-4 py-2 rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed transition-colors">
              🔗 share
            </button>

            {/* Sign in to save placeholder */}
            <button className="px-4 py-2 rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed transition-colors">
              👤 save
            </button>
          </div>
        </div>
      </div>

      {/* ===== OVERLAY COMPONENTS ===== */}
      <React.Fragment>
        {/* Hamburger Menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}>
            <div className="absolute top-20 left-6 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                 onClick={(e) => e.stopPropagation()}>
              {/* Menu Header */}
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">Goal Breaker</h3>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Menu Items */}
              <div className="p-4 space-y-4">
                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">📊</span>
                    <span className="font-medium">Stats</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">
                      {goals.filter(g => g.completed).length} / {goals.length} completed
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: goals.length > 0 
                            ? `${(goals.filter(g => g.completed).length / goals.length) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* Export to Mermaid */}
                <button
                  onClick={handleExport}
                  disabled={goals.length === 0}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    goals.length === 0
                      ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                      : 'text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📤</span>
                    <span>Export to Mermaid</span>
                  </div>
                  <span className="text-sm">Copy</span>
                </button>
                
                {/* Import */}
                <button
                  onClick={handleImportClick}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📥</span>
                    <span>Import</span>
                  </div>
                  <span className="text-sm">Paste Code</span>
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-200 my-4"></div>
                
                {/* Reset */}
                <button
                  onClick={() => {
                    reset();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 p-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                  <span className="text-lg">🔄</span>
                  <span>Reset All Goals</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Import Mermaid Code</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Paste your Mermaid diagram code below. This will replace your current goals.
                </p>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 p-6 overflow-hidden flex flex-col">
                <div className="flex-1 flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mermaid Code:
                  </label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="flex-1 w-full p-3 border border-gray-300 rounded-lg resize-none font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Example:
graph TD
    A["Main Goal"]
    B["Sub Task 1"]
    C["✅ Completed Task"]
    A --> B
    A --> C`}
                  />
                </div>
                
                {/* Error/Success Message */}
                {importMessage && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-700">{importMessage}</p>
                  </div>
                )}
                
                {/* Validation Tips */}
                <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium mb-1">Format Requirements:</p>
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li>• Must start with "graph TD"</li>
                    <li>• Use format: A["Task Name"] or A["✅ Completed Task"]</li>
                    <li>• Connections: A --&gt; B</li>
                    <li>• Maximum 4 levels deep</li>
                  </ul>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={handleImportCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportConfirm}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Import Goals
                </button>
              </div>
            </div>
          </div>
        )}
      </React.Fragment>

      {/* ===== MAIN CONTENT AREA ===== */}
      {currentView === 'list' ? (
        renderListView()
      ) : (
        <div 
          className="relative w-full h-screen overflow-hidden"
          style={{ marginTop: '80px' }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        >
          {/* Canvas Content */}
          <div
            ref={canvasRef}
            className={`canvas-background relative select-none ${isPanning ? 'cursor-grabbing' : spacePressed ? 'cursor-grab' : 'cursor-default'}`}
            onMouseDown={handleCanvasMouseDown}
            onKeyDown={handleCanvasKeyDown}
            onKeyUp={handleCanvasKeyUp}
            tabIndex={0}
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: '0 0',
              backgroundColor: 'transparent',
              outline: 'none', // Remove focus outline border
              cursor: isPanning ? 'grabbing !important' : spacePressed ? 'grab !important' : 'default !important'
            }}
          >
            {/* Connection Lines */}
            <ConnectionLines connections={connections} canvasSize={canvasSize} />
            
            {/* Goals */}
            {goals.length === 0 ? (
              <div 
                className="absolute flex items-center justify-center w-96 h-32 bg-gradient-to-br from-yellow-100 to-orange-100 border-4 border-dashed border-yellow-400 rounded-2xl cursor-pointer hover:from-yellow-200 hover:to-orange-200 hover:border-yellow-500 transition-all shadow-lg"
                style={{
                  left: (canvasSize.width - 384) / 2,  // 384px = w-96 width  
                  top: (canvasSize.height - 128) / 2   // 128px = h-32 height
                }}
                onClick={() => addRootGoal()}
              >
                <div className="text-center">
                  <Target className="mx-auto mb-2 text-yellow-700" size={32} />
                  <h2 className="text-lg font-bold text-yellow-800">What's your main goal?</h2>
                  <p className="text-yellow-700 text-sm">Click to start breaking it down</p>
                </div>
              </div>
            ) : (
              getVisibleGoals().map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  currentDirection={currentDirection}
                  onUpdate={updateGoal}
                  onToggleComplete={toggleComplete}
                  onAddSubGoal={addSubGoal}
                  onAddSiblingGoal={addSiblingGoal}
                  onDelete={deleteGoal}
                  onStartEditing={startEditing}
                  onToggleFocus={toggleFocus}
                  isFocused={focusedGoal === goal.id}
                  isDragged={draggedGoal?.id === goal.id}
                  onDragStart={handleGoalDragStart}
                  isSelected={selectedGoal === goal.id}
                  onSelect={setSelectedGoal}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== FLOATING UI ELEMENTS ===== */}
      <React.Fragment>
        {/* Floating Helper Text - appears when editing goals, showing export messages, or navigation help */}
        {(goals.some(goal => goal.isEditing) || exportMessage || spacePressed || isPanning) && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white/95 backdrop-blur-sm border border-gray-300 shadow-lg rounded-lg px-4 py-2 text-sm text-gray-700 flex items-center gap-2">
              {goals.some(goal => goal.isEditing) ? (
                <>
                  <span className="text-lg">💡</span>
                  <span>Press <strong>Enter</strong> to save, <strong>Esc</strong> to cancel</span>
                </>
              ) : (spacePressed || isPanning) ? (
                <>
                  <span className="text-lg">🖱️</span>
                  <span>
                    Hold <strong>Spacebar</strong> or <strong>Middle mouse button</strong> + drag to pan
                  </span>
                </>
              ) : (
                <span>{exportMessage}</span>
              )}
            </div>
          </div>
        )}

        {/* Confetti Celebration */}
        <ConfettiCelebration 
          isVisible={celebration.isVisible}
          type={celebration.type}
          onComplete={handleCelebrationComplete}
        />
      </React.Fragment>

      {/* ===== FUTURE COMPONENTS SLOT ===== */}
      {/* Add new floating components (modals, tooltips, notifications) here */}
      
    </div>
  );
};

export default GoalBreaker;