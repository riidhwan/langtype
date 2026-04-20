# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Production build for Cloudflare Pages
npm run lint         # ESLint
npm test             # Vitest unit/component tests
npm run test:watch   # Vitest in watch mode
npm run test:coverage # Vitest with v8 coverage
npm run test:e2e     # Playwright E2E tests
npm run cf-typegen   # Regenerate Cloudflare Worker types
```

To run a single test file: `npx vitest run src/hooks/__tests__/useTypingEngine.test.ts`

Deploy: `npx wrangler --cwd dist/ pages deploy`

## Architecture

LangType is a **translation typing app** — users see source text and must type the correct translation. It is built on **TanStack Start** (Vite-based full-stack React) deployed to Cloudflare Pages via Nitro.

### Layer-First Structure

```
src/
├── routes/          # TanStack Router file-based routes (Routing layer)
├── components/      # ui/ (generic), domain/ (business-aware), features/ (composite)
├── hooks/           # Complex logic extracted into custom hooks (Logic layer)
├── services/        # Data access — currently static JSON loading (Data layer)
├── store/           # Zustand global state (currently empty, planned)
├── data/collections/# Static JSON challenge files (loaded via Vite glob)
└── lib/             # Shared utilities (stringUtils, cn helper)
```

### Core Data Flow

Route loader → `challengeService` (Vite `import.meta.glob`) → shuffled challenges passed as props → `TypingGame` component → `useTypingEngine` hook → `stringUtils` for input processing → URL state synced via `useUrlSync`.

### Key Modules to Understand

**`useTypingEngine`** (`src/hooks/useTypingEngine.ts`) — The central game hook. Manages the full status lifecycle: `'typing'` → `'submitted'` (on incorrect) or `'completed'` (on correct) → 5-second countdown → auto-advance to next challenge. Uses `stringUtils` for all input matching logic.

**`stringUtils`** (`src/lib/stringUtils.ts`) — Contains the most complex logic. Key behaviors:
- `parseSentence`: Parses challenge sentences, extracting pre-filled characters (content inside parentheses like `(hint)` is auto-filled for the user)
- `autoMatchSpacing`: Auto-inserts spaces, punctuation, and pre-filled chars so users skip them automatically
- Flexible matching: a submission is accepted even if trailing characters are all auto-insertable (`isFlexibleMatch`)
- Smart case handling: auto-capitalizes first character when appropriate

**`challengeService`** (`src/services/challengeService.ts`) — Loads JSON collections at build time using `import.meta.glob`. No runtime API calls; all data is statically bundled.

**`useUrlSync`** (`src/hooks/useUrlSync.ts`) — Keeps `questionId` in the URL query string, enabling deep-linking and browser back/forward navigation.

### Challenge Data Format

JSON files in `src/data/collections/` define challenge sets. Parentheses in answer strings mark pre-filled hints: `"(The) quick brown fox"` — `"The"` is pre-filled.

## Conventions

**TypeScript**: Strict mode. Use `interface` for object shapes, `type` for unions. Never use `any`.

**Components**: Functional only. Each has a `Props` interface. Use `cn()` (clsx + tailwind-merge) for conditional classNames.

**Hooks**: Extract all non-trivial logic from components into custom hooks.

**Tests**: Co-located in `__tests__/` folders. Use `vi.useFakeTimers()` / `vi.advanceTimersByTime()` for timer-dependent logic. Use `renderHook` from RTL for hook tests.

**Git**: Conventional Commits — `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`.

**Naming**: Components `PascalCase`, hooks/utils `camelCase` prefixed `use`, constants `UPPER_SNAKE_CASE`, route files `lowercase.$param.tsx`.
