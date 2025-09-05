# Code Style & Conventions

## TypeScript Usage
- All files use `.tsx` extension for React components
- Strict TypeScript with interface definitions in `src/types/`
- Type imports from local types folder

## React Patterns
- Functional components with hooks (useState, useRef, useEffect)
- Component naming: PascalCase for components, camelCase for functions
- State management: React hooks (no external state library yet)

## Code Organization
- **Components**: Individual components in own folders
- **Utils**: Helper functions separated by purpose (grid, style)
- **Types**: Centralized TypeScript definitions
- **Single responsibility**: Each utility file focused on specific domain

## Naming Conventions
- **Files**: camelCase for utilities, PascalCase for components
- **Functions**: camelCase (e.g., `getNextRowForLevel`, `gridToPosition`)
- **Components**: PascalCase (e.g., `GoalBreaker`, `ConnectionLines`)
- **CSS Classes**: Tailwind utility classes only

## Import/Export Style
- Named exports preferred over default exports for utilities
- Destructured imports where possible
- Absolute imports from src root

## Comments & Documentation
- Functional comments above complex logic
- TypeScript interfaces serve as primary documentation
- README files in docs/ folder for architectural decisions