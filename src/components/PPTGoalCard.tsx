import React from 'react';

interface PPTGoalCardProps {
  goal: any;
  onUpdate: (id: number, text: string) => void;
  onToggleComplete: (id: number) => void;
  onStartEditing: (id: number) => void;
  onSelect: (goalId: number) => void;
  onAddChild: (parentId: number) => void;
  onAddSibling: (siblingId: number) => void;
  isSelected: boolean;
}

// PowerPoint SmartArt inspired - Level-based border colors
const LEVEL_COLORS = [
  'border-yellow-500',  // Level 0 - Ultimate goal (GOLDEN)
  'border-purple-500',  // Level 1
  'border-green-500',   // Level 2
  'border-orange-500',  // Level 3
  'border-pink-500',    // Level 4
  'border-red-500',     // Level 5
];

const PPTGoalCard: React.FC<PPTGoalCardProps> = ({
  goal,
  onUpdate,
  onToggleComplete,
  onStartEditing,
  onSelect,
  onAddChild,
  onAddSibling,
  isSelected
}) => {
  const levelColor = LEVEL_COLORS[Math.min(goal.level, LEVEL_COLORS.length - 1)];
  
  // Auto-size text based on content length (PPT style)
  const getTextSize = (text: string) => {
    if (!text) return goal.level === 0 ? 'text-lg' : 'text-base'; // Main goal gets larger text
    if (text.length < 20) return goal.level === 0 ? 'text-xl' : 'text-lg'; // Main goal larger
    if (text.length < 40) return goal.level === 0 ? 'text-lg' : 'text-base';
    if (text.length < 80) return goal.level === 0 ? 'text-base' : 'text-sm';
    return goal.level === 0 ? 'text-sm' : 'text-xs';
  };

  // Dynamic card size - bigger for empty main goal, compact otherwise
  const isEmptyMainGoal = goal.level === 0 && !goal.text.trim() && !goal.isEditing;
  const cardWidth = isEmptyMainGoal ? 400 : 160;
  const cardHeight = isEmptyMainGoal ? 120 : 60;

  return (
    <div
      data-goal-card="true"
      className={`absolute rounded-lg cursor-pointer transition-all duration-200 
        ${isEmptyMainGoal 
          ? 'bg-yellow-100 border-2 border-dashed border-yellow-400 shadow-lg' 
          : goal.completed 
            ? 'bg-green-100' 
            : 'bg-white'
        } 
        ${!isEmptyMainGoal && isSelected 
          ? `${levelColor} ${goal.level === 0 ? 'border-4' : 'border-2'} shadow-lg ring-2 ring-blue-200 ring-opacity-50` 
          : !isEmptyMainGoal 
            ? 'border border-gray-300 shadow-md'
            : ''
        }
        hover:shadow-lg hover:scale-105`}
      style={{
        left: goal.position.x,
        top: goal.position.y,
        width: cardWidth,
        height: cardHeight,
      }}
      onClick={() => {
        onSelect(goal.id);
        // Auto-start editing if it's an empty main goal
        if (goal.level === 0 && !goal.text.trim()) {
          setTimeout(() => onStartEditing(goal.id), 100);
        }
      }}
    >
      {/* Simple completion indicator */}
      {goal.completed && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
      
      {/* Main text content */}
      <div className="h-full flex items-center justify-center p-2">
        {goal.isEditing ? (
          <textarea
            defaultValue={goal.text}
            className={`w-full h-full border-0 bg-transparent resize-none focus:outline-none text-center font-medium
              ${getTextSize(goal.text || '')}
              ${goal.completed ? 'line-through text-green-700' : 'text-gray-800'}`}
            placeholder={goal.level === 0 ? "What do you want to solve today?" : "Task..."}
            ref={(textarea) => {
              if (textarea) {
                // Small delay to ensure DOM is ready and avoid focus conflicts
                setTimeout(() => {
                  textarea.focus();
                  // Set cursor at the end of text
                  const length = textarea.value.length;
                  textarea.setSelectionRange(length, length);
                }, 100);
              }
            }}
            onKeyDown={(e) => {
              const currentText = (e.target as HTMLTextAreaElement).value;
              
              if (e.key === 'Escape') {
                // Cancel editing - revert to original text
                onUpdate(goal.id, goal.text || '');
                e.preventDefault();
              }
              else if (e.key === 'Tab') {
                // Save current text and add child
                onUpdate(goal.id, currentText);
                setTimeout(() => onAddChild(goal.id), 50);
                e.preventDefault();
              }
              else if (e.key === 'Enter' && !e.shiftKey) {
                // Save current text first
                onUpdate(goal.id, currentText);
                
                // For main goal (level 0): just save and exit editing (no siblings allowed)
                if (goal.level === 0) {
                  // Main goal - just save and stop editing
                } else {
                  // For other goals: create a sibling
                  setTimeout(() => onAddSibling(goal.id), 50);
                }
                e.preventDefault();
              }
            }}
            onBlur={(e) => {
              const currentValue = e.target.value.trim();
              // Force update immediately without waiting for other events
              setTimeout(() => {
                onUpdate(goal.id, currentValue);
              }, 0);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : isEmptyMainGoal ? (
          // Special styling for empty main goal
          <div className="text-center">
            <div className="mb-3">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-yellow-800 mb-2">
                🎯
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-800 mb-1">
              What's your main goal?
            </p>
            <p className="text-sm text-gray-600">
              Click to start breaking it down
            </p>
          </div>
        ) : (
          <p 
            className={`text-center font-medium cursor-text w-full
              ${getTextSize(goal.text || '')}
              ${goal.completed ? 'line-through text-green-700' : 'text-gray-800'}`}
            onClick={(e) => {
              e.stopPropagation();
              onStartEditing(goal.id);
            }}
          >
            {goal.text || (goal.level === 0 ? "What do you want to solve today?" : "New task")}
          </p>
        )}
      </div>
    </div>
  );
};

export default PPTGoalCard;