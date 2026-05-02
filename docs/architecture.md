# Architecture

LangType is a **translation typing app** — users see source text and must type the correct translation. Built on **TanStack Start** (Vite-based full-stack React), deployed to Cloudflare Pages via Nitro.

## Layer-First Structure

```
src/
├── routes/           # TanStack Router file-based routes (Routing layer)
├── components/       # See component layers below
├── hooks/            # Complex logic extracted into custom hooks (Logic layer)
├── services/         # Data access — currently static JSON loading (Data layer)
├── store/            # Zustand global state — SRS cards, play history, and custom collections persisted to IndexedDB
├── data/collections/ # Static JSON challenge files (loaded via Vite glob)
├── lib/              # Shared utilities (stringUtils, cn helper)
└── config.ts         # App-level tuneable constants (see below)
```

## Dictionary Data Flow

The German Dictionary page (`/dictionary`) is backendless. It fetches versioned static JSON artifacts from a public Cloudflare R2 bucket:

```
data/dictionary/raw/de-dict.jsonl
  → npm run dict:build
  → data/dictionary/generated/vYYYY-MM-DD/
  → npm run dict:upload
  → R2 dictionary/vYYYY-MM-DD/
  → /dictionary fetches search-index.json, search/{chunk}.json, and entries/{bucket}.json
```

The raw Wiktextract-style JSONL file and generated artifacts are local-only and gitignored. The committed surface is the repeatable scripts, docs, tests, and tiny fixtures. The app debounces user input, fetches and caches `search-index.json`, loads only the non-empty search shards listed for the normalized prefix, filters locally with `startsWith`, then fetches the selected entry bucket. Search rows use `term` as the lemma display label; form rows keep the searched inflection in `matchedTerm`. The route file only mounts the page. `DictionaryBrowser` composes the UI, `useDictionarySearch` owns debounce/search/entry state, `dictionaryService` owns artifact access, and `dictionaryForms` owns pure display grouping and formatting.

See `docs/runbooks/dictionary-update.md` before changing build, validation, upload, publish, or maintenance workflow.

## `src/config.ts` — Tuneable Constants

`src/config.ts` holds named constants for values that are likely to be adjusted over time or that would otherwise be buried inside a component. When adding a new magic number or threshold, prefer defining it here over inlining it in a `.tsx` file if it meets any of these criteria:

- It controls user-facing behaviour (timing, counts, limits)
- It might need tuning based on playtesting
- It is referenced in more than one place

Examples already in `config.ts`: `DEFAULT_HOME_TAG`, `REINSERT_MIN`, `REINSERT_MAX`.

Dictionary config values also live in `config.ts`: public R2 base URL, active dictionary version, minimum query length, search debounce delay, result limit, and prefix length.

## Component Layers

`components/` has three sublayers — placement is determined by how much business knowledge a component needs:

| Sublayer | Rule | Examples |
|---|---|---|
| `ui/` | Generic, zero business logic, reusable anywhere | `Button`, `Input`, `icons.tsx` |
| `domain/` | Business-aware but self-contained — knows about `Challenge`, `Status`, SRS concepts | `VisualTranslationInput`, `SRSProgressView`, `IntervalPills` |
| `features/` | Composite — wires domain components and hooks into a full user-facing unit | `TypingGame`, `ModePicker` |

A component that needs to call `useTypingEngine` or `useSRSStore` belongs in `features/`. A component that only receives typed props (even domain types) belongs in `domain/`.

## Core Data Flow

Route loader → `challengeService` (Vite `import.meta.glob`) → shuffled challenges passed as props → `TypingGame` feature component → session/review hooks → `useTypingEngine` → `stringUtils` for input processing → URL state synced via `useUrlSync`.

## Key Modules

**`useTypingEngine`** (`src/hooks/useTypingEngine.ts`) — The central game hook. Manages the full status lifecycle: `'typing'` → `'submitted'` (on incorrect) or `'completed'` (on correct) → 5-second countdown → auto-advance to next challenge. Uses `stringUtils` for all input matching logic.

