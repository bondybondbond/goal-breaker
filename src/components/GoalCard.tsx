import React, { useRef, useEffect } from 'react';

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
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Update content only when goal changes (not during typing)
  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== goal.text) {
      // Use innerHTML with escaped text to force proper layout
      // This triggers browser's text wrapping engine properly
      const escapedText = goal.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      contentRef.current.innerHTML = escapedText;
    }
  }, [goal.id, goal.text]); // Update when goal changes or text changes externally // Update when goal changes or text changes externally // Update when goal changes or text changes externally // Update when goal changes or text changes externally // Update when goal changes or text changes externally
  
  // Calculate goal level for styling
  const calculateLevel = (g: SimpleGoal): number => {
    if (!g.parentId) return 0;
    const parent = allGoals.find(goal => goal.id === g.parentId);
    return parent ? calculateLevel(parent) + 1 : 0;
  };

  // Font sizing based on character count (max 57 chars)
  const calculateFontSize = (text: string): { fontSize: number; topPadding: string } => {
    const charCount = text.length;
    
    // ≤15 chars: 16px font, middle align
    if (charCount <= 15) {
      return { fontSize: 16, topPadding: '20px' };
    }
    
    // 16-30 chars: 16px font, move slightly up
    if (charCount <= 30) {
      return { fontSize: 16, topPadding: '12px' };
    }
    
    // 31-45 chars: 16px font, top align
    if (charCount <= 45) {
      return { fontSize: 16, topPadding: '4px' };
    }
    
    // 46-57 chars: 13px font, top align
    return { fontSize: 13, topPadding: '4px' };
  };

  const level = calculateLevel(goal);
  const isSelected = selectedGoalId === goal.id;
  
  // Calculate font size and top padding
  const { fontSize, topPadding } = calculateFontSize(goal.text);
  
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
        <div
          ref={contentRef}
          contentEditable="true"
          suppressContentEditableWarning
          onInput={(e) => {
            const newText = e.currentTarget.textContent || '';
            // Enforce 57 character limit
            if (newText.length > 57) {
              const truncated = newText.substring(0, 57);
              e.currentTarget.textContent = truncated;
              // Move cursor to end
              const range = document.createRange();
              const selection = window.getSelection();
              range.selectNodeContents(e.currentTarget);
              range.collapse(false);
              selection?.removeAllRanges();
              selection?.addRange(range);
              onTextChange(goal.id, truncated);
            } else {
              onTextChange(goal.id, newText);
            }
          }}
          onFocus={(e) => {
            // Clear placeholder text on first focus
            if (goal.isPlaceholder) {
              // Select all text
              const range = document.createRange();
              range.selectNodeContents(e.currentTarget);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }}
          onBlur={(e) => {
            // Restore placeholder if left empty
            const text = e.currentTarget.textContent?.trim() || '';
            if (text === '') {
              onTextChange(
                goal.id, 
                !goal.parentId ? 'What\'s your main goal?' : 'New sub-goal'
              );
            }
          }}
          onMouseDown={(e) => {
            // Stop propagation to prevent card selection, but allow natural cursor placement
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            // Allow spacebar and other keys to work without triggering canvas panning
            e.stopPropagation();
          }}
          title={goal.text} // Show full text on hover
          style={{ 
            border: 'none', 
            outline: 'none', 
            width: '100%',
            height: '60px', // FIXED height
            backgroundColor: 'transparent',
            fontSize: `${fontSize}px`, // DYNAMIC font size
            fontFamily: 'inherit',
            fontWeight: !goal.parentId ? 'bold' : 'normal', // BOLD for main goal only
            textAlign: 'center',
            overflow: 'hidden', // NO SCROLLBAR
            lineHeight: '1.3',
            padding: `${topPadding} 4px`, // Dynamic top padding
            textDecoration: goal.completed ? 'line-through' : 'none', // Strikethrough when completed
            color: goal.isPlaceholder ? '#999' : 'inherit', // Gray color for placeholder
            whiteSpace: 'pre-wrap', // Preserve spaces and wrap text
            wordBreak: 'break-word', // Break long words
            cursor: 'text' // Show text cursor (I-beam) instead of pointer
          }}
        >
          {/* Content is managed by ref in useEffect - no children needed */}
        </div>
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
