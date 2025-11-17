import React from 'react';

interface SimpleGoal {
  id: number;
  text: string;
  parentId?: number;
  position: { x: number; y: number };
  completed?: boolean;
  isPlaceholder?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface ToolbarProps {
  goal: SimpleGoal;
  selectedGoalId: number | null;
  onToggleComplete: (goalId: number) => void;
  onDelete: (goalId: number) => void;
  onSetPriority: (goalId: number, priority: 'high' | 'medium' | 'low' | undefined) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  goal, 
  selectedGoalId, 
  onToggleComplete, 
  onDelete,
  onSetPriority
}) => {
  // Dropdown state
  const [showPriorityDropdown, setShowPriorityDropdown] = React.useState(false);

  // Only show toolbar if this goal is selected
  if (selectedGoalId !== goal.id) return null;

  const getPriorityColor = () => {
    if (!goal.priority) return '#E5E7EB'; // Light grey (none)
    if (goal.priority === 'high') return '#EF4444'; // Red
    if (goal.priority === 'medium') return '#F59E0B'; // Amber
    return '#9CA3AF'; // Grey (low)
  };

  const getPriorityLabel = () => {
    if (!goal.priority) return 'None';
    if (goal.priority === 'high') return 'High';
    if (goal.priority === 'medium') return 'Med';
    return 'Low';
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: goal.position.x + 160 - 69, // Adjusted for 3 buttons
        top: goal.position.y - 26,
        display: 'flex',
        gap: '0',
        zIndex: 1000
      }}
    >
      {/* Priority button - hidden for main goal */}
      {goal.parentId !== undefined && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPriorityDropdown(!showPriorityDropdown);
          }}
          style={{
            width: '23px',
            height: '23px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            borderRadius: '0',
            cursor: 'pointer',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            position: 'relative'
          }}
          title="Set priority"
        >
          {/* Colored dot showing current priority */}
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: getPriorityColor(),
            border: '1px solid rgba(0,0,0,0.1)'
          }}></span>
        </button>
      )}

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

      {/* Priority Dropdown Menu - hidden for main goal */}
      {goal.parentId !== undefined && showPriorityDropdown && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '25px', // Below the toolbar
            left: '0px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '2px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 10000,
            minWidth: '80px'
          }}
        >
          {/* None Option */}
          <div
            onClick={() => {
              onSetPriority(goal.id, undefined);
              setShowPriorityDropdown(false);
            }}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              backgroundColor: !goal.priority ? '#f3f4f6' : 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = !goal.priority ? '#f3f4f6' : 'transparent'}
          >
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#E5E7EB',
              border: '1px solid #D1D5DB'
            }}></span>
            None
            {!goal.priority && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓</span>}
          </div>

          {/* High Priority */}
          <div
            onClick={() => {
              onSetPriority(goal.id, 'high');
              setShowPriorityDropdown(false);
            }}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              backgroundColor: goal.priority === 'high' ? '#f3f4f6' : 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = goal.priority === 'high' ? '#f3f4f6' : 'transparent'}
          >
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#EF4444'
            }}></span>
            High
            {goal.priority === 'high' && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓</span>}
          </div>

          {/* Medium Priority */}
          <div
            onClick={() => {
              onSetPriority(goal.id, 'medium');
              setShowPriorityDropdown(false);
            }}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              backgroundColor: goal.priority === 'medium' ? '#f3f4f6' : 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = goal.priority === 'medium' ? '#f3f4f6' : 'transparent'}
          >
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#F59E0B'
            }}></span>
            Medium
            {goal.priority === 'medium' && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓</span>}
          </div>

          {/* Low Priority */}
          <div
            onClick={() => {
              onSetPriority(goal.id, 'low');
              setShowPriorityDropdown(false);
            }}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              backgroundColor: goal.priority === 'low' ? '#f3f4f6' : 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = goal.priority === 'low' ? '#f3f4f6' : 'transparent'}
          >
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#9CA3AF'
            }}></span>
            Low
            {goal.priority === 'low' && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
