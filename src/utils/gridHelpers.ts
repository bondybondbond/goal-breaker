import { Goal, Position, GridConfig } from "../types/goal.types";

export const GRID: GridConfig = {
  COLUMN_WIDTH: 400,
  ROW_HEIGHT: 200,  // Back to original compact spacing
  CARD_WIDTH: 280,  // Narrower cards for better space efficiency  
  CARD_HEIGHT: 120,
  MARGIN: 60,       
  VERTICAL_GAP: 40  // Back to original spacing
};

// Convert grid coordinates to pixel position
export const gridToPosition = (level: number, row: number, canvasWidth: number, direction: string = 'right-left'): Position => {
  let x: number;
  let y: number;
  
  if (direction === 'up-down') {
    // Top-down layout: ultimate goal at top center, subsequent levels go down
    x = (canvasWidth - GRID.CARD_WIDTH) / 2; // Center horizontally for all levels
    y = GRID.MARGIN + (level * GRID.ROW_HEIGHT);
  } else if (direction === 'left-right') {
    // Left-to-right layout: level 0 (ultimate goal) is on the left, subsequent levels go right
    x = GRID.MARGIN + (level * GRID.COLUMN_WIDTH);
    y = GRID.MARGIN + (row * GRID.ROW_HEIGHT);
  } else {
    // Right-to-left layout: level 0 (ultimate goal) is on the right, subsequent levels go left
    x = canvasWidth - GRID.MARGIN - ((level + 1) * GRID.COLUMN_WIDTH);
    y = GRID.MARGIN + (row * GRID.ROW_HEIGHT);
  }
  
  return {
    x: Math.max(GRID.MARGIN, x),
    y: Math.max(GRID.MARGIN, y)
  };
};

// Convert pixel position to grid coordinates
export const positionToGrid = (position: Position, canvasWidth: number, direction: string = 'right-left') => {
  let level: number;
  
  if (direction === 'up-down') {
    // Top-down: calculate level from top edge
    level = Math.max(0, Math.round((position.y - GRID.MARGIN) / GRID.ROW_HEIGHT));
  } else if (direction === 'left-right') {
    // Left-to-right: calculate level from left edge
    level = Math.max(0, Math.round((position.x - GRID.MARGIN) / GRID.COLUMN_WIDTH));
  } else {
    // Right-to-left: calculate level from right edge (original logic)
    level = Math.max(0, Math.round((canvasWidth - position.x - GRID.CARD_WIDTH - GRID.MARGIN) / GRID.COLUMN_WIDTH));
  }
  
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
  canvasWidth: number,
  direction: string = 'right-left'
): { level: number; row: number; position: Position } => {
  const parent = goals.find(g => g.id === parentId);
  if (!parent) throw new Error("Parent goal not found");
  
  const newLevel = parent.level + 1;
  const newRow = getNextRowForLevel(newLevel, goals);
  const newPosition = gridToPosition(newLevel, newRow, canvasWidth, direction);
  
  return {
    level: newLevel,
    row: newRow,
    position: newPosition
  };
};;

