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
├── store/           # Zustand global state — SRS cards + play history, persisted to IndexedDB
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

### Zustand Store (`src/store/useSRSStore.ts`)

Persisted to IndexedDB via `idb-keyval` under the key `langtype-srs-v1`. Only `cards` and `lastPlayedAt` are persisted; `_hasHydrated` is runtime-only.

| Field | Type | Purpose |
|---|---|---|
| `cards` | `Record<"colId:chalId", SRSCard>` | Per-card SRS state, keyed `collectionId:challengeId` |
| `lastPlayedAt` | `Record<colId, ms>` | Timestamp of last play per collection, used for home-page sort |
| `_hasHydrated` | `boolean` | Set to `true` after IndexedDB rehydration; gates sort order and due counts to prevent flicker |

**`SRSCard` fields**: `interval` (days), `repetitions` (consecutive correct), `easeFactor` (starts 2.5, min 1.3), `nextReviewAt` (ms; 0 = new card), `lastReviewedAt` (ms; 0 = never reviewed).

Storage uses `skipHydration: true` — the route must call `useSRSStore.persist.rehydrate()` manually (done in `__root.tsx`).

### Challenge Data Format

`Challenge` type: `id` (required), `translation` (required), `original` (optional — when absent no source sentence is shown to the user). `Collection.challenges` is also optional (loaded separately when needed).

JSON files in `src/data/collections/` define challenge sets. Parentheses in answer strings mark pre-filled hints: `"(The) quick brown fox"` — `"The"` is pre-filled.

Raw source CSVs live in `src/data/collections/raw/` (gitignored). Generation scripts are in `scripts/` (gitignored). Only the final JSON files are committed.

## Product Behaviour

This section must be kept up to date whenever product behaviour changes. If you add, remove, or change a user-facing flow, update this section as part of the same task.

### Theme toggle

A fixed button (bottom-right, visible on every page) switches between `warm` (light) and `ink` (dark). Shows a moon icon in light mode and a sun icon in dark mode. The chosen theme is persisted in `localStorage` under key `lt_theme`. The inline script in `RootDocument` (`__root.tsx`) reads this key before hydration to prevent FOUC; React state in `RootComponent` syncs from `localStorage` on mount and writes back on toggle. Default is `warm`.

### Home page (`/`)

Collections are sorted by most-recently-played (`lastPlayedAt` in Zustand). A search input filters by title/description; "Due (N)" tab narrows to collections with at least one card due. Skeleton rows are shown until the SRS store hydrates (`_hasHydrated`) to prevent sort-order flicker. Tag pills appear below the All/Due tabs when any collection has a `tags` field. Clicking a tag (single-select) filters to collections containing that tag; clicking the active tag deselects it. Tag, All/Due, and search filters are ANDed. Collections without a `tags` field are visible when no tag is active and hidden when a tag is active.

### Collection page (`/collections/$id`)

All state lives in URL search params. The page renders one of four views depending on `?mode` and `?view`:

| URL params | Renders |
|---|---|
| _(none)_ | `ModePicker` — choose Practice All or SRS |
| `?view=progress` | `SRSProgressView` — per-card due/new/upcoming breakdown |
| `?mode=normal` | `TypingGame` — all cards shuffled, no SRS recording |
| `?mode=srs` | `TypingGame` — only due cards, full SRS flow (see below) |

Back button always navigates to `?` (clears params) → ModePicker. Retry state is reset via a `useEffect` watching `mode`, not before `navigate()`, to avoid a transient render where `mode=srs` + `retryCount=0` would flash the all-done screen.

### SRS session flow

