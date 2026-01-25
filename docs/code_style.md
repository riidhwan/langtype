# Code Style Guide

## 1. Naming Conventions

- **Components**: `PascalCase` (e.g., `TypingArea.tsx`, `SubmitButton.tsx`)
- **Functions/Variables**: `camelCase` (e.g., `calculateScore`, `isValid`)
- **Hooks**: `camelCase` prefixed with `use` (e.g., `useTypingEngine`)
- **Constant**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Files/Directories**:
    - Components: `PascalCase` matches component name.
    - Utilities/hooks/etc: `camelCase` or `kebab-case` (be consistent within folder).
    - Next.js Routes: `lower-case` (standard Next.js convention).

## 2. React Best Practices

- **Components**: Use functional components.
    ```tsx
    export function MyComponent({ prop }: Props) {
      return <div>{prop}</div>;
    }
    ```
- **Props Interface**: Define a `Props` interface for each component.
- **Hooks**: Extract complex logic into custom hooks. Keep components focused on presentation.
- **Server vs Client**:
    - Default to Server Components.
    - Add `'use client'` at the top **only** when interactivty (hooks, event listeners) is needed.

## 3. Tailwind CSS

- Use utility classes directly in `className`.
- For complex conditionals, use `cn()` (clsx + tailwind-merge).
    ```tsx
    <div className={cn("p-4 bg-white", isActive && "bg-blue-500")}>
    ```
- Try to keep standard ordering (Layout -> Box Model -> Typography -> Visual). *Consider using the official Tailwind Prettier plugin.*

## 4. TypeScript

- Avoid `any` at all costs. Use `unknown` if type is truly uncertain.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- strict mode is enabled; ensure no implicit any.

## 5. Testing

- **Co-location**: Put unit/component tests next to the file or in a `__tests__` folder.
    - `src/hooks/useEngine.ts` -> `src/hooks/__tests__/useEngine.test.ts`
- **Naming**: `*.test.ts` or `*.test.tsx`.
- **Description**: Use clear `describe` and `it`/`test` blocks.
    ```ts
    describe('calculateScore', () => {
      it('should return 0 for empty input', () => { ... })
    })
    ```

## 6. Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add typing engine hook`
- `fix: correct wpm calculation`
- `style: format code`
- `refactor: move logic to service`
- `docs: update readme`
- `chore: update dependencies`
