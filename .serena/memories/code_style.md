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

## UI/UX Standards

### Keyboard Key Styling ⌨️
**STANDARD PRACTICE**: Always use styled keyboard keys for any UI text that references keyboard inputs.

- **Use**: `<kbd className="kbd">Enter</kbd>` 
- **Not**: `<strong>Enter</strong>` or plain text
- **Applied to**: All helper texts, tooltips, and documentation that mention keys
- **Styling**: Defined in `src/index.css` with professional key appearance (shadow, border, monospace font)

### Helper Text Icons 🎯
**STANDARD PRACTICE**: Use contextual icons for helper text clarity and visual hierarchy.

- **Keyboard shortcuts**: ⌨️ for all keyboard-related actions
- **Panning/Navigation**: ⌨️ for keyboard + 🖱️ for mouse actions (inline with text)
- **Mixed interactions**: Separate icons per input method for clarity

**Examples of correct usage:**
- `⌨️ Press <kbd className="kbd">Enter</kbd> to save, <kbd className="kbd">Esc</kbd> to cancel`
- `⌨️ <kbd className="kbd">Tab</kbd> = new child`
- `⌨️ Hold <kbd className="kbd">Spacebar</kbd> or 🖱️ <kbd className="kbd">Middle mouse button</kbd> + drag to pan`

**Rationale**: 
- Provides consistent, professional appearance and better visual hierarchy
- Icons help users quickly identify the type of interaction (keyboard vs mouse)
- Inline icons create clearer associations between input method and action