```
[ModePicker] → startSRS() → mode=srs
    ↓
[TypingGame] — due cards only, shuffled
  • correct answer → 7 interval pills shown, timer paused
      → user picks interval (or presses 1–7) → recordReviewWithInterval()
      → ASAP (0 days) → passed=false; all others → passed=true
  • wrong answer   → recordReview('incorrect'), nextReviewAt=now → passed=false
  • onCardResult(id, passed) — route accumulates passed=false IDs in pendingMissedIds ref
    ↓
[handleFinished — last card done]
  if pendingMissedIds.length > 0:
    → setMissedIds, retryCount++ → challenges recomputes → TypingGame re-mounts (isRetry=true)
  else:
    → goToPicker()
    ↓
[Retry phase — isRetry=true in srsContext]
  Same TypingGame flow; "X cards remaining" shows "Reviewing X missed cards"
  handleFinished again → if still misses → another retry; else → goToPicker()
    ↓
[SRSAllDoneScreen — shown when mode=srs but challenges.length===0]
  Reached if: 0 cards due at session start, OR navigating back during session.
```

### SRS algorithm summary (`src/lib/srsAlgorithm.ts`)

- **`computeReview(card, grade)`** — SM-2: `incorrect` resets reps + EF−0.2, interval=0, nextReviewAt=now; `hard` EF−0.1, shorter interval; `correct` EF+0.1, longer interval.
- **`computeReviewFromInterval(card, intervalDays)`** — bypasses SM-2; sets nextReviewAt directly and nudges EF/reps by magnitude (ASAP→−0.2/reset, 1w→+0.15/+1 rep).
- **`isCardDue(card)`** — true if `nextReviewAt === 0` (new) or `nextReviewAt <= now`.

### SRS Progress view

Cards are bucketed into three groups: **due** (`isCardDue` = true and `lastReviewedAt > 0`), **new** (`lastReviewedAt === 0`), **upcoming** (not due, sorted by `nextReviewAt` ascending). Time until review is formatted by `formatTimeUntil()` in `SRSProgressView.tsx`.

### Normal mode

All collection challenges shuffled. `TypingGame` receives no `srsContext` — no SRS recording, no interval pills, no retry phase. Timer auto-advances after correct (5s) or incorrect (5s) answer.

### TypingGame internals

- Status lifecycle: `typing` → `completed` (correct) or `submitted` (incorrect) → auto-advance (or wait for pill in SRS mode)
- In SRS mode, correct answer pauses the timer (`setIsPaused(true)`) until a pill is selected, then restarts with a 2-second countdown.
- Recording fires exactly once per card via `hasRecordedRef` (reset on `status=typing`), triggered when `timeLeft === 0`.
- `cardsCompleted` (route state) drives the "X cards remaining" counter — derived from a stable counter, not `currentIndex`, to prevent flicker on refresh.

## Design System

All styling uses CSS custom-property themes defined in `src/globals.css`. **Do not use hard-coded colours or Tailwind colour utilities like `text-green-600` — use theme variables instead.**

### Theme tokens (available in every theme: warm / slate / ink)

| Variable | Use |
|---|---|
| `var(--bg)` / `bg-background` | Page background |
| `var(--bg2)` / `bg-card` | Card / input background |
| `var(--bg3)` | Hover tint on cards |
| `var(--fg)` / `text-foreground` | Primary text |
| `var(--fg-muted)` / `text-muted-foreground` | Secondary / hint text |
| `var(--border)` / `border-border` | Default border |
| `var(--border2)` | Stronger border (keycap bottom edge) |
| `var(--accent)` / `text-primary` / `bg-primary` | Brand colour |
| `var(--accent-dim)` | Tinted accent background |
| `var(--accent-fg)` / `text-primary-foreground` | Text on accent bg |
| `var(--correct)` / `var(--correct-bg)` | Success state |
| `var(--incorrect)` / `var(--incorrect-bg)` | Error state |
| `var(--radius)` | Default border radius |
| `var(--radius-sm)` | Small border radius (pills, keycaps) |

### Utility classes (defined in `globals.css`, not Tailwind)

- `.mono-label` — JetBrains Mono 11px uppercase, used for section headings and counters
- `.key-hint` — keycap-style badge for keyboard shortcut hints (e.g. `<kbd className="key-hint">enter</kbd>`)

### Typography rules

