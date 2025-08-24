import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Check, X, Target, Edit3, Move, Eye, EyeOff, Focus } from 'lucide-react';

const FluidGoalBreakdown = () => {
  const [goals, setGoals] = useState([]);
  const [mainGoal, setMainGoal] = useState('');
  const [isStarted, setIsStarted] = useState(false);
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

  // Grid system constants
  const GRID = {
    COLUMN_WIDTH: 400,
    ROW_HEIGHT: 140,
    CARD_WIDTH: 320,
    CARD_HEIGHT: 120,
    MARGIN: 40
  };

  // Level styling system - borders only, intensity increases with level
  const getLevelStyle = (level, completed) => {
    const levelStyles = [
      { border: 'border-yellow-400', borderWidth: 'border-4', color: 'text-yellow-600' }, // Ultimate goal
      { border: 'border-blue-300', borderWidth: 'border-2', color: 'text-blue-500' },
      { border: 'border-purple-400', borderWidth: 'border-[3px]', color: 'text-purple-600' },
      { border: 'border-green-400', borderWidth: 'border-[3px]', color: 'text-green-600' },
      { border: 'border-orange-400', borderWidth: 'border-[4px]', color: 'text-orange-600' },
      { border: 'border-pink-400', borderWidth: 'border-[4px]', color: 'text-pink-600' },
      { border: 'border-red-400', borderWidth: 'border-[4px]', color: 'text-red-600' },
      { border: 'border-indigo-500', borderWidth: 'border-[5px]', color: 'text-indigo-700' }
    ];
    
    const style = levelStyles[Math.min(level, levelStyles.length - 1)];
    
    if (completed) {
      return {
        border: 'border-green-500',
        borderWidth: style.borderWidth,
        bg: 'bg-green-100',
        color: 'text-green-800'
      };
    }
    
    return {
      border: style.border,
      borderWidth: style.borderWidth,
      bg: 'bg-white',
      color: style.color
    };
  };

  // Convert grid coordinates to pixel position
  const gridToPosition = (level, row) => {
    const x = canvasSize.width - GRID.MARGIN - (level * GRID.COLUMN_WIDTH) - GRID.CARD_WIDTH;
    const y = GRID.MARGIN + (row * GRID.ROW_HEIGHT);
    return {
      x: Math.max(GRID.MARGIN, x),
      y: Math.max(GRID.MARGIN, y)
    };
  };

  // Convert pixel position to grid coordinates
  const positionToGrid = (position) => {
    const level = Math.max(0, Math.round((canvasSize.width - position.x - GRID.CARD_WIDTH - GRID.MARGIN) / GRID.COLUMN_WIDTH));
    const row = Math.max(0, Math.round((position.y - GRID.MARGIN) / GRID.ROW_HEIGHT));
    return { level, row };
  };

  // Get next available row for a level
  const getNextRowForLevel = (level) => {
    const levelGoals = goals.filter(g => g.level === level);
    if (levelGoals.length === 0) return 0;
    
    const occupiedRows = levelGoals.map(g => g.gridRow).sort((a, b) => a - b);
    let nextRow = 0;
    for (const row of occupiedRows) {
      if (row === nextRow) {
        nextRow++;
      } else {
        break;
      }
    }
    return nextRow;
  };

  // Shift goals in a level when inserting at specific row
  const shiftGoalsDown = (level, fromRow, excludeId = null) => {
    setGoals(prev => prev.map(goal => {
      if (goal.level === level && goal.gridRow >= fromRow && goal.id !== excludeId) {
        const newRow = goal.gridRow + 1;
        return {
          ...goal,
          gridRow: newRow,
          position: gridToPosition(level, newRow)
        };
      }
      return goal;
    }));
  };

  // Compact goals in a level (remove gaps)
  const compactLevel = (level) => {
    const levelGoals = goals
      .filter(g => g.level === level)
      .sort((a, b) => a.gridRow - b.gridRow);
    
    setGoals(prev => prev.map(goal => {
      const goalIndex = levelGoals.findIndex(g => g.id === goal.id);
      if (goalIndex !== -1 && goal.level === level) {
        return {
          ...goal,
          gridRow: goalIndex,
          position: gridToPosition(level, goalIndex)
        };
      }
      return goal;
    }));
  };

  // Initialize with grid positioning
  const startBreakdown = () => {
    if (mainGoal.trim()) {
      const rootGoal = {
        id: 1,
        text: mainGoal,
        completed: false,
        level: 0,
        gridRow: 0,
        parentId: null,
        position: gridToPosition(0, 0),
        children: []
      };
      setGoals([rootGoal]);
      setIsStarted(true);
      setCanvasOffset({ 
        x: -(canvasSize.width - 800), 
        y: -(canvasSize.height / 2 - 300) 
      });
    }
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pan handlers
  const handlePanStart = (e) => {
    if (spacePressed || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
    }
  };

  const handlePanMove = useCallback((e) => {
    if (isPanning) {
      e.preventDefault();
      setCanvasOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      setCanvasOffset(prev => ({
        x: prev.x - e.deltaX * 2,
        y: prev.y - e.deltaY * 2
      }));
    }
  };

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove);
      document.addEventListener('mouseup', handlePanEnd);
      return () => {
        document.removeEventListener('mousemove', handlePanMove);
        document.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove]);

  // Get visible goals based on focus
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

  // Connection calculation
  const calculateConnections = useCallback(() => {
    const newConnections = [];
    const visibleGoals = getVisibleGoals();
    
    visibleGoals.forEach(goal => {
      if (goal.parentId) {
        const parent = goals.find(g => g.id === goal.parentId);
        
        if (parent && visibleGoals.includes(parent)) {
          const startX = parent.position.x;
          const startY = parent.position.y + (GRID.CARD_HEIGHT / 2);
          const endX = goal.position.x + GRID.CARD_WIDTH;
          const endY = goal.position.y + (GRID.CARD_HEIGHT / 2);
          
          newConnections.push({
            id: `${parent.id}-${goal.id}`,
            from: { x: startX, y: startY },
            to: { x: endX, y: endY },
            completed: goal.completed && parent.completed,
            path: `M ${startX} ${startY} 
                   C ${startX - 80} ${startY}, 
                     ${endX + 80} ${endY}, 
                     ${endX} ${endY}`
          });
        }
      }
    });
    
    setConnections(newConnections);
  }, [goals, hiddenLevels, focusedGoal]);

  useEffect(() => {
    calculateConnections();
  }, [calculateConnections]);

  // Add sub-goal with grid positioning
  const addSubGoal = (parentId) => {
    const parent = goals.find(g => g.id === parentId);
    if (!parent) return;

    const newId = Math.max(0, ...goals.map(g => g.id)) + 1;
    const newLevel = parent.level + 1;
    const newRow = getNextRowForLevel(newLevel);
    const newPosition = gridToPosition(newLevel, newRow);

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

  // Grid-based drag handlers
  const handleDragStart = (e, goal) => {
    if (goal.isEditing || isPanning) return;
    setDraggedGoal(goal);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleDrag = useCallback((e) => {
    if (!draggedGoal || !canvasRef.current || isPanning) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - canvasRect.left - canvasOffset.x) - dragOffset.x;
    const mouseY = (e.clientY - canvasRect.top - canvasOffset.y) - dragOffset.y;

    const proposedPosition = {
      x: Math.max(0, Math.min(canvasSize.width - GRID.CARD_WIDTH, mouseX)),
      y: Math.max(0, Math.min(canvasSize.height - GRID.CARD_HEIGHT, mouseY))
    };

    // Convert to grid coordinates and snap
    const gridCoords = positionToGrid(proposedPosition);
    const snappedPosition = gridToPosition(gridCoords.level, gridCoords.row);

    setGoals(prev => prev.map(goal => 
      goal.id === draggedGoal.id 
        ? { 
            ...goal, 
            position: snappedPosition,
            level: gridCoords.level,
            gridRow: gridCoords.row
          }
        : goal
    ));
  }, [draggedGoal, dragOffset, canvasSize, canvasOffset, isPanning]);

  const handleDragEnd = () => {
    if (draggedGoal) {
      const draggedGoalData = goals.find(g => g.id === draggedGoal.id);
      if (draggedGoalData) {
        // Check if there's another goal at this position
        const conflictingGoal = goals.find(g => 
          g.id !== draggedGoal.id && 
          g.level === draggedGoalData.level && 
          g.gridRow === draggedGoalData.gridRow
        );

        if (conflictingGoal) {
          // Shift the conflicting goal and others down
          shiftGoalsDown(draggedGoalData.level, draggedGoalData.gridRow, draggedGoal.id);
        }

        // Compact the original level if the dragged goal moved levels
        if (draggedGoalData.level !== draggedGoal.level) {
          compactLevel(draggedGoal.level);
        }
      }
    }
    setDraggedGoal(null);
  };

  useEffect(() => {
    if (draggedGoal && !isPanning) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggedGoal, handleDrag, isPanning]);

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
    const goalToDelete = goals.find(g => g.id === id);
    if (goalToDelete) {
      setGoals(goals.filter(goal => goal.id !== id && goal.parentId !== id));
      // Compact the level after deletion
      setTimeout(() => compactLevel(goalToDelete.level), 50);
    }
  };

  const toggleFocus = (goalId) => {
    setFocusedGoal(focusedGoal === goalId ? null : goalId);
  };

  const reset = () => {
    setGoals([]);
    setMainGoal('');
    setIsStarted(false);
    setConnections([]);
    setHiddenLevels(new Set());
    setFocusedGoal(null);
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

  const getLevelStats = (level) => {
    const levelGoals = goals.filter(g => g.level === level);
    const completed = levelGoals.filter(g => g.completed).length;
    return { total: levelGoals.length, completed };
  };

  const getLevelLabel = (level) => {
    if (level === 0) return '🎯 Ultimate Goal';
    const labels = ['📋 Strategy', '🎯 Tactics', '⚡ Actions', '📝 Tasks', '✅ Steps', '🔍 Details', '💡 Micro'];
    return labels[level - 1] || `📌 Level ${level}`;
  };

  const existingLevels = [...new Set(goals.map(g => g.level))].sort((a, b) => a - b);

  const getGoalStyle = (goal) => {
    const levelStyle = getLevelStyle(goal.level, goal.completed);
    const baseStyle = "absolute rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] select-none";
    const cursorStyle = isPanning ? 'cursor-grab' : (goal.isEditing ? 'cursor-text' : 'cursor-move');
    
    return `${baseStyle} ${levelStyle.bg} ${levelStyle.border} ${levelStyle.borderWidth} ${cursorStyle}`;
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all duration-500 hover:scale-105">
          <div className="text-center mb-8">
            <Target className="mx-auto mb-4 text-yellow-600" size={64} />
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Fluid Goals</h1>
            <p className="text-gray-600">Interactive mindmap-style goal breakdown</p>
            <p className="text-sm text-gray-500 mt-2">✨ Work backwards from your ultimate goal</p>
          </div>
          <div className="space-y-6">
            <input
              type="text"
              value={mainGoal}
              onChange={(e) => setMainGoal(e.target.value)}
              placeholder="What's your ultimate goal?"
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-300 text-lg"
              onKeyDown={(e) => e.key === 'Enter' && startBreakdown()}
            />
            <button
              onClick={startBreakdown}
              disabled={!mainGoal.trim()}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-xl font-bold text-lg hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-300 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              Create Goal Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Target className="text-yellow-600" size={24} />
              <h1 className="text-xl font-bold text-gray-800">Fluid Goal Breakdown</h1>
              {focusedGoal && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Focus Mode Active
                </div>
              )}
            </div>

            {/* Level Navigation */}
            {existingLevels.length > 1 && (
              <div className="flex items-center gap-2 bg-white rounded-xl p-2 shadow-lg border border-gray-200">
                {existingLevels.map(level => {
                  const stats = getLevelStats(level);
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
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              {spacePressed ? '🖱️ Pan Mode' : 'Hold Space + Drag to Pan'}
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

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className={`relative w-full h-screen overflow-hidden ${isPanning ? 'cursor-grabbing' : spacePressed ? 'cursor-grab' : 'cursor-default'}`}
        style={{ marginTop: '80px' }}
        onMouseDown={handlePanStart}
        onWheel={handleWheel}
      >
        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
            width: canvasSize.width,
            height: canvasSize.height,
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}
        >
          {/* Grid visualization (optional - can be removed for cleaner look) */}
          {false && (
            <svg 
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-20"
              style={{ width: canvasSize.width, height: canvasSize.height }}
            >
              {/* Vertical grid lines for columns */}
              {Array.from({length: 8}).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={canvasSize.width - (i * GRID.COLUMN_WIDTH)}
                  y1={0}
                  x2={canvasSize.width - (i * GRID.COLUMN_WIDTH)}
                  y2={canvasSize.height}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
              ))}
              {/* Horizontal grid lines for rows */}
              {Array.from({length: 15}).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={GRID.MARGIN + (i * GRID.ROW_HEIGHT)}
                  x2={canvasSize.width}
                  y2={GRID.MARGIN + (i * GRID.ROW_HEIGHT)}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
              ))}
            </svg>
          )}

          {/* SVG for connections */}
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            {connections.map(conn => (
              <g key={conn.id}>
                <path
                  d={conn.path}
                  stroke={conn.completed ? '#10b981' : '#6b7280'}
                  strokeWidth="3"
                  fill="none"
                  className="transition-all duration-300"
                  strokeDasharray={conn.completed ? '0' : '5,5'}
                />
                <circle
                  cx={conn.from.x}
                  cy={conn.from.y}
                  r="4"
                  fill={conn.completed ? '#10b981' : '#6b7280'}
                />
                <circle
                  cx={conn.to.x}
                  cy={conn.to.y}
                  r="4"
                  fill={conn.completed ? '#10b981' : '#6b7280'}
                />
              </g>
            ))}
          </svg>

          {/* Goal nodes */}
          {getVisibleGoals().map((goal) => {
            const hasChildren = goals.filter(g => g.parentId === goal.id).length > 0;
            const isFocused = focusedGoal === goal.id;
            const levelStyle = getLevelStyle(goal.level, goal.completed);
            
            return (
              <div
                key={goal.id}
                className={`${getGoalStyle(goal)} p-4 z-10 group ${isFocused ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                style={{
                  left: goal.position.x,
                  top: goal.position.y,
                  width: GRID.CARD_WIDTH,
                  height: GRID.CARD_HEIGHT,
                  transform: draggedGoal?.id === goal.id ? 'rotate(1deg) scale(1.03)' : 'none',
                  zIndex: draggedGoal?.id === goal.id ? 20 : 10,
                  pointerEvents: isPanning ? 'none' : 'auto'
                }}
                onMouseDown={(e) => !isPanning && handleDragStart(e, goal)}
              >
                {goal.isEditing ? (
                  <input
                    type="text"
                    defaultValue={goal.text}
                    className="w-full h-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-lg resize-none"
                    placeholder="Enter goal..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        updateGoal(goal.id, e.target.value);
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        updateGoal(goal.id, e.target.value);
                      } else {
                        deleteGoal(goal.id);
                      }
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-start gap-3 mb-3">
                      {goal.level === 0 && (
                        <Target className="text-yellow-600 mt-1 flex-shrink-0" size={20} />
                      )}
                      <p 
                        className={`flex-1 text-sm font-medium leading-relaxed cursor-pointer hover:bg-black/5 p-1 rounded transition-colors ${
                          goal.completed ? 'line-through' : ''
                        } ${goal.level === 0 ? 'text-lg font-bold' : ''} ${levelStyle.color}`}
                        onClick={() => startEditing(goal.id)}
                        title="Click to edit"
                      >
                        {goal.text || 'Click to add text...'}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit3 className="text-gray-400" size={12} />
                        <Move className="text-gray-400" size={14} />
                      </div>
                    </div>
                    
                    {/* Progress indicator */}
                    {hasChildren && (
                      <div className="mb-3">
                        {(() => {
                          const children = goals.filter(g => g.parentId === goal.id);
                          const completed = children.filter(g => g.completed).length;
                          const total = children.length;
                          const percentage = total > 0 ? (completed / total) * 100 : 0;
                          
                          return (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>{completed}/{total} subtasks</span>
                                <span>{Math.round(percentage)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-green-400 h-1.5 rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center gap-2">
                      <button
                        onClick={() => addSubGoal(goal.id)}
                        className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1.5 rounded-lg hover:from-purple-600 hover:to-blue-600 text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md"
                      >
                        <Plus size={14} />
                        Break Down
                      </button>
                      
                      <div className="flex gap-1.5">
                        {goal.level > 0 && (
                          <button
                            onClick={() => toggleFocus(goal.id)}
                            className={`p-1.5 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-sm ${
                              isFocused 
                                ? 'bg-blue-500 text-white shadow-blue-200' 
                                : 'bg-white text-blue-600 hover:bg-blue-100 border border-blue-400'
                            }`}
                            title={isFocused ? 'Exit focus mode' : 'Focus on this branch'}
                          >
                            <Focus size={14} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => toggleComplete(goal.id)}
                          className={`p-1.5 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-sm ${
                            goal.completed 
                              ? 'bg-green-500 text-white shadow-green-200' 
                              : 'bg-white text-green-600 hover:bg-green-100 border border-green-400'
                          }`}
                        >
                          <Check size={14} />
                        </button>
                        
                        {goal.level > 0 && (
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="p-1.5 rounded-lg bg-white text-red-600 hover:bg-red-100 border border-red-400 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-sm"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Instructions */}
          {goals.length === 1 && (
            <div className="absolute top-20 left-20 bg-yellow-100 border-2 border-yellow-300 rounded-xl p-4 max-w-sm shadow-lg">
              <div className="flex items-start gap-3">
                <Target className="text-yellow-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-2">Grid-Based Goal Layout 🎨</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• <strong>Perfect grid alignment</strong> - no overlaps</li>
                    <li>• <strong>Drag to move rows</strong> - others shift automatically</li>
                    <li>• <strong>Border thickness</strong> increases with level importance</li>
                    <li>• <strong>Green fill</strong> shows completed goals</li>
                    <li>• <strong>Space + Drag</strong> to pan around</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FluidGoalBreakdown;