// Calculate balanced position for child goals relative to their parent (like Mermaid Live)
export const calculateChildPosition = (
  parentGoal: Goal,
  siblingGoals: Goal[],
  canvasWidth: number,
  canvasHeight: number,
  direction: string = 'right-left'
): Position => {
  const newLevel = parentGoal.level + 1;
  const childrenCount = siblingGoals.length + 1; // +1 for the new child
  const spacing = GRID.CARD_HEIGHT + GRID.VERTICAL_GAP; // Vertical spacing between siblings
  
  // Calculate X position based on direction
  let x: number;
  if (direction === 'up-down') {
    // Top-down: children stay at parent's X position (will be distributed horizontally later)
    x = parentGoal.position.x;
  } else if (direction === 'left-right') {
    // Left-to-right: children go to the right
    x = GRID.MARGIN + (newLevel * GRID.COLUMN_WIDTH);
  } else {
    // Right-to-left: children go to the left
    x = canvasWidth - GRID.MARGIN - ((newLevel + 1) * GRID.COLUMN_WIDTH);
  }
  
  // Calculate Y position - this is where the intelligent distribution happens
  let y: number;
  
  if (direction === 'up-down') {
    // Top-down: position below parent
    y = parentGoal.position.y + GRID.ROW_HEIGHT;
  } else {
    // Horizontal layouts: distribute children vertically around parent
    if (childrenCount === 1) {
      // First child: place at same level as parent
      y = parentGoal.position.y;
    } else if (childrenCount === 2) {
      // Two children: one above, one below parent (balanced)
      const parentCenterY = parentGoal.position.y + (GRID.CARD_HEIGHT / 2);
      const offset = spacing / 2;
      
      if (siblingGoals.length === 0) {
        // This is the first child - place it above parent
        y = parentCenterY - offset - (GRID.CARD_HEIGHT / 2);
      } else {
        // This is the second child - place it below parent
        y = parentCenterY + offset - (GRID.CARD_HEIGHT / 2);
      }
    } else {
      // Three or more children: distribute evenly around parent
      const parentCenterY = parentGoal.position.y + (GRID.CARD_HEIGHT / 2);
      const totalHeight = (childrenCount - 1) * spacing;
      const startY = parentCenterY - (totalHeight / 2) - (GRID.CARD_HEIGHT / 2);
      
      // Position this new child at the next available slot
      y = startY + (siblingGoals.length * spacing);
    }
  }
  
  return {
    x: Math.max(GRID.MARGIN, x),
    y: Math.max(GRID.MARGIN, y)
  };
};;

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
  canvasHeight: number,
  direction: string = 'right-left'
): Goal[] => {
  // Group goals by level
  const levelGroups = new Map<number, Goal[]>();
  goals.forEach(goal => {
    if (!levelGroups.has(goal.level)) {
      levelGroups.set(goal.level, []);
    }
    levelGroups.get(goal.level)!.push(goal);
  });
  
  // Position level 0 (main goal) based on direction
  const level0Goals = levelGroups.get(0) || [];
  level0Goals.forEach((goal, index) => {
    let x: number;
    let y: number;
    
    if (direction === 'up-down') {
      // Position main goal at top center of canvas
      x = (canvasWidth - GRID.CARD_WIDTH) / 2;
      y = GRID.MARGIN + (index * GRID.ROW_HEIGHT);
    } else {
      // Horizontal layouts
      const centerY = (canvasHeight / 2) - (GRID.CARD_HEIGHT / 2);
      const offsetY = index * GRID.ROW_HEIGHT;
      
      if (direction === 'left-right') {
        // Position main goal at center-left of canvas
        x = GRID.MARGIN;
      } else {
        // Position main goal at center-right of canvas (original logic)
        x = canvasWidth - GRID.MARGIN - GRID.COLUMN_WIDTH;
      }
      y = centerY + offsetY;
    }
    
    goal.position = {
      x: x,
      y: y
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
      
      if (direction === 'up-down') {
        // Top-down: position children below parent
        const siblingCount = siblings.length;
        const y = parent.position.y + GRID.ROW_HEIGHT;
        
        if (siblingCount === 1) {
          // Single child: position directly below parent
          siblings[0].position = {
            x: parent.position.x,
            y: Math.max(GRID.MARGIN, y)
          };
        } else {
          // Multiple children: distribute horizontally around parent's center
          const parentCenterX = parent.position.x + (GRID.CARD_WIDTH / 2);
          const totalWidth = siblingCount * GRID.CARD_WIDTH + (siblingCount - 1) * GRID.VERTICAL_GAP;
          const startX = parentCenterX - (totalWidth / 2);
          
          siblings.forEach((sibling, index) => {
            sibling.position = {
              x: Math.max(GRID.MARGIN, startX + (index * (GRID.CARD_WIDTH + GRID.VERTICAL_GAP))),
              y: Math.max(GRID.MARGIN, y)
            };
          });
        }
      } else {
        // Horizontal layouts
        let x: number;
        if (direction === 'left-right') {
          // Position children to the right of parent
          x = GRID.MARGIN + (level * GRID.COLUMN_WIDTH);
        } else {
          // Position children to the left of parent (original logic)
          x = canvasWidth - GRID.MARGIN - ((level + 1) * GRID.COLUMN_WIDTH);
        }
        
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
      }
    });
  }
  
  return goals;
};;


/**
 * Calculate positions using cascading slot system
 * Lower levels (deeper in hierarchy) take priority and determine spacing
 * Each level "stretches" the levels above it
 */
