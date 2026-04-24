# Architecture

LangType is a **translation typing app** — users see source text and must type the correct translation. Built on **TanStack Start** (Vite-based full-stack React), deployed to Cloudflare Pages via Nitro.

## Layer-First Structure

```
src/
├── routes/           # TanStack Router file-based routes (Routing layer)
├── components/       # See component layers below
├── hooks/            # Complex logic extracted into custom hooks (Logic layer)
├── services/         # Data access — currently static JSON loading (Data layer)
├── store/            # Zustand global state — SRS cards + play history, persisted to IndexedDB
├── data/collections/ # Static JSON challenge files (loaded via Vite glob)
└── lib/              # Shared utilities (stringUtils, cn helper)
```

## Component Layers

`components/` has three sublayers — placement is determined by how much business knowledge a component needs:

| Sublayer | Rule | Examples |
|---|---|---|
| `ui/` | Generic, zero business logic, reusable anywhere | `Button`, `Input`, `icons.tsx` |
| `domain/` | Business-aware but self-contained — knows about `Challenge`, `Status`, SRS concepts | `VisualTranslationInput`, `SRSProgressView`, `IntervalPills` |
| `features/` | Composite — wires domain components and hooks into a full user-facing unit | `TypingGame`, `ModePicker` |

A component that needs to call `useTypingEngine` or `useSRSStore` belongs in `features/`. A component that only receives typed props (even domain types) belongs in `domain/`.

## Core Data Flow

Route loader → `challengeService` (Vite `import.meta.glob`) → shuffled challenges passed as props → `TypingGame` component → `useTypingEngine` hook → `stringUtils` for input processing → URL state synced via `useUrlSync`.

## Key Modules

**`useTypingEngine`** (`src/hooks/useTypingEngine.ts`) — The central game hook. Manages the full status lifecycle: `'typing'` → `'submitted'` (on incorrect) or `'completed'` (on correct) → 5-second countdown → auto-advance to next challenge. Uses `stringUtils` for all input matching logic.

**`stringUtils`** (`src/lib/stringUtils.ts`) — Contains the most complex logic. Key behaviors:
- `parseSentence`: Parses challenge sentences, extracting pre-filled characters (content inside parentheses like `(hint)` is auto-filled for the user)
- `autoMatchSpacing`: Auto-inserts spaces, punctuation, and pre-filled chars so users skip them automatically
- Flexible matching: a submission is accepted even if trailing characters are all auto-insertable (`isFlexibleMatch`)
- Smart case handling: auto-capitalizes first character when appropriate

**`challengeService`** (`src/services/challengeService.ts`) — Loads JSON collections at build time using `import.meta.glob`. No runtime API calls; all data is statically bundled.

**`useTypingEngine`** also exposes `setInputDirect` — bypasses `autoMatchSpacing` entirely and sets the input value directly. Used exclusively by free input mode, which assembles the full answer string itself before passing it to the engine.

**`useUrlSync`** (`src/hooks/useUrlSync.ts`) — Keeps `questionId` in the URL query string, enabling deep-linking and browser back/forward navigation.

## Free Input Mode vs Slot Mode

`VisualTranslationInput` has two render paths, switched by the `freeInput` prop (sourced from `Collection.freeInput`):

**Slot mode** (default) — renders one `[char-slot]` box per character. Character count is visible to the user.

**Free input mode** — `buildSegments()` (inside `VisualTranslationInput`) splits `targetText` into alternating segments using `isFreebie`:
- `prefilled` segments render as static muted text (the pre-filled hints from parentheses)
- `gap` segments render as a growing underline input — character count is hidden

Because `autoMatchSpacing` would incorrectly consume gap characters that match pre-filled text between gaps, free input mode bypasses it entirely: each gap has its own internal state (`gapValues`), and `buildFullAnswer` assembles them with the pre-filled segments at the correct positions before calling `setInputDirect`.

## Zustand Store (`src/store/useSRSStore.ts`)

Persisted to IndexedDB via `idb-keyval` under the key `langtype-srs-v1`. Only `cards` and `lastPlayedAt` are persisted; `_hasHydrated` is runtime-only.

| Field | Type | Purpose |
|---|---|---|
| `cards` | `Record<"colId:chalId", SRSCard>` | Per-card SRS state, keyed `collectionId:challengeId` |
| `lastPlayedAt` | `Record<colId, ms>` | Timestamp of last play per collection, used for home-page sort |
| `_hasHydrated` | `boolean` | Set to `true` after IndexedDB rehydration; gates sort order and due counts to prevent flicker |

**`SRSCard` fields**: `interval` (days), `repetitions` (consecutive correct), `easeFactor` (starts 2.5, min 1.3), `nextReviewAt` (ms; 0 = new card), `lastReviewedAt` (ms; 0 = never reviewed).

Storage uses `skipHydration: true` — the route must call `useSRSStore.persist.rehydrate()` manually (done in `__root.tsx`).

## Challenge Data Format

`Challenge` type: `id` (required), `translation` (required), `original` (optional — when absent no source sentence is shown). `Collection.challenges` is also optional (loaded separately when needed).

JSON files in `src/data/collections/` define challenge sets. Parentheses in answer strings mark pre-filled hints: `"(The) quick brown fox"` — `"The"` is pre-filled.

Raw source CSVs live in `src/data/collections/raw/` (gitignored). Generation scripts are in `scripts/` (gitignored). Only the final JSON files are committed.