| Use case | Classes |
|---|---|
| Section label / heading | `mono-label` |
| Page / collection title | `text-2xl font-bold` or `text-3xl font-bold` |
| Card title | `text-[15px] font-semibold` |
| Body text | default (DM Sans via `body`) |
| Monospace data (counts, badges, code) | `font-mono text-[11px]` or `font-mono text-[13px]` |
| Sentence to translate | `text-2xl md:text-3xl font-semibold` |
| Character input slots | `font-mono text-lg md:text-xl` |

### Page layout pattern

```tsx
<main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
    <div className="w-full max-w-2xl"> {/* or max-w-4xl for list pages */}
        {/* content */}
    </div>
</main>
```

### Card / list row pattern

Vertical list: single bordered container with dividers — `divide-y divide-border border rounded-[var(--radius)] bg-card overflow-hidden`. Each row: `hover:bg-[var(--bg3)] transition-colors`.

Card grid (if needed): `border rounded-[var(--radius)] bg-card hover:border-primary transition-colors`.

### Icons

Use `IconSearch` and `IconChevronRight` from `src/components/ui/icons.tsx`. No icon library is installed — add new icons to that file as inline SVGs.

### Feedback states

- Correct: `text-[var(--correct)]` with `font-mono text-[13px]`
- Incorrect: box with `bg-[var(--incorrect-bg)] border border-[var(--incorrect)] rounded-[var(--radius)]`

## Conventions

**TypeScript**: Strict mode. Use `interface` for object shapes, `type` for unions. Never use `any`.

**Components**: Functional only. Each has a `Props` interface. Use `cn()` (clsx + tailwind-merge) for conditional classNames.

**Hooks**: Extract all non-trivial logic from components into custom hooks.

**Tests**: Co-located in `__tests__/` folders. Use `vi.useFakeTimers()` / `vi.advanceTimersByTime()` for timer-dependent logic. Use `renderHook` from RTL for hook tests. Write tests before or alongside implementation — do not consider a task complete until `npm run test:coverage` has been run and any meaningful gaps addressed. Mock patterns: use `vi.hoisted()` for mock values referenced inside `vi.mock()` factories; wrap real module functions in `vi.fn()` when per-test overrides are needed (`vi.mock('@/lib/foo', async (orig) => { const a = await orig(); return { ...a, fn: vi.fn(a.fn) } })`).

**After every implementation, always consider whether tests are needed — do not wait for the user to ask.** Write tests when the new code has non-obvious threshold values, branching logic, or derived state that could silently regress (e.g. slot-size tiers keyed on word length, tag filter predicates). If unsure, ask.

**Route component tests** — export the component from the route file (e.g. `export function Home()`), then render it directly. Standard mock setup:

```typescript
// 1. Mock loader data
const mockUseLoaderData = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    return {
        ...actual,
        Link: ({ children, className }: any) => <div className={className}>{children}</div>,
        createFileRoute: () => () => ({ useLoaderData: mockUseLoaderData }),
        // add useSearch / useNavigate only if the route uses them
    }
})

// 2. Mock Zustand store with hoisted mutable state (reset fields in beforeEach)
const mockSRSState = vi.hoisted(() => ({
    cards: {} as Record<string, any>,
    _hasHydrated: true,
    lastPlayedAt: {} as Record<string, number>,
}))
vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: (selector: (s: any) => any) => selector(mockSRSState),
}))

// 3. In beforeEach: mockUseLoaderData.mockReturnValue({ ... }) + reset mockSRSState fields
```

See `src/routes/__tests__/index.test.tsx` and `src/routes/__tests__/collections.$id.test.tsx` for complete examples.

**Bug fixes must include a regression test.** After fixing a bug, always add a test that would have caught it. The test documents the invariant and prevents the same issue from silently reappearing through future refactors.

**Git**: Conventional Commits — `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`. Never run `git commit` or `git push` unless explicitly asked — always wait for the user to request it.

**Naming**: Components `PascalCase`, hooks/utils `camelCase` prefixed `use`, constants `UPPER_SNAKE_CASE`, route files `lowercase.$param.tsx`.
