import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Check, X, Target, Edit3, Move, Eye, EyeOff, Focus, Menu } from 'lucide-react';
import { ConnectionLines } from '../ConnectionLines';
import { gridToPosition, getNextRowForLevel, GRID, calculateChildPosition } from '../../utils/gridHelpers';
import { getLevelStyle, getLevelStats, getLevelLabel } from '../../utils/styleHelpers';
import { exportToMermaid, copyToClipboard } from '../../utils/mermaidHelpers';

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
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
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
    setGoals(goals.map(goal => 
      goal.id === id 
        ? { ...goal, completed: !goal.completed }
        : goal
    ));
  };

  const deleteGoal = (id) => {
    setGoals(goals.filter(goal => goal.id !== id && goal.parentId !== id));
  };

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
    // Only start panning if clicking on canvas background, not on a goal
    if (e.target === canvasRef.current || e.target.closest('.canvas-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
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
  const GoalCard = ({ goal, onUpdate, onToggleComplete, onAddSubGoal, onDelete, onStartEditing, onToggleFocus, isFocused, isDragged, onDragStart }) => {
    const levelStyle = getLevelStyle(goal.level, goal.completed);
    
    const handleMouseDown = (e) => {
      // Only start dragging if not clicking on interactive elements or their children
      const target = e.target;
      const isButton = target.tagName === 'BUTTON' || target.closest('button');
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isSvg = target.tagName === 'svg' || target.tagName === 'SVG';
      const isText = target.tagName === 'P' || target.closest('p'); // Add text paragraph check
      
      if (isButton || isInput || isSvg || isText) {
        return; // Don't start drag on interactive elements or text
      }
      
      // Don't start drag if goal is in editing mode
      if (goal.isEditing) {
        return;
      }
      
      onDragStart(goal, e);
    };
    
    return (
      <div
        className={`absolute rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl cursor-move ${levelStyle.border} ${levelStyle.borderWidth} ${
          goal.completed ? 'bg-green-100' : levelStyle.bg
        } ${
          isDragged ? 'scale-105 rotate-2 z-50' : ''
        } ${isFocused ? 'ring-4 ring-blue-300' : ''}`}
        style={{
          left: goal.position.x,
          top: goal.position.y,
          width: GRID.CARD_WIDTH,
          height: GRID.CARD_HEIGHT,
          zIndex: isDragged ? 50 : isFocused ? 30 : 10,
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Card Header */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleComplete(goal.id);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  goal.completed 
                    ? 'bg-green-500 text-white scale-110' 
                    : 'bg-gray-100 border-2 border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
              >
                <Check size={12} />
              </button>
              

            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFocus(goal.id);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  isFocused 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-400 hover:bg-gray-100 hover:text-blue-500'
                }`}
              >
                <Focus size={12} />
              </button>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Add subgoal clicked for goal:', goal.id);
                  onAddSubGoal(goal.id);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-1.5 rounded-full text-purple-500 hover:bg-purple-100 transition-all cursor-pointer"
              >
                <Plus size={12} />
              </button>
              
              {goal.level > 0 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Delete goal clicked for goal:', goal.id);
                    onDelete(goal.id);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-1.5 rounded-full text-red-500 hover:bg-red-100 transition-all cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="flex-1 flex items-center">
            {goal.isEditing ? (
              <div className="relative w-full h-full">
                <textarea
                  defaultValue={goal.text}
                  className="w-full h-full p-2 border border-blue-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                  placeholder={goal.level === 0 ? "What's your main goal?" : "Describe this task..."}
                  autoFocus
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
                className={`w-full text-sm cursor-text p-2 rounded-lg transition-colors ${
                  goal.completed ? 'line-through text-green-700' : `hover:bg-gray-200 ${levelStyle.color}`
                } ${goal.level === 0 ? 'font-bold' : 'font-medium'}`}
                onClick={(e) => {
                  e.stopPropagation();
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
                onClick={() => setCurrentView('canvas')}
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
              

              
              {/* Import (placeholder for future) */}
              <button className="w-full flex items-center justify-between p-3 rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📥</span>
                  <span>Import</span>
                </div>
                <span className="text-sm">Coming Soon</span>
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
            className={`canvas-background relative select-none ${spacePressed || isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: '0 0',
              backgroundColor: 'transparent'
            }}
            onMouseDown={handleCanvasMouseDown}

            onKeyDown={handleCanvasKeyDown}
            onKeyUp={handleCanvasKeyUp}
            tabIndex={0}
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
                  onDelete={deleteGoal}
                  onStartEditing={startEditing}
                  onToggleFocus={toggleFocus}
                  isFocused={focusedGoal === goal.id}
                  isDragged={draggedGoal?.id === goal.id}
                  onDragStart={handleGoalDragStart}
                />
              ))
            )}
            


          </div>
        </div>
      )}

      {/* Floating Helper Text - appears when editing goals OR showing export messages */}
      {(goals.some(goal => goal.isEditing) || exportMessage) && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-300 shadow-lg rounded-lg px-4 py-2 text-sm text-gray-700 flex items-center gap-2">
            {goals.some(goal => goal.isEditing) ? (
              <>
                <span className="text-lg">💡</span>
                <span>Press <strong>Enter</strong> to save, <strong>Esc</strong> to cancel</span>
              </>
            ) : (
              <span>{exportMessage}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalBreaker;