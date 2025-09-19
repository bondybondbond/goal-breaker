import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X, Target, Edit3, Move, Eye, EyeOff, Focus, Menu } from 'lucide-react';
import { ConnectionLines } from '../ConnectionLines';
import { gridToPosition, getNextRowForLevel, GRID, calculateChildPosition, standardizeGoalPositions, calculateCascadingSlots } from '../../utils/gridHelpers';
import { getLevelStyle, getLevelStats, getLevelLabel } from '../../utils/styleHelpers';
import ConfettiCelebration from '../ConfettiCelebration';
import GoalCardMenu from '../GoalCardMenu';
import GoalCard from '../GoalCard';
import ImportExport from '../ImportExport';
import ListView from '../ListView';
import AppNavigation from '../AppNavigation';

// Types for celebration system
type CelebrationType = 'humble' | 'nice' | 'awesome' | 'epic';

const GoalBreaker = () => {
  const [goals, setGoals] = useState([]);
  const [mainGoal, setMainGoal] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [currentView, setCurrentView] = useState('canvas'); // 'canvas' or 'list'
  const [currentDirection, setCurrentDirection] = useState('right-left'); // 'right-left', 'left-right', 'up-down'
  const [connectorStyle, setConnectorStyle] = useState('straight'); // 'curved' or 'straight'
  const [cardSorting, setCardSorting] = useState('priority'); // 'off' or 'priority'
  const [draggedGoal, setDraggedGoal] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPreviewPosition, setDragPreviewPosition] = useState(null); // For smooth dragging without state updates
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
              fromY = parent.position.y + GRID.CARD_HEIGHT + 5;    // Slightly below parent
              toX = goal.position.x + GRID.CARD_WIDTH / 2;     // Center of child card
              toY = goal.position.y - 5;                           // Slightly above child (for arrow integration)
              
              // Create PowerPoint-style cubic bezier curves (TOP-DOWN)
              const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
              const curveIntensity = Math.min(60, distance * 0.3);
              // TOP-DOWN: Curve outward horizontally
              const control1X = fromX;
              const control1Y = fromY + curveIntensity;
              const control2X = toX;
              const control2Y = toY - curveIntensity;
              path = `M ${fromX} ${fromY} C ${control1X} ${control1Y} ${control2X} ${control2Y} ${toX} ${toY}`;
            } else {
              // Horizontal layouts (left-right and right-left)
              fromX = currentDirection === 'left-right' 
                ? parent.position.x + GRID.CARD_WIDTH + 5  // Slightly right of parent
                : parent.position.x - 5;                   // Slightly left of parent card
              fromY = parent.position.y + GRID.CARD_HEIGHT / 2; // Middle height of parent
              toX = currentDirection === 'left-right'
                ? goal.position.x - 5                      // Slightly left of child (for arrow integration)
                : goal.position.x + GRID.CARD_WIDTH + 5;   // Slightly right of child card
              toY = goal.position.y + GRID.CARD_HEIGHT / 2; // Middle height of child
              
              // Create PowerPoint-style cubic bezier curves (HORIZONTAL)
              const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
              const curveIntensity = Math.min(60, distance * 0.3);
              // HORIZONTAL: Curve outward vertically
              const control1X = fromX + (currentDirection === 'left-right' ? curveIntensity : -curveIntensity);
              const control1Y = fromY;
              const control2X = toX + (currentDirection === 'left-right' ? -curveIntensity : curveIntensity);
              const control2Y = toY;
              path = `M ${fromX} ${fromY} C ${control1X} ${control1Y} ${control2X} ${control2Y} ${toX} ${toY}`;
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

  // Re-position all goals when direction or sorting changes
  useEffect(() => {
    if (goals.length > 0) {
      const sortedGoals = getSortedGoals(goals);
      const standardizedGoals = calculateCascadingSlots(sortedGoals, canvasSize.width, canvasSize.height, currentDirection);
      setGoals(standardizedGoals);
      
      // Force connections to update after a short delay to ensure goal positions are applied
      setTimeout(() => {
        setGoals(current => [...current]); // Trigger re-render to update connections
      }, 10);
    }
  }, [currentDirection, canvasSize.width, canvasSize.height, cardSorting]);



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

  // Import/Export callbacks for the ImportExport component
  const handleGoalsImported = (importedGoals: any[]) => {
    setGoals(importedGoals);
    setIsMenuOpen(false);
    setCanvasOffset({ x: 0, y: 0 }); // Reset canvas position
  };

  const handleExportMessage = (message: string) => {
    setExportMessage(message);
    // Clear message after 2 seconds
    setTimeout(() => setExportMessage(''), 2000);
  };

  // Handle view changes from navigation
  const handleViewChange = (view: string) => {
    // When switching to canvas view, standardize all goal positions
    if (view === 'canvas' && currentView !== 'canvas' && goals.length > 0) {
      const sortedGoals = getSortedGoals(goals);
      const standardizedGoals = standardizeGoalPositions(sortedGoals, canvasSize.width, canvasSize.height, currentDirection);
      setGoals(standardizedGoals);
      
      // Force connections to update after switching to canvas
      setTimeout(() => {
        setGoals(current => [...current]); // Trigger re-render for connections
      }, 10);
    }
    setCurrentView(view);
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
      priority: 'medium',
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
      priority: 'medium',
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

  const setPriority = (goalId, priority) => {
    const updatedGoals = goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, priority: priority }
        : goal
    );
    
    // If sorting is enabled, immediately reposition goals
    if (cardSorting === 'priority') {
      const sortedGoals = getSortedGoals(updatedGoals);
      const standardizedGoals = standardizeGoalPositions(sortedGoals, canvasSize.width, canvasSize.height, currentDirection);
      setGoals(standardizedGoals);
    } else {
      setGoals(updatedGoals);
    }
  };

  // Sort goals by priority within their level/parent groups
  const getSortedGoals = (goalsToSort) => {
    if (cardSorting === 'off') {
      return goalsToSort;
    }

    // Priority order: high > medium > low
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    
    return [...goalsToSort].sort((a, b) => {
      // First, maintain hierarchy - parent level should come before children
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      
      // Within same level, sort by priority if they have the same parent
      if (a.parentId === b.parentId) {
        const aPriority = priorityOrder[a.priority || 'medium'];
        const bPriority = priorityOrder[b.priority || 'medium'];
        return aPriority - bPriority;
      }
      
      // Keep original order for different parents at same level
      return 0;
    });
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
    
    // Position ultimate goal based on current direction (top center, left center, or right center)
    const newPosition = position || (goals.length === 0 
      ? (() => {
          if (currentDirection === 'up-down') {
            return {
              x: (canvasSize.width - GRID.CARD_WIDTH) / 2, // Top center
              y: GRID.MARGIN
            };
          } else if (currentDirection === 'left-right') {
            return {
              x: GRID.MARGIN, // Left side
              y: (canvasSize.height - GRID.CARD_HEIGHT) / 2
            };
          } else {
            return {
              x: canvasSize.width - GRID.MARGIN - GRID.CARD_WIDTH, // Right side
              y: (canvasSize.height - GRID.CARD_HEIGHT) / 2
            };
          }
        })()
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
      priority: 'medium',
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
    
    // Handle goal dragging - using preview position for smooth performance
    if (draggedGoal) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - canvasRect.left - canvasOffset.x - dragOffset.x;
      const mouseY = e.clientY - canvasRect.top - canvasOffset.y - dragOffset.y;

      // Update preview position immediately (no state update, no re-render)
      setDragPreviewPosition({ x: mouseX, y: mouseY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    
    // Apply final drag position when drag ends
    if (draggedGoal && dragPreviewPosition) {
      setGoals(goals.map(goal => 
        goal.id === draggedGoal.id 
          ? { ...goal, position: dragPreviewPosition }
          : goal
      ));
    }
    
    // Clean up drag state
    setDraggedGoal(null);
    setDragPreviewPosition(null);
  };

  const handleCanvasKeyDown = (e) => {
    // Don't process shortcuts if user is editing text
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
      return;
    }

    if (e.code === 'Space') {
      setSpacePressed(true);
      e.preventDefault();
    }
    
    // Keyboard shortcuts when a card is selected
    if (selectedGoal) {
      const selectedGoalData = goals.find(g => g.id === selectedGoal);
      const isUltimateGoal = selectedGoalData?.level === 0;
      
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        // ENTER: Add sibling (both main keyboard and numpad)
        // Only allow siblings for non-ultimate goals
        if (!isUltimateGoal) {
          const siblingDirection = currentDirection === 'up-down' ? 'right' : 'below';
          addSiblingGoal(selectedGoal, siblingDirection);
        }
        e.preventDefault();
      } else if (e.code === 'Tab') {
        // TAB: Add child
        addSubGoal(selectedGoal);
        e.preventDefault();
      }
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


  // Component logic - should be inside the main component function
  if (!isStarted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
      {/* ===== NAVIGATION ===== */}
      <AppNavigation
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentDirection={currentDirection}
        setCurrentDirection={setCurrentDirection}
        connectorStyle={connectorStyle}
        setConnectorStyle={setConnectorStyle}
        cardSorting={cardSorting}
        setCardSorting={setCardSorting}
        focusedGoal={focusedGoal}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        goals={goals}
        onReset={reset}
        onGoalsImported={handleGoalsImported}
        onExportMessage={handleExportMessage}
        onViewChange={handleViewChange}
      />

      {/* ===== MAIN CONTENT AREA ===== */}
      {currentView === 'list' ? (
        <ListView
          goals={goals}
          toggleComplete={toggleComplete}
          updateGoal={updateGoal}
          startEditing={startEditing}
          deleteGoal={deleteGoal}
          addSubGoal={addSubGoal}
          setGoals={setGoals}
          canvasSize={canvasSize}
        />
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
            <ConnectionLines connections={connections} canvasSize={canvasSize} connectorStyle={connectorStyle} direction={currentDirection} />
            
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
              getSortedGoals(getVisibleGoals()).map(goal => {
                // Calculate transform for smooth dragging
                const isDraggedCard = draggedGoal?.id === goal.id;
                const dragTransform = (isDraggedCard && dragPreviewPosition) 
                  ? `translate(${dragPreviewPosition.x - goal.position.x}px, ${dragPreviewPosition.y - goal.position.y}px)`
                  : '';
                
                return (
                  <div
                    key={`wrapper-${goal.id}`}
                    style={{
                      transform: dragTransform,
                      transition: isDraggedCard ? 'none' : 'transform 0.2s ease',
                    }}
                  >
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
                      onSetPriority={setPriority}
                      isFocused={focusedGoal === goal.id}
                      isDragged={isDraggedCard}
                      onDragStart={handleGoalDragStart}
                      isSelected={selectedGoal === goal.id}
                      onSelect={setSelectedGoal}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===== FLOATING UI ELEMENTS ===== */}
      <React.Fragment>
        {/* Floating Helper Text - appears when editing goals, showing export messages, navigation help, or keyboard shortcuts */}
        {(goals.some(goal => goal.isEditing) || exportMessage || spacePressed || isPanning || selectedGoal) && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white/95 backdrop-blur-sm border border-gray-300 shadow-lg rounded-lg px-4 py-2 text-sm text-gray-700 flex items-center gap-2">
              {goals.some(goal => goal.isEditing) ? (
                <>
                  <span className="text-lg">⌨️</span>
                  <span>Press <kbd className="kbd">Enter</kbd> to save, <kbd className="kbd">Esc</kbd> to cancel</span>
                </>
              ) : (spacePressed || isPanning) ? (
                <>
                  <span>
                    ⌨️ Hold <kbd className="kbd">Spacebar</kbd> or 🖱️ <kbd className="kbd">Middle mouse button</kbd> + drag to pan
                  </span>
                </>
              ) : selectedGoal ? (
                <>
                  <span className="text-lg">⌨️</span>
                  <span>
                    {(() => {
                      const selectedGoalData = goals.find(g => g.id === selectedGoal);
                      const isUltimateGoal = selectedGoalData?.level === 0;
                      
                      if (isUltimateGoal) {
                        return <><kbd className="kbd">Tab</kbd> = new child</>;
                      } else {
                        return <><kbd className="kbd">Enter</kbd> = new sibling, <kbd className="kbd">Tab</kbd> = new child</>;
                      }
                    })()}
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