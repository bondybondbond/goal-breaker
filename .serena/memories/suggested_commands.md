# Suggested Commands

## Development Commands
```bash
npm start          # Start development server (port 3000)
npm run build      # Build for production
npm test           # Run tests
```

## System Commands (Windows)
```cmd
dir                # List directory contents
cd <folder>        # Change directory  
type <file>        # View file contents
findstr <text>     # Search for text in files
git status         # Check git status
git add .          # Stage all changes
git commit -m ""   # Commit changes
git push           # Push to remote
```

## Project Structure Navigation
```bash
# Key directories to know
src/components/GoalBreakdown/    # Main component (~760 lines)
src/utils/                       # Helper functions
src/types/                       # TypeScript definitions
docs/                           # Project documentation
```

## Debugging & Development
```bash
# Check compilation errors
npm start    # Will show errors in terminal/browser

# View key files
src/components/GoalBreakdown/index.tsx  # Main component
src/utils/gridHelpers.ts               # Grid positioning
src/utils/styleHelpers.ts              # Level styling
src/types/goal.types.ts                # Type definitions
```