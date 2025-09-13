import { Goal, Position, GridConfig } from "../types/goal.types";

export const GRID: GridConfig = {
  COLUMN_WIDTH: 400,
  ROW_HEIGHT: 140,
  CARD_WIDTH: 320,
  CARD_HEIGHT: 120,
  MARGIN: 40,
  VERTICAL_GAP: 20
};

// Convert grid coordinates to pixel position
export const gridToPosition = (level: number, row: number, canvasWidth: number): Position => {
  // Right-to-left layout: level 0 (ultimate goal) is on the right, subsequent levels go left
  const x = canvasWidth - GRID.MARGIN - ((level + 1) * GRID.COLUMN_WIDTH);
  const y = GRID.MARGIN + (row * GRID.ROW_HEIGHT);
  
  return {
    x: Math.max(GRID.MARGIN, x),
    y: Math.max(GRID.MARGIN, y)
  };
};

// Convert pixel position to grid coordinates
export const positionToGrid = (position: Position, canvasWidth: number) => {
  const level = Math.max(0, Math.round((canvasWidth - position.x - GRID.CARD_WIDTH - GRID.MARGIN) / GRID.COLUMN_WIDTH));
  const row = Math.max(0, Math.round((position.y - GRID.MARGIN) / GRID.ROW_HEIGHT));
  
  return { level, row };
};

// Get next available row for a level
export const getNextRowForLevel = (level: number, goals: Goal[]): number => {
  const levelGoals = goals.filter(g => g.level === level);
  if (levelGoals.length === 0) return 0;
  
  const occupiedRows = levelGoals.map(g => g.gridRow).sort((a, b) => a - b);
  let nextRow = 0;
  
  for (const row of occupiedRows) {
    if (row === nextRow) {
      nextRow++;
    } else {
      break;
    }
  }
  
  return nextRow;
};

// Calculate position for new goal
export const calculateNewGoalPosition = (
  parentId: number,
  goals: Goal[],
  canvasWidth: number
): { level: number; row: number; position: Position } => {
  const parent = goals.find(g => g.id === parentId);
  if (!parent) throw new Error("Parent goal not found");
  
  const newLevel = parent.level + 1;
  const newRow = getNextRowForLevel(newLevel, goals);
  const newPosition = gridToPosition(newLevel, newRow, canvasWidth);
  
  return {
    level: newLevel,
    row: newRow,
    position: newPosition
  };
};

// Calculate balanced position for child goals relative to their parent
export const calculateChildPosition = (
  parentGoal: Goal,
  siblingGoals: Goal[],
  canvasWidth: number,
  canvasHeight: number
): Position => {
  const newLevel = parentGoal.level + 1;
  const childrenCount = siblingGoals.length + 1; // +1 for the new child
  
  // Position children to the left of parent
  const x = canvasWidth - GRID.MARGIN - ((newLevel + 1) * GRID.COLUMN_WIDTH);
  
  if (childrenCount === 1) {
    // First child: place at parent's vertical position
    return {
      x: Math.max(GRID.MARGIN, x),
      y: Math.max(GRID.MARGIN, parentGoal.position.y)
    };
  }
  
  // For multiple children, create a smart grid system
  // Get all existing sibling Y positions and sort them
  const existingYPositions = siblingGoals
    .map(sibling => sibling.position.y)
    .sort((a, b) => a - b);
  
  // Create a grid of possible positions centered around parent
  const parentCenterY = parentGoal.position.y + (GRID.CARD_HEIGHT / 2);
  const gridSpacing = GRID.ROW_HEIGHT;
  
  // Generate potential positions in both directions from parent
  const potentialPositions: number[] = [];
  
  // Start with parent's position
  potentialPositions.push(parentGoal.position.y);
  
  // Add positions above and below parent alternately
  for (let i = 1; i <= childrenCount + 2; i++) {
    const offsetAbove = parentGoal.position.y - (i * gridSpacing);
    const offsetBelow = parentGoal.position.y + (i * gridSpacing);
    
    // Add above position if within bounds
    if (offsetAbove >= GRID.MARGIN) {
      potentialPositions.push(offsetAbove);
    }
    
    // Add below position if within bounds
    if (offsetBelow + GRID.CARD_HEIGHT <= canvasHeight - GRID.MARGIN) {
      potentialPositions.push(offsetBelow);
    }
  }
  
  // Find the first position that doesn't conflict with existing siblings
  for (const candidateY of potentialPositions) {
    let hasConflict = false;
    
    for (const existingY of existingYPositions) {
      // Check if cards would overlap (with safety margin)
      const minDistance = GRID.CARD_HEIGHT + 20; // 20px safety margin
      if (Math.abs(candidateY - existingY) < minDistance) {
        hasConflict = true;
        break;
      }
    }
    
    if (!hasConflict) {
      return {
        x: Math.max(GRID.MARGIN, x),
        y: Math.max(GRID.MARGIN, candidateY)
      };
    }
  }
  
  // Fallback: if no position found, place at bottom with extra spacing
  const lastExistingY = existingYPositions[existingYPositions.length - 1] || parentGoal.position.y;
  const fallbackY = lastExistingY + GRID.ROW_HEIGHT;
  
  return {
    x: Math.max(GRID.MARGIN, x),
    y: Math.max(GRID.MARGIN, Math.min(fallbackY, canvasHeight - GRID.CARD_HEIGHT - GRID.MARGIN))
  };
};

