import React from 'react';

interface SimpleGoal {
  id: number;
  text: string;
  parentId?: number;
  position: { x: number; y: number };
  completed?: boolean;
  isPlaceholder?: boolean;
}

interface ToolbarProps {
  goal: SimpleGoal;
  selectedGoalId: number | null;
  onToggleComplete: (goalId: number) => void;
  onDelete: (goalId: number) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  goal, 
  selectedGoalId, 
  onToggleComplete, 
  onDelete 
}) => {
  // Only show toolbar if this goal is selected
  if (selectedGoalId !== goal.id) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: goal.position.x + 160 - 46,
        top: goal.position.y - 26,
        display: 'flex',
        gap: '0',
        zIndex: 1000
      }}
    >
      {/* Complete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(goal.id);
        }}
        style={{
          width: '23px',
          height: '23px',
          border: '1px solid #ddd',
          backgroundColor: goal.completed ? '#c8e6c9' : 'white',
          borderRadius: '0',
          cursor: 'pointer',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#22C55E',
          fontWeight: 'bold',
          padding: 0
        }}
        title={goal.completed ? "Mark as incomplete" : "Mark as complete"}
      >
        ✔
      </button>

      {/* Delete button - hidden for main goal */}
      {goal.parentId !== undefined && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(goal.id);
          }}
          style={{
            width: '23px',
            height: '23px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            borderRadius: '0',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#E94B8B',
            fontWeight: 'bold',
            padding: 0
          }}
          title="Delete goal"
        >
          ✖
        </button>
      )}
    </div>
  );
};

export default Toolbar;