export const calculateCascadingSlots = (
  goals: Goal[],
  canvasWidth: number,
  canvasHeight: number,
  direction: string = 'right-left'
): Goal[] => {
  console.log('🎯 Starting cascading slot calculation...');
  
  // Group goals by level
  const levelGroups = new Map<number, Goal[]>();
  goals.forEach(goal => {
    if (!levelGroups.has(goal.level)) {
      levelGroups.set(goal.level, []);
    }
    levelGroups.get(goal.level)!.push(goal);
  });
  
  // Find the deepest level (highest number)
  const maxLevel = Math.max(...goals.map(g => g.level));
  console.log(`📊 Found ${maxLevel + 1} levels (0 to ${maxLevel})`);
  
  // STEP 1: Calculate slot requirements from deepest level upward
  const slotSpacing = new Map<number, number>();
  
  // Base slot spacing (minimum gap between cards)
  const BASE_SLOT_GAP = GRID.VERTICAL_GAP; // 40px minimum gap
  const CARD_SLOT_SIZE = GRID.CARD_HEIGHT + BASE_SLOT_GAP; // 160px per slot
  
  // Start from deepest level and work upward
  for (let level = maxLevel; level >= 0; level--) {
    const goalsAtLevel = levelGroups.get(level) || [];
    console.log(`🔧 Level ${level}: ${goalsAtLevel.length} goals`);
    
    if (level === maxLevel) {
      // Deepest level: use base spacing
      slotSpacing.set(level, CARD_SLOT_SIZE);
      console.log(`  ✅ Base spacing: ${CARD_SLOT_SIZE}px`);
    } else {
      // Higher levels: calculate based on children's needs (RESTORE cascading)
      let maxChildSpacing = CARD_SLOT_SIZE; // minimum spacing
      
      goalsAtLevel.forEach(parentGoal => {
        const children = goals.filter(g => g.parentId === parentGoal.id);
        if (children.length > 0) {
          const childLevel = level + 1;
          const childSpacing = slotSpacing.get(childLevel) || CARD_SLOT_SIZE;
          const requiredSpacing = children.length * childSpacing;
          maxChildSpacing = Math.max(maxChildSpacing, requiredSpacing);
        }
      });
      
      slotSpacing.set(level, maxChildSpacing);
      console.log(`  ✅ Calculated spacing: ${maxChildSpacing}px (based on children)`);
    }
  }
  
  console.log('📐 Slot spacing calculated:', slotSpacing);
  
  // STEP 2: Position goals using calculated slot spacing
  const positionedGoals = [...goals];
  
  // Position Level 0 (main goal) first
  const level0Goals = levelGroups.get(0) || [];
  level0Goals.forEach((goal, index) => {
    if (direction === 'up-down') {
      goal.position = {
        x: (canvasWidth - GRID.CARD_WIDTH) / 2,
        y: GRID.MARGIN + (index * slotSpacing.get(0)!)
      };
    } else if (direction === 'left-right') {
      goal.position = {
        x: GRID.MARGIN,
        y: GRID.MARGIN + (index * slotSpacing.get(0)!)
      };
    } else if (direction === 'right-left') {
      goal.position = {
        x: canvasWidth - GRID.MARGIN - GRID.CARD_WIDTH,
        y: GRID.MARGIN + (index * slotSpacing.get(0)!)
      };
    }
  });
  
  // Position each subsequent level using their calculated slot spacing
  for (let level = 1; level <= maxLevel; level++) {
    const levelGoals = levelGroups.get(level) || [];
    const levelSpacing = slotSpacing.get(level) || CARD_SLOT_SIZE;
    
    if (direction === 'up-down') {
      // TOP-DOWN MODE: Group by parent (like horizontal modes) to maintain hierarchy
      const y = GRID.MARGIN + (level * GRID.ROW_HEIGHT);
      
      // Group by parent (same as horizontal modes)
      const parentGroups = new Map<number, Goal[]>();
      levelGoals.forEach(goal => {
        if (goal.parentId !== null) {
          if (!parentGroups.has(goal.parentId)) {
            parentGroups.set(goal.parentId, []);
          }
          parentGroups.get(goal.parentId)!.push(goal);
        }
      });
      
      // Sequential parent positioning: position parent groups left-to-right
      let currentGroupX = GRID.MARGIN; // Start from left edge
      const GROUP_GAP = 120; // Gap between parent groups
      const CHILD_GAP = 80; // Gap between children within a group
      
      parentGroups.forEach((siblings, parentId) => {
        const parent = positionedGoals.find(g => g.id === parentId);
        if (!parent) return;
        
        // Calculate width needed for this parent group (parent + all children)
        const totalCards = 1 + siblings.length; // parent + children
        const totalGaps = Math.max(0, totalCards - 1); // gaps between cards
        const groupWidth = totalCards * GRID.CARD_WIDTH + totalGaps * CHILD_GAP;
        
        // Position parent at start of group
        parent.position = {
          x: currentGroupX,
          y: parent.position.y // Keep parent's original Y
        };
        
        // Position children after parent
        siblings.forEach((sibling, index) => {
          sibling.position = {
            x: currentGroupX + ((index + 1) * (GRID.CARD_WIDTH + CHILD_GAP)), // +1 to skip parent position
            y: y
          };
        });
        
        // Move to next group position
        currentGroupX += groupWidth + GROUP_GAP;
      });
    } else {
      // HORIZONTAL MODES: Group by parent (original logic)
      const parentGroups = new Map<number, Goal[]>();
      levelGoals.forEach(goal => {
        if (goal.parentId !== null) {
          if (!parentGroups.has(goal.parentId)) {
            parentGroups.set(goal.parentId, []);
          }
          parentGroups.get(goal.parentId)!.push(goal);
        }
      });
      
      // Position each group of siblings using cascading slots (prevents overlaps)
      parentGroups.forEach((siblings, parentId) => {
        const parent = positionedGoals.find(g => g.id === parentId);
        if (!parent) return;
        
        siblings.forEach((sibling, index) => {
          let x: number;
          let y: number;
          
          if (direction === 'left-right') {
            // Left-right: use pure slot spacing from parent position
            x = GRID.MARGIN + (level * GRID.COLUMN_WIDTH);
            y = parent.position.y + (index * levelSpacing);
          } else {
            // Right-left: use pure slot spacing from parent position
            x = canvasWidth - GRID.MARGIN - ((level + 1) * GRID.COLUMN_WIDTH);
            y = parent.position.y + (index * levelSpacing);
          }
          
          sibling.position = {
            x: Math.max(GRID.MARGIN, x),
            y: Math.max(GRID.MARGIN, y)
          };
        });
      });
    }
  }
  
  console.log('🎯 Slot positioning complete!', slotSpacing);
  return positionedGoals;
};