**Typing session hooks** (`src/hooks/useTypingSessionQueue.ts`, `src/hooks/useSRSReviewRecording.ts`, `src/hooks/useTypingRetryReinsertion.ts`, `src/hooks/useTypingSessionCompletion.ts`) — Own feature-level game orchestration around the engine: session queue reset/reinsertion, SRS interval selection and review recording, normal-mode wrong-answer retries, and end-of-session detection. `TypingGame` composes these hooks and renders the UI.

**`stringUtils`** (`src/lib/stringUtils.ts`) — Contains the most complex logic. Key behaviors:
- `parseSentence`: Parses challenge sentences, extracting pre-filled characters (content inside parentheses like `(hint)` is auto-filled for the user)
- `autoMatchSpacing`: Auto-inserts spaces, punctuation, and pre-filled chars so users skip them automatically
- Flexible matching: a submission is accepted even if trailing characters are all auto-insertable (`isFlexibleMatch`)
- Smart case handling: auto-capitalizes first character when appropriate

**`challengeService`** (`src/services/challengeService.ts`) — Loads built-in JSON collections at build time using `import.meta.glob` and merges in valid local custom collections from the custom collection store. No runtime API calls are used.

The collection practice route (`/collections/$id`) loads bundled collection ids through `challengeService` in the route loader. Custom collection practice ids are identified by the `custom_` prefix and resolved in the route component after the IndexedDB-backed custom collection store hydrates, because loaders cannot reliably read browser-local IndexedDB state during direct refresh or deep-link startup.

**`dictionaryService`** (`src/services/dictionaryService.ts`) — Runtime static JSON access for dictionary search/detail chunks. It normalizes German search terms (`ä/ö/ü`, `ß`, whitespace, case), fetches and caches the search index and the correct prefix shards, dedupes entries, ranks lemma matches ahead of form matches, and loads entry buckets on demand.

**`useDictionarySearch`** (`src/hooks/useDictionarySearch.ts`) — Owns Dictionary page query state, debouncing, result loading, selected entry loading, error text, and mobile sheet state. UI components receive typed props and do not fetch dictionary data directly.

**`useTypingEngine`** also exposes `setInputDirect` — bypasses `autoMatchSpacing` entirely and sets the input value directly. Used exclusively by free input mode, which assembles the full answer string itself before passing it to the engine.

**`useUrlSync`** (`src/hooks/useUrlSync.ts`) — Keeps `questionId` in the URL query string, enabling deep-linking and browser back/forward navigation.

## Free Input Mode vs Slot Mode

`VisualTranslationInput` is a thin mode switch, controlled by the `freeInput` prop (sourced from `Collection.freeInput`):

**Slot mode** (default) — `SlotTranslationInput` renders one `[char-slot]` box per character. Character count is visible to the user.

**Free input mode** — `FreeTranslationInput` uses `buildSegments()` from `visualTranslationInputHelpers` to split `targetText` into alternating segments using `isFreebie`:
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

## Custom Collections Store (`src/store/useCustomCollectionsStore.ts`)

User-created collections are local-only and persisted to IndexedDB under `langtype-custom-collections-v1`. The store uses the same `Collection` and `Challenge` shape as bundled JSON, with `createdAt` and `updatedAt` metadata for local sorting/editing.

Custom collection ids are prefixed with `custom_` to avoid collisions with bundled collection files. Drafts may be incomplete, but only collections with a non-empty title and at least one challenge with a non-empty `translation` are returned by `challengeService` for the home list and practice route.

## Challenge Data Format

`Challenge` type: `id` (required), `translation` (required), `original` (optional — when absent no source sentence is shown). `Collection.challenges` is also optional (loaded separately when needed).

JSON files in `src/data/collections/` define challenge sets. Parentheses in answer strings mark pre-filled hints: `"(The) quick brown fox"` — `"The"` is pre-filled.

Raw source CSVs live in `src/data/collections/raw/` (gitignored). Generation scripts are in `scripts/` (gitignored). Only the final JSON files are committed.
