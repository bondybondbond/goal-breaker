import React, { useState, useEffect, useRef } from 'react';
import { Target } from 'lucide-react';
import { ConnectionLines } from './ConnectionLines';
import GoalCard from './GoalCard';
import { GRID } from '../utils/gridHelpers';

interface CanvasManagerProps {
  // Canvas state
  canvasSize: { width: number; height: number };
  currentDirection: string;
  connectorStyle: string;
  
  // Goals and connections
  goals: any[];
  connections: any[];
  visibleGoals: any[];
  
  // Selection and interaction state
  selectedGoal: number | null;
  focusedGoal: number | null;
  
  // Goal management functions
  onAddRootGoal: (position?: any) => void;
  onSelectGoal: (goalId: number | null) => void;
  onUpdateGoal: (id: number, text: string) => void;
  onToggleComplete: (id: number) => void;
  onAddSubGoal: (parentId: number) => void;
  onAddSiblingGoal: (goalId: number, direction: string) => void;
  onDeleteGoal: (id: number) => void;
  onStartEditing: (id: number) => void;
  onToggleFocus: (goalId: number) => void;
  onSetPriority: (goalId: number, priority: 'high' | 'medium' | 'low') => void;
  
  // Canvas control functions
  onGoalsUpdate: (updatedGoals: any[]) => void;
  
  // Canvas state callbacks (for helper text in main component)
  onCanvasStateChange: (state: { spacePressed: boolean; isPanning: boolean }) => void;
}

const CanvasManager: React.FC<CanvasManagerProps> = ({
  canvasSize,
  currentDirection,
  connectorStyle,
  goals,
  connections,
  visibleGoals,
  selectedGoal,
  focusedGoal,
  onAddRootGoal,
  onSelectGoal,
  onUpdateGoal,
  onToggleComplete,
  onAddSubGoal,
  onAddSiblingGoal,
  onDeleteGoal,
  onStartEditing,
  onToggleFocus,
  onSetPriority,
  onGoalsUpdate,
  onCanvasStateChange
}) => {
  // Canvas-specific state
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  
  // Drag-specific state
  const [draggedGoal, setDraggedGoal] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPreviewPosition, setDragPreviewPosition] = useState(null);
  
  const canvasRef = useRef(null);

  // Auto-focus canvas for keyboard events (fixes spacebar issue)
  useEffect(() => {
    const hasEditingGoals = goals.some(goal => goal.isEditing);
    if (canvasRef.current && !hasEditingGoals) {
      canvasRef.current.focus();
    }
  }, []);
  
  // Remove canvas focus when editing starts
  useEffect(() => {
    const hasEditingGoals = goals.some(goal => goal.isEditing);
    if (hasEditingGoals && canvasRef.current && document.activeElement === canvasRef.current) {
      canvasRef.current.blur();
    } else if (!hasEditingGoals && canvasRef.current) {
      canvasRef.current.focus();
    }
  }, [goals]);

  // Focus canvas when mouse enters (improves spacebar UX)
  const handleMouseEnter = () => {
    // Don't steal focus if any goal is being edited
    const hasEditingGoals = goals.some(goal => goal.isEditing);
    if (canvasRef.current && !hasEditingGoals) {
      canvasRef.current.focus();
    }
  };

  // Notify parent component of canvas state changes (for helper text)
  useEffect(() => {
    onCanvasStateChange({ spacePressed, isPanning });
  }, [spacePressed, isPanning, onCanvasStateChange]);

  // Canvas event handlers
  const handleCanvasMouseDown = (e) => {
    // Left click (button 0) to clear selection when clicking on canvas background
    const isLeftButton = e.button === 0;
    const isMiddleButton = e.button === 1;
    
    if (isLeftButton) {
      // Check if clicking on canvas background (not on a goal card or other interactive element)
      // Look for goal cards by checking if the clicked element or its parents have goal-related classes
      const isGoalCard = e.target.closest('[data-goal-card]') || 
                        e.target.closest('.goal-card') ||
                        e.target.tagName === 'BUTTON' ||
                        e.target.tagName === 'TEXTAREA' ||
                        e.target.tagName === 'INPUT';
      
      if (!isGoalCard) {
        onSelectGoal(null);
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
      const updatedGoals = goals.map(goal => 
        goal.id === draggedGoal.id 
          ? { ...goal, position: dragPreviewPosition }
          : goal
      );
      onGoalsUpdate(updatedGoals);
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
    
    // Don't capture events if any goal is in editing mode
    const hasEditingGoals = goals.some(goal => goal.isEditing);
    if (hasEditingGoals) {
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
          onAddSiblingGoal(selectedGoal, siblingDirection);
        }
        e.preventDefault();
      } else if (e.code === 'Tab') {
        // TAB: Add child
        onAddSubGoal(selectedGoal);
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

  return (
    <div 
      ref={canvasRef}
      className={`relative w-full h-screen overflow-hidden ${isPanning ? 'cursor-grabbing' : spacePressed ? 'cursor-grab' : 'cursor-default'}`}
      style={{ 
        marginTop: '80px',
        outline: 'none' // Remove focus outline border
      }}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseDown={handleCanvasMouseDown}
      onMouseEnter={handleMouseEnter}
      onKeyDown={handleCanvasKeyDown}
      onKeyUp={handleCanvasKeyUp}
      tabIndex={0}
    >
      {/* Canvas Content - Transformed Inner Container */}
      <div
        className="canvas-background relative select-none"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
          transformOrigin: '0 0',
          backgroundColor: 'transparent'
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
            onClick={() => onAddRootGoal()}
          >
            <div className="text-center">
              <Target className="mx-auto mb-2 text-yellow-700" size={32} />
              <h2 className="text-lg font-bold text-yellow-800">What's your main goal?</h2>
              <p className="text-yellow-700 text-sm">Click to start breaking it down</p>
            </div>
          </div>
        ) : (
          visibleGoals.map(goal => {
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
                  onUpdate={onUpdateGoal}
                  onToggleComplete={onToggleComplete}
                  onAddSubGoal={onAddSubGoal}
                  onAddSiblingGoal={onAddSiblingGoal}
                  onDelete={onDeleteGoal}
                  onStartEditing={onStartEditing}
                  onToggleFocus={onToggleFocus}
                  onSetPriority={onSetPriority}
                  isFocused={focusedGoal === goal.id}
                  isDragged={isDraggedCard}
                  onDragStart={handleGoalDragStart}
                  isSelected={selectedGoal === goal.id}
                  onSelect={onSelectGoal}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CanvasManager;