/**
 * Calculate standardized positions for a complete goal hierarchy
 * This ensures consistent positioning regardless of how goals are created
 * @param goals - Array of goals with hierarchy info
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @returns Goals with standardized positions
 */
export const standardizeGoalPositions = (
  goals: Goal[],
  canvasWidth: number,
  canvasHeight: number
): Goal[] => {
  // Group goals by level
  const levelGroups = new Map<number, Goal[]>();
  goals.forEach(goal => {
    if (!levelGroups.has(goal.level)) {
      levelGroups.set(goal.level, []);
    }
    levelGroups.get(goal.level)!.push(goal);
  });
  
  // Position level 0 (main goal) at center-right of canvas
  const level0Goals = levelGroups.get(0) || [];
  level0Goals.forEach((goal, index) => {
    const centerY = (canvasHeight / 2) - (GRID.CARD_HEIGHT / 2);
    const offsetY = index * GRID.ROW_HEIGHT;
    // Use consistent positioning formula: level 0 is at (0 + 1) * COLUMN_WIDTH from the right
    goal.position = {
      x: canvasWidth - GRID.MARGIN - GRID.COLUMN_WIDTH,
      y: centerY + offsetY
    };
  });
  
  // Position each subsequent level relative to their parents
  for (let level = 1; level <= 3; level++) {
    const levelGoals = levelGroups.get(level) || [];
    
    // Group goals by parent
    const parentGroups = new Map<number, Goal[]>();
    levelGoals.forEach(goal => {
      if (goal.parentId !== null) {
        if (!parentGroups.has(goal.parentId)) {
          parentGroups.set(goal.parentId, []);
        }
        parentGroups.get(goal.parentId)!.push(goal);
      }
    });
    
    // Position each group of siblings
    parentGroups.forEach((siblings, parentId) => {
      const parent = goals.find(g => g.id === parentId);
      if (!parent) return;
      
      const x = canvasWidth - GRID.MARGIN - ((level + 1) * GRID.COLUMN_WIDTH);
      
      // Center siblings around parent
      const siblingCount = siblings.length;
      const totalHeight = siblingCount * GRID.ROW_HEIGHT;
      const startY = parent.position.y + (GRID.CARD_HEIGHT / 2) - (totalHeight / 2);
      
      siblings.forEach((sibling, index) => {
        sibling.position = {
          x: Math.max(GRID.MARGIN, x),
          y: Math.max(GRID.MARGIN, startY + (index * GRID.ROW_HEIGHT))
        };
      });
    });
  }
  
  return goals;
};
