# Quick Reference Guide
**For AI Context Switching - Essential Info**

## 📁 File Structure (Key Files Only)
```
src/
├── App.tsx                           # Entry point (12 lines)
├── components/
│   ├── GoalBreakdown/
│   │   └── index.tsx                 # Main component (~780 lines)
│   ├── CanvasManager.tsx             # Canvas logic (220 lines) 🆕
│   ├── GoalCard.tsx                  # Goal card component (290 lines)
│   ├── ImportExport.tsx              # Import/export (180 lines)
│   ├── ListView.tsx                  # List view (155 lines)
│   ├── AppNavigation.tsx             # Header/navigation (174 lines)
│   └── ConnectionLines.tsx           # SVG line renderer (180 lines)
├── types/goal.types.ts               # TypeScript interfaces
└── docs/                             # This tracking system
```

## ⚡ Quick Commands
```bash
# Dev server
cd C:\apps\goal-breaker && npm start

# Kill existing Node processes  
Get-Process -Name "*node*" | Stop-Process -Force

# Key file locations for editing
# Main: src/components/GoalBreakdown/index.tsx
# Types: src/types/goal.types.ts
```

## 🐛 Current Debugging (Ultimate Goal Text Bug)
```javascript
// DEBUGGING LOGS ADDED (9/20/2025):
// GoalBreakdown/index.tsx - Line ~234
startEditing() - Logs goal ID, state before/after, isEditing status

// GoalCard.tsx - Line ~39
Component render - Logs ID, level, isEditing on each render

// GoalCard.tsx - Line ~339
Text onClick - Logs click event, goal info, handler calls

// Expected console flow when clicking ultimate goal text:
// 1. 📱 Text clicked! Goal ID: [id]
// 2. 🔥 startEditing called for goal ID: [id]
// 3. 🔥 Goal to edit now has isEditing: true
// 4. 🎯 GoalCard rendering - isEditing: true
```

## 🎯 Core Functions to Find Quickly
```typescript
// MAIN COMPONENT (GoalBreakdown/index.tsx):
- addSubGoal()                   # Goal creation logic
- addSiblingGoal()              # Sibling task creation  
- getVisibleGoals()             # Filtering/focus logic
- toggleComplete()              # Task completion

// CANVAS MANAGER (CanvasManager.tsx):
- handleGoalDragStart()         # Drag initiation
- handleCanvasMouseMove()       # Canvas pan + drag
- handleCanvasMouseDown()       # Event handling

// GOAL CARD (GoalCard.tsx):
- GoalCard component            # Individual goal rendering
- handleMouseDown()             # Card interaction logic

// GRID HELPERS (utils/gridHelpers.ts):
- gridToPosition()              # Grid positioning
- calculateCascadingSlots()     # Layout algorithm
```

## 🔍 Common Search Patterns
```bash
# Find functions quickly
search_code pattern:"handleGoalDragStart"
search_code pattern:"const GoalCard"
search_code pattern:"useEffect"

# Find state management
search_code pattern:"useState"
search_code pattern:"setGoals"
search_code pattern:"setDraggedGoal"
```

## 📊 Key State Variables
```typescript
// MAIN COMPONENT (GoalBreakdown):
goals: Goal[]                  # All goal data
connections: Connection[]      # SVG line data  
focusedGoal: number | null     # Focus mode filter
hiddenLevels: Set<number>      # Level visibility
selectedGoal: number | null    # Selected card
canvasState: {spacePressed, isPanning} # Canvas state from CanvasManager

// CANVAS MANAGER:
canvasOffset: {x, y}          # Canvas pan position
draggedGoal: Goal | null      # Currently dragged goal
dragPreviewPosition: {x, y}   # Smooth drag preview
isPanning: boolean            # Panning state
spacePressed: boolean         # Spacebar state
```

## 🎨 Grid System Constants
```typescript
GRID = {
  COLUMN_WIDTH: 400,    # Horizontal spacing
  ROW_HEIGHT: 140,      # Vertical spacing  
  CARD_WIDTH: 320,      # Goal card width
  CARD_HEIGHT: 120,     # Goal card height
  MARGIN: 40            # Canvas margins
}
```

## 🚀 Development Workflow
1. **Read AI_PROJECT_STATE.md** - Get current status
2. **Check FEATURE_MOSCOW.md** - See priorities  
3. **Use search_code** - Find specific functions
4. **Edit targeted blocks** - Max 30 lines per edit
5. **Update tracking files** - Keep context current

## 🐛 Common Issues & Solutions
- **Drag not working**: Check CanvasManager.tsx handleGoalDragStart()
- **Canvas panning issues**: Check CanvasManager.tsx event handlers
- **Goals not connecting**: Check connections useEffect in main component  
- **Performance lag**: Look at getVisibleGoals filtering in main component
- **Helper text missing**: Check canvasState communication between components
- **Card overlaps**: Check positioning functions in utils/gridHelpers.ts
