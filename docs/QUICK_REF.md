# Quick Reference Guide
**For AI Context Switching - Essential Info**

## 📁 File Structure (Key Files Only)
```
src/
├── App.tsx                           # Entry point (12 lines)
├── components/
│   ├── GoalBreakdown/
│   │   └── index.tsx                 # Main component (~760 lines)
│   └── ConnectionLines.tsx           # SVG line renderer (2 lines)
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

## 🎯 Core Functions to Find Quickly
```typescript
// In GoalBreakdown/index.tsx - Search for these:
- handleGoalDragStart()        # Line ~280 - Drag initiation
- handleCanvasMouseMove()      # Line ~250 - Canvas pan + drag  
- GoalCard()                   # Line ~350 - Goal card component
- getVisibleGoals()            # Line ~180 - Filtering logic
- gridToPosition()             # Line ~80 - Grid positioning
- addSubGoal()                 # Line ~100 - Create sub-tasks
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
// Main state in GoalBreakdown component:
goals: Goal[]                  # All goal data
draggedGoal: Goal | null       # Currently dragged goal
canvasOffset: {x, y}          # Canvas pan position
connections: Connection[]      # SVG line data
focusedGoal: number | null     # Focus mode filter
hiddenLevels: Set<number>      # Level visibility
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
- **Drag not working**: Check global mouse listeners (line ~300)
- **Canvas off-center**: Check canvasOffset initialization (line ~50)
- **Goals not connecting**: Check connections useEffect (line ~330)
- **Performance lag**: Look at getVisibleGoals filtering (line ~180)
