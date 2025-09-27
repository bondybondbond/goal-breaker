import React, { useState } from 'react';

interface SimpleGoal {
  id: number;
  text: string;
  parentId?: number;
  position: { x: number; y: number };
}

const SimpleGoalBreaker: React.FC = () => {
  const [goals, setGoals] = useState<SimpleGoal[]>([
    { id: 1, text: 'What\'s your main goal?', parentId: undefined, position: { x: 400, y: 80 } }
  ]);
  const [nextId, setNextId] = useState(2);

  // Helper: Check if a goal is a leaf (no children)
  const isLeafGoal = (goalId: number): boolean => {
    return !goals.some(g => g.parentId === goalId);
  };

  // Helper: Check if a goal is at the deepest level in its branch
  const isAtDeepestLevel = (goalId: number): boolean => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !goal.parentId) return false;
    
    // Get all siblings
    const siblings = goals.filter(g => g.parentId === goal.parentId);
    
    // Check if ANY sibling has children (if so, this level is not deepest)
    return siblings.every(sib => isLeafGoal(sib.id));
  };

  // RECALCULATE ALL POSITIONS - PowerPoint Style
  // Now accepts goals array as parameter to avoid closure issues
  const recalculatePositions = (goalsArray: SimpleGoal[]): SimpleGoal[] => {
    const CARD_WIDTH = 220;
    const CARD_HEIGHT = 80;
    const HORIZONTAL_GAP = 30;
    const VERTICAL_GAP = 40;
    
    const newPositions = new Map<number, { x: number; y: number }>();
    
    // Calculate subtree width recursively
    const calculateSubtreeWidth = (goalId: number): number => {
      const children = goalsArray.filter(g => g.parentId === goalId);
      
      if (children.length === 0) {
        return CARD_WIDTH; // Leaf node
      }
      
      const goal = goalsArray.find(g => g.id === goalId);
      if (!goal) return CARD_WIDTH;
      
      // Check if this is Level 1 (ultimate goal's children)
      const isLevel1 = !goal.parentId;
      
      // Check if all children are leaves
      const allChildrenAreLeaves = children.every(child => 
        !goalsArray.some(g => g.parentId === child.id)
      );
      
      if (isLevel1 || !allChildrenAreLeaves) {
        // Horizontal layout - sum all children widths
        const childrenWidth = children.reduce((total, child) => 
          total + calculateSubtreeWidth(child.id) + HORIZONTAL_GAP, 0
        ) - HORIZONTAL_GAP;
        
        return Math.max(CARD_WIDTH, childrenWidth);
      } else {
        // Vertical layout - widest child
        const maxChildWidth = Math.max(...children.map(child => 
          calculateSubtreeWidth(child.id)
        ));
        return Math.max(CARD_WIDTH, maxChildWidth);
      }
    };
    
    // Position nodes recursively
    const positionNode = (goalId: number, x: number, y: number): void => {
      newPositions.set(goalId, { x, y });
      
      const children = goalsArray.filter(g => g.parentId === goalId);
      if (children.length === 0) return;
      
      const goal = goalsArray.find(g => g.id === goalId);
      if (!goal) return;
      
      const isLevel1 = !goal.parentId;
      const allChildrenAreLeaves = children.every(child => 
        !goalsArray.some(g => g.parentId === child.id)
      );
      
      if (isLevel1 || !allChildrenAreLeaves) {
        // Horizontal layout
        const totalWidth = calculateSubtreeWidth(goalId);
        let currentX = x - totalWidth / 2 + CARD_WIDTH / 2;
        
        children.forEach(child => {
          const childWidth = calculateSubtreeWidth(child.id);
          const childX = currentX + childWidth / 2 - CARD_WIDTH / 2;
          const childY = y + CARD_HEIGHT + VERTICAL_GAP;
          
          positionNode(child.id, childX, childY);
          currentX += childWidth + HORIZONTAL_GAP;
        });
      } else {
        // Vertical layout
        let currentY = y + CARD_HEIGHT + VERTICAL_GAP;
        
        children.forEach(child => {
          positionNode(child.id, x, currentY);
          currentY += CARD_HEIGHT + VERTICAL_GAP;
        });
      }
    };
    
    // Start from root (ultimate goal)
    const rootGoal = goalsArray.find(g => !g.parentId);
    if (rootGoal) {
      // Calculate total tree width to center properly
      const totalTreeWidth = calculateSubtreeWidth(rootGoal.id);
      const centerX = Math.max(totalTreeWidth / 2 + 100, 600); // At least 600px from left
      positionNode(rootGoal.id, centerX, 80);
    }
    
    // Return updated goals array with new positions
    return goalsArray.map(goal => ({
      ...goal,
      position: newPositions.get(goal.id) || goal.position
    }));
  };

  // Wrapper to recalculate all positions and update state
  const recalculateAllPositions = () => {
    setGoals(prev => recalculatePositions(prev));
  };

  // OLD positioning function (kept for adding new goals before recalc)
  const calculateGridPosition = (parentId?: number): { x: number; y: number } => {
    if (!parentId) {
      return { x: 600, y: 80 }; // Ultimate goal at top center
    }
    
    const parent = goals.find(g => g.id === parentId);
    if (!parent) return { x: 50, y: 80 };
    
    // Just place near parent - will be recalculated
    return {
      x: parent.position.x,
      y: parent.position.y + 120
    };
  };



  // Add a child to a specific goal
  const addChild = (parentId: number) => {
    const newGoal: SimpleGoal = {
      id: nextId,
      text: 'New sub-goal',
      parentId: parentId,
      position: calculateGridPosition(parentId)
    };
    
    setGoals(prev => {
      const updated = [...prev, newGoal];
      // Recalculate positions immediately with the new goal
      return recalculatePositions(updated);
    });
    setNextId(prev => prev + 1);
  };

  // Add a sibling to a specific goal
  const addSibling = (siblingId: number) => {
    const sibling = goals.find(g => g.id === siblingId);
    if (!sibling) return;

    const newGoal: SimpleGoal = {
      id: nextId,
      text: 'New sibling goal',
      parentId: sibling.parentId,
      position: calculateGridPosition(sibling.parentId)
    };
    
    setGoals(prev => {
      const updated = [...prev, newGoal];
      return updated;
    });
    setNextId(prev => prev + 1);
    
    // Recalculate layout after adding
    setTimeout(() => recalculateAllPositions(), 0);
  };

  // Update goal text
  const updateGoalText = (id: number, newText: string) => {
    setGoals(prev => prev.map(goal => 
      goal.id === id ? { ...goal, text: newText } : goal
    ));
  };

  // Get children of a goal
  const getChildren = (parentId: number): SimpleGoal[] => {
    return goals.filter(goal => goal.parentId === parentId);
  };

  // Render a goal with absolute positioning
  const renderGoal = (goal: SimpleGoal) => {
    // Calculate goal level for coloring
    const calculateLevel = (g: SimpleGoal): number => {
      if (!g.parentId) return 0;
      const parent = goals.find(goal => goal.id === g.parentId);
      return parent ? calculateLevel(parent) + 1 : 0;
    };
    
    const level = calculateLevel(goal);
    const isLeaf = !goals.some(g => g.parentId === goal.id);
    
    // Simple level-based colors
    const levelColors = ['#e3f2fd', '#fff3e0', '#e8f5e8', '#fce4ec', '#f1f8e9'];
    const bgColor = levelColors[level % levelColors.length];
    
    return (
      <div 
        key={goal.id} 
        style={{ 
          position: 'absolute',
          left: goal.position.x,
          top: goal.position.y,
          border: '2px solid #666', 
          padding: '10px', 
          backgroundColor: bgColor,
          minWidth: '200px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <input
          type="text"
          value={goal.text}
          onChange={(e) => updateGoalText(goal.id, e.target.value)}
          style={{ 
            border: 'none', 
            outline: 'none', 
            width: '100%',
            backgroundColor: 'transparent'
          }}
        />
        <div style={{ marginTop: 5, fontSize: '12px' }}>
          <button 
            onClick={() => addChild(goal.id)}
            style={{ marginRight: 5, fontSize: '10px' }}
          >
            + Child
          </button>
          <button 
            onClick={() => addSibling(goal.id)}
            style={{ fontSize: '10px' }}
          >
            + Sibling
          </button>
          <span style={{ marginLeft: 10, color: '#666' }}>
            ID: {goal.id} | L{level} | {isLeaf ? '🍃' : '🌳'}
          </span>
        </div>
      </div>
    );
  };



  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🔍 Simple Goal Breaker (Debug Version)</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Total goals: {goals.length} | Next ID: {nextId}
      </p>
      
      {/* Debug info */}
      <div style={{ 
        backgroundColor: '#f0f0f0', 
        padding: '10px', 
        marginBottom: '20px',
        fontSize: '12px'
      }}>
        <strong>All Goals:</strong><br/>
        {goals.map(g => {
          const isLeaf = isLeafGoal(g.id);
          const atDeepest = isAtDeepestLevel(g.id);
          return `ID:${g.id} "${g.text}" (parent:${g.parentId}) ${isLeaf ? '🍃' : '🌳'} ${atDeepest ? '⬇️' : '➡️'}`;
        }).join(', ')}
        <br/><br/>
        <strong>PowerPoint SmartArt Logic:</strong> ⬇️ = At deepest level (children grow vertically), ➡️ = Not deepest (children grow horizontally)
      </div>

      {/* Canvas area with positioned goals */}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '1200px', 
        border: '1px dashed #ccc',
        backgroundColor: '#fafafa',
        overflow: 'auto'
      }}>
        {goals.map(goal => renderGoal(goal))}
      </div>
    </div>
  );
};

export default SimpleGoalBreaker;