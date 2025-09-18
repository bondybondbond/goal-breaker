import React from 'react';
import { Plus } from 'lucide-react';
import { getLevelStyle } from '../utils/styleHelpers';
import { GRID } from '../utils/gridHelpers';
import GoalCardMenu from './GoalCardMenu';

interface GoalCardProps {
  goal: any; // TODO: Type this properly with goal types
  currentDirection: string;
  onUpdate: (id: number, text: string) => void;
  onToggleComplete: (id: number) => void;
  onAddSubGoal: (parentId: number) => void;
  onAddSiblingGoal: (goalId: number, direction: string) => void;
  onDelete: (id: number) => void;
  onStartEditing: (id: number) => void;
  onToggleFocus: (goalId: number) => void;
  isFocused: boolean;
  isDragged: boolean;
  onDragStart: (goal: any, event: React.MouseEvent) => void;
  isSelected: boolean;
  onSelect: (goalId: number) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  currentDirection,
  onUpdate,
  onToggleComplete,
  onAddSubGoal,
  onAddSiblingGoal,
  onDelete,
  onStartEditing,
  onToggleFocus,
  isFocused,
  isDragged,
  onDragStart,
  isSelected,
  onSelect
}) => {
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
  
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left mouse button (button 0) for dragging
    // Let middle mouse button (button 1) bubble up to canvas for panning
    if (e.button !== 0) {
      return; // Allow middle mouse and right mouse to bubble up
    }
    
    // Only start dragging if not clicking on interactive elements or their children
    const target = e.target as HTMLElement;
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
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
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
        userSelect: 'none',
        // Hardware-accelerated transforms for smooth dragging
        transform: isDragged ? 'translate3d(0,0,0)' : 'none',
        willChange: isDragged ? 'transform' : 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Hierarchy level indicator bar at top - always visible */}
      <div 
        className={`absolute top-0 left-0 right-0 h-2 ${selectionColor.bg} rounded-t-xl`}
      />
      
      {/* Navigation buttons - direction-aware positioning */}
      {isSelected && (
        <>
          {currentDirection === 'up-down' ? (
            // TOP-DOWN VIEW: Child bottom, siblings left/right (NEW LAYOUT)
            <>
              {/* Add Child Button - Bottom Center (Next Level) */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-50">
                <button
                  className={`w-6 h-6 ${selectionColor.bg} ${selectionColor.hover} text-white rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl group relative`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddSubGoal(goal.id);
                  }}
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Add Child
                    <div className="text-[10px] text-gray-300">Next level</div>
                  </div>
                </button>
              </div>
              
              {/* Sibling Buttons - Left and Right (Same Level) - Only for non-ultimate goals */}
              {goal.level > 0 && (
                <>
                  <div className="absolute top-1/2 -translate-y-1/2 -left-10 z-50">
                    <button
                      className={`w-6 h-6 ${selectionColor.bg} ${selectionColor.hover} text-white rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl group relative`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSiblingGoal(goal.id, 'left');
                      }}
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Add Left
                        <div className="text-[10px] text-gray-300">Same level</div>
                      </div>
                    </button>
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 -right-10 z-50">
                    <button
                      className={`w-6 h-6 ${selectionColor.bg} ${selectionColor.hover} text-white rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl group relative`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSiblingGoal(goal.id, 'right');
                      }}
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Add Right
                        <div className="text-[10px] text-gray-300">Same level</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            // HORIZONTAL VIEWS: Child left/right, siblings up/down (ORIGINAL LAYOUT)
            <>
              {/* Add Child Button - Side (Next Level) - Direction-aware positioning */}
              <div className={`absolute top-1/2 -translate-y-1/2 z-50 ${
                currentDirection === 'left-right' ? '-right-10' : '-left-10'
              }`}>
                <button
                  className={`w-6 h-6 ${selectionColor.bg} ${selectionColor.hover} text-white rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl group relative`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddSubGoal(goal.id);
                  }}
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Add Child
                    <div className="text-[10px] text-gray-300">Next level</div>
                  </div>
                </button>
              </div>
              
              {/* Sibling Buttons - Top and Bottom (Same Level) - Only for non-ultimate goals */}
              {goal.level > 0 && (
                <>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50">
                    <button
                      className={`w-6 h-6 ${selectionColor.bg} ${selectionColor.hover} text-white rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl group relative`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSiblingGoal(goal.id, 'above');
                      }}
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Add Above
                        <div className="text-[10px] text-gray-300">Same level</div>
                      </div>
                    </button>
                  </div>
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-50">
                    <button
                      className={`w-6 h-6 ${selectionColor.bg} ${selectionColor.hover} text-white rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl group relative`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSiblingGoal(goal.id, 'below');
                      }}
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Add Below
                        <div className="text-[10px] text-gray-300">Same level</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </>
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
        <div className="flex-1 flex items-center justify-center pr-2">
          {goal.isEditing ? (
            <div className="relative flex-1 h-full flex items-center px-1">
              <textarea
                defaultValue={goal.text}
                className="w-full h-full px-2 py-1 border-0 bg-gray-100 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 text-xl font-bold text-gray-800"
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
                    if ((e.target as HTMLTextAreaElement).value.trim()) {
                      onUpdate(goal.id, (e.target as HTMLTextAreaElement).value);
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

export default GoalCard;
