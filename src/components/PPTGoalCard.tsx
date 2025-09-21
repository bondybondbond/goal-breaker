import React from 'react';

interface PPTGoalCardProps {
  goal: any;
  onUpdate: (id: number, text: string) => void;
  onToggleComplete: (id: number) => void;
  onStartEditing: (id: number) => void;
  onSelect: (goalId: number) => void;
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
  isSelected
}) => {
  const levelColor = LEVEL_COLORS[Math.min(goal.level, LEVEL_COLORS.length - 1)];
  
  // Auto-size text based on content length (PPT style)
  const getTextSize = (text: string) => {
    if (!text) return 'text-base';
    if (text.length < 20) return 'text-lg';
    if (text.length < 40) return 'text-base';
    if (text.length < 80) return 'text-sm';
    return 'text-xs';
  };

  // Compact card size (much smaller than current)
  const cardWidth = 160;
  const cardHeight = 60;

  return (
    <div
      className={`absolute rounded-lg shadow-md cursor-pointer transition-all duration-200 
        ${goal.completed ? 'bg-green-100' : 'bg-white'} 
        ${isSelected ? `${levelColor} ${goal.level === 0 ? 'border-4' : 'border-2'}` : 'border border-gray-300'}
        hover:shadow-lg hover:scale-105`}
      style={{
        left: goal.position.x,
        top: goal.position.y,
        width: cardWidth,
        height: cardHeight,
      }}
      onClick={() => onSelect(goal.id)}
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
            className="w-full h-full border-0 bg-transparent resize-none focus:outline-none text-center"
            placeholder={goal.level === 0 ? "Main goal..." : "Task..."}
            ref={(textarea) => {
              if (textarea) {
                textarea.focus();
                // Set cursor at the end of text
                const length = textarea.value.length;
                textarea.setSelectionRange(length, length);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                onUpdate(goal.id, (e.target as HTMLTextAreaElement).value);
                e.preventDefault();
              }
              if (e.key === 'Escape') {
                onUpdate(goal.id, goal.text || '');
                e.preventDefault();
              }
            }}
            onBlur={(e) => {
              onUpdate(goal.id, e.target.value.trim());
            }}
            onClick={(e) => e.stopPropagation()}
          />
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
            {goal.text || (goal.level === 0 ? "Main goal..." : "New task")}
          </p>
        )}
      </div>
    </div>
  );
};

export default PPTGoalCard;