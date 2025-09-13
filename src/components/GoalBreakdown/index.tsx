import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Check, X, Target, Edit3, Move, Eye, EyeOff, Focus, Menu } from 'lucide-react';
import { ConnectionLines } from '../ConnectionLines';
import { gridToPosition, getNextRowForLevel, GRID, calculateChildPosition, standardizeGoalPositions } from '../../utils/gridHelpers';
import { getLevelStyle, getLevelStats, getLevelLabel } from '../../utils/styleHelpers';
import { exportToMermaid, copyToClipboard, importFromMermaid } from '../../utils/mermaidHelpers';
import ConfettiCelebration from '../ConfettiCelebration';
import GoalCardMenu from '../GoalCardMenu';

// Types for celebration system
type CelebrationType = 'humble' | 'nice' | 'awesome' | 'epic';

const GoalBreaker = () => {
  const [goals, setGoals] = useState([]);
  const [mainGoal, setMainGoal] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [currentView, setCurrentView] = useState('canvas'); // 'canvas' or 'list'
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
            const fromX = parent.position.x; // Left edge of parent card
            const fromY = parent.position.y + GRID.CARD_HEIGHT / 2; // Middle height of parent
            const toX = goal.position.x + GRID.CARD_WIDTH; // Right edge of child card
            const toY = goal.position.y + GRID.CARD_HEIGHT / 2; // Middle height of child
            
            // Create straight horizontal line with slight curve
            const midX = fromX + (toX - fromX) / 2;
            const curveOffset = 20; // Small fixed curve for visual appeal
            
            newConnections.push({
              id: `${parent.id}-${goal.id}`,
              from: { x: fromX, y: fromY },
              to: { x: toX, y: toY },
              completed: parent.completed && goal.completed,
              path: `M ${fromX} ${fromY} Q ${midX} ${fromY - curveOffset} ${toX} ${toY}`,
              type: 'normal'
            });
          } else {
            // Child is hidden - create placeholder connection
            const fromX = parent.position.x;
            const fromY = parent.position.y + GRID.CARD_HEIGHT / 2;
            const toX = fromX + 120; // Shorter line to placeholder
            const toY = fromY;
            
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
  }, [goals, hiddenLevels, focusedGoal, GRID.CARD_WIDTH, GRID.CARD_HEIGHT]);

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

  const addSubGoal = (parentId) => {
    const parent = goals.find(g => g.id === parentId);
    if (!parent) return;

    // Get existing siblings to calculate balanced position
    const existingSiblings = goals.filter(g => g.parentId === parentId);
    
    const newId = Math.max(0, ...goals.map(g => g.id), 0) + 1;
    const newLevel = parent.level + 1;
    
    // Use new positioning logic that distributes children around parent
    const newPosition = calculateChildPosition(parent, existingSiblings, canvasSize.width, canvasSize.height);

    const newGoal = {
      id: newId,
      text: '',
      completed: false,
      level: newLevel,
      gridRow: existingSiblings.length, // Keep for compatibility
      parentId: parentId,
      position: newPosition,
      isEditing: true,
      children: []
    };

    setGoals(prev => [...prev, newGoal]);
  };

  const addSiblingGoal = (goalId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    // Get existing siblings at same level with same parent
    const existingSiblings = goals.filter(g => 
      g.parentId === goal.parentId && 
      g.level === goal.level && 
      g.id !== goalId
    );
    
    const newId = Math.max(0, ...goals.map(g => g.id), 0) + 1;
    
    // Find the lowest Y position among siblings to place new sibling below
    const allSameLevelGoals = [...existingSiblings, goal];
    const maxY = Math.max(...allSameLevelGoals.map(g => g.position.y));
    
    // Position new sibling below the lowest sibling with proper spacing
    const newPosition = {
      x: goal.position.x, // Same X as siblings
      y: maxY + GRID.CARD_HEIGHT + GRID.VERTICAL_GAP
    };

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
      const updatedGoals = [...prev, newGoal];
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
          x: canvasSize.width - GRID.MARGIN - GRID.CARD_WIDTH, // Right side positioning
          y: (canvasSize.height - GRID.CARD_HEIGHT) / 2 
        }
      : gridToPosition(0, newRow, canvasSize.width));

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

  // GoalCard component
  const GoalCard = ({ goal, onUpdate, onToggleComplete, onAddSubGoal, onAddSiblingGoal, onDelete, onStartEditing, onToggleFocus, isFocused, isDragged, onDragStart, isSelected, onSelect }) => {
    const levelStyle = getLevelStyle(goal.level, goal.completed);
    
    // Get the appropriate color for selection based on level
    const selectionColors = [
      { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600' }, // Level 0
      { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },     // Level 1
      { bg: 'bg-purple-500', hover: 'hover:bg-purple-600' },  // Level 2
      { bg: 'bg-green-500', hover: 'hover:bg-green-600' },    // Level 3
      { bg: 'bg-orange-500', hover: 'hover:bg-orange-600' },  // Level 4
      { bg: 'bg-pink-500', hover: 'hover:bg-pink-600' },     // Level 5
      { bg: 'bg-red-500', hover: 'hover:bg-red-600' },       // Level 6
      { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700' }   // Level 7+
    ];
    const selectionColor = selectionColors[Math.min(goal.level, selectionColors.length - 1)];
    
    const handleMouseDown = (e) => {
      // Only start dragging if not clicking on interactive elements or their children
      const target = e.target;
      const isButton = target.tagName === 'BUTTON' || target.closest('button');
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isSvg = target.tagName === 'svg' || target.tagName === 'SVG';
      
      if (isButton || isInput || isSvg) {
        return; // Don't start drag on interactive elements
      }
      
      // Don't start drag if goal is in editing mode
      if (goal.isEditing) {
        return;
      }
      
      // Store initial mouse position to detect if this is a click vs drag
      const startX = e.clientX;
      const startY = e.clientY;
      
      const handleMouseMove = (moveEvent) => {
        const deltaX = Math.abs(moveEvent.clientX - startX);
        const deltaY = Math.abs(moveEvent.clientY - startY);
        
        // If mouse moved more than 5 pixels, start dragging
        if (deltaX > 5 || deltaY > 5) {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          onDragStart(goal, e);
        }
      };
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // This was a click, not a drag - select the card
        onSelect(goal.id);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    

    
    return (
      <div
        className={`absolute rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl cursor-move ${
          goal.completed ? 'bg-green-100' : levelStyle.bg
        } ${
          isDragged ? 'scale-105 rotate-2 z-50' : ''
        } ${isFocused ? 'ring-4 ring-blue-300' : ''} ${
          isSelected 
            ? `border-2 ${selectionColor.bg.replace('bg-', 'border-')}` 
            : 'border border-gray-200'
        }`}
        style={{
          left: goal.position.x,
          top: goal.position.y,
          width: GRID.CARD_WIDTH,
          height: GRID.CARD_HEIGHT,
          zIndex: isDragged ? 50 : isSelected ? 40 : isFocused ? 30 : 10,
          userSelect: 'none'
        }}

        onMouseDown={handleMouseDown}
      >
        {/* Hierarchy level indicator bar at top - always visible */}
        <div 
          className={`absolute top-0 left-0 right-0 h-2 ${selectionColor.bg} rounded-t-xl`}
        />
        

        
        {/* Navigation buttons on hover only */}
        {isSelected && (
          <>
            {/* Add Child Button (Left side) - Next Level */}
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 z-50">
              <button
                className={`w-6 h-6 ${selectionColor.bg} ${selectionColor.hover} text-white rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl group relative`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubGoal(goal.id);
                }}
                title="Add child goal (next level)"
              >
                <Plus size={12} strokeWidth={2.5} />
                {/* Tooltip below */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Add Child
                  <div className="text-[10px] text-gray-300">Next level</div>
                </div>
              </button>
            </div>
            
            {/* Add Sibling Button (Bottom) - Same Level - Only for non-ultimate goals */}
            {goal.level > 0 && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-50">
                <button
                  className={`w-6 h-6 ${selectionColor.bg} ${selectionColor.hover} text-white rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl group relative`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddSiblingGoal(goal.id);
                  }}
                  title="Add sibling goal (same level)"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  {/* Tooltip below */}
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Add Sibling
                    <div className="text-[10px] text-gray-300">Same level</div>
                  </div>
                </button>
              </div>
            )}
          </>
        )}
        
        <div className="pt-2 px-4 pb-4 h-full flex flex-col relative">
          {/* Three-dots menu aligned with text line */}
          <div className="absolute top-4 right-2 z-10">
            <GoalCardMenu
              onComplete={() => onToggleComplete(goal.id)}
              onRemove={() => goal.level > 0 && onDelete(goal.id)}
              onFocus={() => onToggleFocus(goal.id)}
              isCompleted={goal.completed}
              isFocused={isFocused}
            />
          </div>
          
          {/* Text content area */}
          <div className="flex-1 flex items-center justify-center pr-8">
            {goal.isEditing ? (
              <div className="relative flex-1 h-full flex items-center">
                <textarea
                  defaultValue={goal.text}
                  className="w-full h-full p-2 border-0 bg-transparent resize-none focus:outline-none text-xl font-bold text-gray-800"
                  placeholder={goal.level === 0 ? "What's your main goal?" : "Describe this task..."}
                  autoFocus
                  ref={(textarea) => {
                    if (textarea) {
                      textarea.focus();
                      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      if (e.target.value.trim()) {
                        onUpdate(goal.id, e.target.value);
                        e.preventDefault();
                      }
                    }
                    if (e.key === 'Escape') {
                      if (goal.level > 0 && !goal.text) {
                        onDelete(goal.id);
                      } else {
                        onUpdate(goal.id, goal.text || '');
                      }
                      e.preventDefault();
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value) {
                      onUpdate(goal.id, value);
                    } else if (goal.level > 0) {
                      onDelete(goal.id);
                    } else {
                      // For main goals, keep empty but exit edit mode
                      onUpdate(goal.id, '');
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent drag when editing
                />

              </div>
            ) : (
              <p 
                className={`flex-1 text-xl cursor-text p-2 rounded-lg transition-colors font-bold text-center ${
                  goal.completed ? 'line-through text-green-700' : 'hover:bg-gray-200 text-gray-800'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Select card first, then start editing
                  onSelect(goal.id);
                  onStartEditing(goal.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {goal.text || (goal.level === 0 ? "Click to define your main goal..." : "Click to add task...")}
              </p>
            )}
          </div>
        </div>
      </div>
    );
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
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Target className="text-yellow-600" size={24} />
              <h1 className="text-xl font-bold text-gray-800">Goal Breaker</h1>
              {focusedGoal && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Focus Mode Active
                </div>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-lg border border-gray-200">
              <button
                onClick={() => {
                  // When switching to canvas view, standardize all goal positions
                  if (currentView !== 'canvas' && goals.length > 0) {
                    const standardizedGoals = standardizeGoalPositions(goals, canvasSize.width, canvasSize.height);
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

            {/* Level Navigation */}
            {existingLevels.length > 1 && (
              <div className="flex items-center gap-2 bg-white rounded-xl p-2 shadow-lg border border-gray-200">
                {existingLevels.map(level => {
                  const stats = getLevelStats(level, goals);
                  const isHidden = hiddenLevels.has(level);
                  const levelStyle = getLevelStyle(level, false);
                  
                  return (
                    <button
                      key={level}
                      onClick={() => toggleLevelVisibility(level)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm ${
                        isHidden 
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' 
                          : `${levelStyle.bg} ${levelStyle.color} ${levelStyle.border} ${levelStyle.borderWidth}`
                      }`}
                    >
                      {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span className="font-medium">{getLevelLabel(level)}</span>
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                        {stats.completed}/{stats.total}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              <span>Menu</span>
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Hamburger Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute top-20 right-6 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
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

      {/* Main Content - Canvas or List View */}
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
    </div>
  );
};

export default GoalBreaker;