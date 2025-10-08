import React from 'react';

interface SimpleGoal {
  id: number;
  text: string;
  parentId?: number;
  position: { x: number; y: number };
  completed?: boolean;
  isPlaceholder?: boolean;
}

interface GoalCardProps {
  goal: SimpleGoal;
  selectedGoalId: number | null;
  allGoals: SimpleGoal[];
  onCardClick: (goalId: number, e: React.MouseEvent) => void;
  onTextChange: (goalId: number, newText: string) => void;
  onAddChild: (goalId: number) => void;
  onAddSibling: (goalId: number) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  selectedGoalId,
  allGoals,
  onCardClick,
  onTextChange,
  onAddChild,
  onAddSibling
}) => {
  // Calculate goal level for styling
  const calculateLevel = (g: SimpleGoal): number => {
    if (!g.parentId) return 0;
    const parent = allGoals.find(goal => goal.id === g.parentId);
    return parent ? calculateLevel(parent) + 1 : 0;
  };

  // Calculate dynamic font size based on text content (PowerPoint style)
  const calculateFontSize = (text: string): number => {
    const charCount = text.length;
    
    if (charCount < 25) return 16; // Short text = large font
    if (charCount < 50) return 14; // Medium text
    return 13; // Longer text = minimum readable size // 42 chars + "..." = 45 total
  };

  const level = calculateLevel(goal);
  const isSelected = selectedGoalId === goal.id;
  
  // Clean white cards by default, green when completed
  const bgColor = goal.completed 
    ? '#c8e6c9'  // Green when completed
    : 'white';   // White by default

  return (
    <>
      {/* Main card */}
      <div 
        onClick={(e) => onCardClick(goal.id, e)}
        style={{ 
          position: 'absolute',
          left: goal.position.x,
          top: goal.position.y,
          border: '1px solid #999', 
          outline: isSelected ? '2px solid #333' : 'none',
          outlineOffset: '-1px',
          padding: '6px', 
          backgroundColor: bgColor,
          width: '160px', // FIXED width - never shrinks
          boxSizing: 'border-box', // Include padding in width
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          fontSize: '13px',
          cursor: 'pointer'
        }}
      >
        <textarea
          value={goal.text}
          onChange={(e) => {
            const newText = e.target.value;
            // Limit to 45 characters max
            if (newText.length <= 45) {
              onTextChange(goal.id, newText);
            }
          }}
          onFocus={(e) => {
            // Clear placeholder text on first focus
            if (goal.isPlaceholder) {
              e.target.select(); // Select all text so it gets replaced when typing
            }
          }}
          onBlur={() => {
            // Restore placeholder if left empty
            if (goal.text.trim() === '') {
              onTextChange(
                goal.id, 
                !goal.parentId ? 'What\'s your main goal?' : 'New sub-goal'
              );
            }
          }}
          title={goal.text} // Show full text on hover
          style={{ 
            border: 'none', 
            outline: 'none', 
            width: '100%',
            height: '60px', // FIXED height
            resize: 'none',
            backgroundColor: 'transparent',
            fontSize: `${calculateFontSize(goal.text)}px`, // DYNAMIC font size (PPT-style)
            fontFamily: 'inherit',
            fontWeight: !goal.parentId ? 'bold' : 'normal', // BOLD for main goal only
            textAlign: 'center',
            overflow: 'hidden', // NO SCROLLBAR
            lineHeight: '1.3',
            padding: '12px 4px', // Fixed padding
            textDecoration: goal.completed ? 'line-through' : 'none', // Strikethrough when completed
            color: goal.isPlaceholder ? '#999' : 'inherit' // Gray color for placeholder
          }}
        />
      </div>

      {/* Add Child button - below card */}
      {isSelected && (
        <button
          onClick={() => onAddChild(goal.id)}
          style={{
            position: 'absolute',
            left: goal.position.x + 70, // Center below card
            top: goal.position.y + 75, // Fixed position below card
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: '1px solid #999',
            backgroundColor: 'white', // White like cards
            fontSize: '14px',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
          title="Add child"
        >
          +
        </button>
      )}

      {/* Add Sibling button - right of card (only if not level 0) */}
      {isSelected && goal.parentId && (
        <button
          onClick={() => onAddSibling(goal.id)}
          style={{
            position: 'absolute',
            left: goal.position.x + 165, // Right of card with smaller gap
            top: goal.position.y + 28, // Fixed vertical center
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: '1px solid #999',
            backgroundColor: 'white', // White like cards
            fontSize: '14px',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
          title="Add sibling"
        >
          +
        </button>
      )}
    </>
  );
};

export default GoalCard;
