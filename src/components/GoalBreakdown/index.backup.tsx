import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Check, X, Target, Edit3, Move, Eye, EyeOff, Focus } from 'lucide-react';
import { ConnectionLines } from '../ConnectionLines';
import { gridToPosition, getNextRowForLevel, GRID } from '../../utils/gridHelpers';
import { getLevelStyle, getLevelStats, getLevelLabel } from '../../utils/styleHelpers';

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
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 2000, height: 1200 });



  // Initialize with empty state - user defines problem directly on canvas
  useEffect(() => {
    if (!isStarted) {
      setIsStarted(true);
      // Center the canvas so main goal area is immediately visible
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight - 80; // Account for header
      const centerX = viewportWidth / 2 - GRID.CARD_WIDTH / 2;
      const centerY = viewportHeight / 2 - GRID.CARD_HEIGHT / 2;
      
      setCanvasOffset({ 
        x: centerX - (canvasSize.width - GRID.MARGIN - GRID.CARD_WIDTH),
        y: centerY - (GRID.MARGIN + GRID.CARD_HEIGHT / 2)
      });
    }
  }, []);



  // Add sub-goal with grid positioning
  const addSubGoal = (parentId) => {
    const parent = goals.find(g => g.id === parentId);
    if (!parent) return;

    const newId = Math.max(0, ...goals.map(g => g.id)) + 1;
    const newLevel = parent.level + 1;
    const newRow = getNextRowForLevel(newLevel, goals);
    const newPosition = gridToPosition(newLevel, newRow, canvasSize.width);

    const newGoal = {
      id: newId,
      text: '',
      completed: false,
      level: newLevel,
      gridRow: newRow,
      parentId: parentId,
      position: newPosition,
      isEditing: true,
      children: []
    };

    setGoals(prev => [...prev, newGoal]);
  };

  const updateGoal = (id, text) => {
    setGoals(goals.map(goal => 
      goal.id === id 
        ? { ...goal, text, isEditing: false }
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

  const existingLevels = [...new Set(goals.map(g => g.level))].sort((a, b) => a - b);

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
    const newPosition = position || gridToPosition(0, newRow, canvasSize.width);

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

  // Handle double-click on canvas to add new root goal
  const handleCanvasDoubleClick = (e) => {
    // Only add goal if clicking on canvas background, not on existing goals
    if (e.target === canvasRef.current || e.target.closest('.canvas-background')) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Calculate position where user double-clicked
      const mouseX = e.clientX - canvasRect.left - canvasOffset.x;
      const mouseY = e.clientY - canvasRect.top - canvasOffset.y;
      
      // Snap to a reasonable position near the click
      const snapX = Math.max(GRID.MARGIN, mouseX - GRID.CARD_WIDTH / 2);
      const snapY = Math.max(GRID.MARGIN, mouseY - GRID.CARD_HEIGHT / 2);
      
      addRootGoal({ x: snapX, y: snapY });
    }
  };
    // Only start panning if clicking on canvas background, not on a goal
    if (e.target === canvasRef.current || e.target.closest('.canvas-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
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
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggedGoal(null);
  };

  const handleCanvasKeyDown = (e) => {
    if (e.code === 'Space') {
      setSpacePressed(true);
      e.preventDefault();
    }
  };

  const handleCanvasKeyUp = (e) => {
    if (e.code === 'Space') {
      setSpacePressed(false);
      e.preventDefault();
    }
  };

  const handleGoalDragStart = (goal, e) => {
    // Prevent canvas panning when starting to drag a goal
    e.stopPropagation();
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Calculate the offset from the mouse to the goal's top-left corner
    // Account for canvas offset in the calculation
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    setDraggedGoal(goal);
    setDragOffset({
      x: mouseX - (goal.position.x + canvasOffset.x),
      y: mouseY - (goal.position.y + canvasOffset.y)
    });
    
    // Prevent text selection during drag
    e.preventDefault();
  };

  // Global mouse event handlers for drag and drop
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (draggedGoal && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        
        // Calculate mouse position relative to canvas
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        // Calculate new goal position accounting for canvas offset and drag offset
        const newX = mouseX - canvasOffset.x - dragOffset.x;
        const newY = mouseY - canvasOffset.y - dragOffset.y;
        
        setGoals(prev => prev.map(goal => 
          goal.id === draggedGoal.id 
            ? { ...goal, position: { x: newX, y: newY } }
            : goal
        ));
      }
    };

    const handleGlobalMouseUp = () => {
      setDraggedGoal(null);
      setIsPanning(false);
    };

    if (draggedGoal || isPanning) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [draggedGoal, isPanning, canvasOffset, dragOffset]);
  useEffect(() => {
    const newConnections = [];
    goals.forEach(goal => {
      if (goal.parentId !== null) {
        const parent = goals.find(g => g.id === goal.parentId);
        if (parent) {
          const fromX = parent.position.x + GRID.CARD_WIDTH / 2;
          const fromY = parent.position.y + GRID.CARD_HEIGHT;
          const toX = goal.position.x + GRID.CARD_WIDTH / 2;
          const toY = goal.position.y;
          
          // Create curved connection line
          const midX = fromX + (toX - fromX) / 2;
          const midY = fromY + (toY - fromY) / 2;
          const curveOffset = Math.abs(toX - fromX) * 0.3;
          
          newConnections.push({
            id: `${parent.id}-${goal.id}`,
            from: { x: fromX, y: fromY },
            to: { x: toX, y: toY },
            completed: parent.completed && goal.completed,
            path: `M ${fromX} ${fromY} Q ${midX} ${midY - curveOffset} ${toX} ${toY}`
          });
        }
      }
    });
    setConnections(newConnections);
  }, [goals, GRID.CARD_WIDTH, GRID.CARD_HEIGHT]);

  // GoalCard component
  const GoalCard = ({ goal, onUpdate, onToggleComplete, onAddSubGoal, onDelete, onStartEditing, onToggleFocus, isFocused, isDragged, onDragStart }) => {
    const levelStyle = getLevelStyle(goal.level, goal.completed);
    
    const handleMouseDown = (e) => {
      // Only start dragging if not clicking on interactive elements
      const target = e.target;
      if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Don't start drag if goal is in editing mode
      if (goal.isEditing) {
        return;
      }
      
      onDragStart(goal, e);
    };
    
    return (
      <div
        className={`absolute bg-white rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl cursor-move ${levelStyle.border} ${levelStyle.borderWidth} ${levelStyle.bg} ${
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
                onClick={() => onToggleComplete(goal.id)}
                className={`p-1.5 rounded-full transition-all ${
                  goal.completed 
                    ? 'bg-green-500 text-white scale-110' 
                    : 'bg-gray-100 border-2 border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
              >
                <Check size={12} />
              </button>
              
              <div className={`text-xs font-medium px-2 py-1 rounded-full ${levelStyle.color} bg-opacity-20`}>
                L{goal.level}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggleFocus(goal.id)}
                className={`p-1.5 rounded-full transition-all ${
                  isFocused 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-400 hover:bg-gray-100 hover:text-blue-500'
                }`}
              >
                <Focus size={12} />
              </button>
              
              <button
                onClick={() => onAddSubGoal(goal.id)}
                className="p-1.5 rounded-full text-purple-500 hover:bg-purple-100 transition-all"
              >
                <Plus size={12} />
              </button>
              
              {goal.level > 0 && (
                <button
                  onClick={() => onDelete(goal.id)}
                  className="p-1.5 rounded-full text-red-500 hover:bg-red-100 transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="flex-1 flex items-center">
            {goal.isEditing ? (
              <textarea
                defaultValue={goal.text}
                className="w-full h-16 p-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={goal.level === 0 ? "What's your main goal?" : "Describe this task..."}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && e.target.value.trim()) {
                    onUpdate(goal.id, e.target.value);
                    e.preventDefault();
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    onUpdate(goal.id, e.target.value);
                  } else if (goal.level > 0) {
                    onDelete(goal.id);
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()} // Prevent drag when editing
              />
            ) : (
              <p 
                className={`w-full text-sm cursor-text p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                  goal.completed ? 'line-through text-gray-500' : levelStyle.color
                } ${goal.level === 0 ? 'font-bold' : 'font-medium'}`}
                onClick={() => onStartEditing(goal.id)}
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
              <input
                type="text"
                defaultValue={goal.text}
                className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={goal.level === 0 ? "What's your main goal?" : "Enter task..."}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    updateGoal(goal.id, e.target.value);
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    updateGoal(goal.id, e.target.value);
                  } else if (goal.level > 0) {
                    deleteGoal(goal.id);
                  }
                }}
              />
            ) : (
              <p 
                className={`flex-1 cursor-pointer p-2 rounded hover:bg-gray-50 ${
                  goal.completed ? 'line-through text-gray-500' : levelStyle.color
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
                  position: gridToPosition(0, 0, canvasSize.width),
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

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {goals.filter(g => g.completed).length} / {goals.length} completed
            </div>
            <button
              onClick={reset}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

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
            onDoubleClick={handleCanvasDoubleClick}
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
                  left: canvasSize.width - GRID.MARGIN - GRID.CARD_WIDTH - 48,
                  top: GRID.MARGIN + 50
                }}
                onClick={() => addRootGoal()}
                }}
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
            
            {/* Floating Add Button - only show if there are existing goals */}
            {goals.length > 0 && (
              <div 
                className="fixed bottom-8 right-8 z-50"
              >
                <button
                  onClick={() => addRootGoal()}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  title="Add new goal (or double-click on canvas)"
                >
                  <Plus size={24} />
                </button>
              </div>
            )}
            
            {/* Instructions text when there are existing goals */}
            {goals.length > 0 && (
              <div className="fixed bottom-8 left-8 z-40 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-gray-200">
                <p className="text-sm text-gray-600">
                  💡 <strong>Tip:</strong> Double-click anywhere on the canvas to add a new goal
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalBreaker;
