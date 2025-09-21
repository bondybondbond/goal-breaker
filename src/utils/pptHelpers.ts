// PowerPoint SmartArt inspired positioning
// Simple, compact, hierarchical layout

interface Goal {
  id: number;
  text: string;
  level: number;
  parentId?: number;
  position: { x: number; y: number };
  completed: boolean;
}

interface CanvasSize {
  width: number;
  height: number;
}

// PPT-style card dimensions (compact)
export const PPT_CARD = {
  WIDTH: 160,
  HEIGHT: 60,
  HORIZONTAL_SPACING: 40,  // Space between siblings
  VERTICAL_SPACING: 80,    // Space between levels
};

export function calculatePPTPositions(
  goals: Goal[], 
  canvasWidth: number, 
  canvasHeight: number, 
  direction: string = 'up-down'
): Goal[] {
  if (goals.length === 0) return [];

  // Create a working copy
  const positionedGoals = goals.map(goal => ({ ...goal }));
  
  // Find the ultimate goal (level 0)
  const ultimateGoal = positionedGoals.find(g => g.level === 0);
  if (!ultimateGoal) return positionedGoals;

  // Start with ultimate goal at center
  ultimateGoal.position = {
    x: (canvasWidth - PPT_CARD.WIDTH) / 2,
    y: 100  // Top area like PPT
  };

  // Position goals level by level (PPT SmartArt style)
  for (let level = 1; level <= Math.max(...goals.map(g => g.level)); level++) {
    const goalsAtLevel = positionedGoals.filter(g => g.level === level);
    
    goalsAtLevel.forEach(goal => {
      const parent = positionedGoals.find(g => g.id === goal.parentId);
      if (!parent) return;

      // Get siblings (same parent, same level)
      const siblings = goalsAtLevel.filter(g => g.parentId === goal.parentId);
      const siblingIndex = siblings.indexOf(goal);
      const siblingCount = siblings.length;

      // Calculate position based on direction
      if (direction === 'up-down') {
        // PPT SmartArt style: children spread horizontally below parent
        const totalWidth = siblingCount * PPT_CARD.WIDTH + (siblingCount - 1) * PPT_CARD.HORIZONTAL_SPACING;
        const startX = parent.position.x + (PPT_CARD.WIDTH - totalWidth) / 2;
        
        goal.position = {
          x: startX + siblingIndex * (PPT_CARD.WIDTH + PPT_CARD.HORIZONTAL_SPACING),
          y: parent.position.y + PPT_CARD.VERTICAL_SPACING
        };
      } else if (direction === 'left-right') {
        // Horizontal flow: children to the right, centered vertically
        const totalHeight = siblingCount * PPT_CARD.HEIGHT + (siblingCount - 1) * 20;
        const startY = parent.position.y + (PPT_CARD.HEIGHT - totalHeight) / 2;
        
        goal.position = {
          x: parent.position.x + PPT_CARD.WIDTH + PPT_CARD.HORIZONTAL_SPACING,
          y: startY + siblingIndex * (PPT_CARD.HEIGHT + 20)
        };
      } else { // right-left
        // Horizontal flow: children to the left, centered vertically
        const totalHeight = siblingCount * PPT_CARD.HEIGHT + (siblingCount - 1) * 20;
        const startY = parent.position.y + (PPT_CARD.HEIGHT - totalHeight) / 2;
        
        goal.position = {
          x: parent.position.x - PPT_CARD.WIDTH - PPT_CARD.HORIZONTAL_SPACING,
          y: startY + siblingIndex * (PPT_CARD.HEIGHT + 20)
        };
      }
    });
  }

  return positionedGoals;
}

// Simple utility to find goal by ID
export function findGoalById(goals: Goal[], id: number): Goal | undefined {
  return goals.find(g => g.id === id);
}

// Get children of a goal
export function getChildren(goals: Goal[], parentId: number): Goal[] {
  return goals.filter(g => g.parentId === parentId);
}