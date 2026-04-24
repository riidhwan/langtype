# Product Behaviour

This file must be kept up to date whenever product behaviour changes. If you add, remove, or change a user-facing flow, update this file as part of the same task.

## Theme Toggle

A fixed button (bottom-right, visible on every page) switches between `warm` (light) and `ink` (dark). Shows a moon icon in light mode and a sun icon in dark mode. The chosen theme is persisted in `localStorage` under key `lt_theme`. The inline script in `RootDocument` (`__root.tsx`) reads this key before hydration to prevent FOUC; React state in `RootComponent` syncs from `localStorage` on mount and writes back on toggle. Default is `warm`.

## Home Page (`/`)

Collections are sorted by most-recently-played (`lastPlayedAt` in Zustand). A search input filters by title/description; "Due (N)" tab narrows to collections with at least one card due. Skeleton rows are shown until the SRS store hydrates (`_hasHydrated`) to prevent sort-order flicker. Tag pills appear below the All/Due tabs when any collection has a `tags` field. Clicking a tag (single-select) filters to collections containing that tag; clicking the active tag deselects it. Tag, All/Due, and search filters are ANDed. Collections without a `tags` field are visible when no tag is active and hidden when a tag is active.

## Collection Page (`/collections/$id`)

All state lives in URL search params. The page renders one of four views depending on `?mode` and `?view`:

| URL params | Renders |
|---|---|
| _(none)_ | Mode picker — choose Practice All or SRS |
| `?view=progress` | Progress view — per-card due/new/upcoming breakdown |
| `?mode=normal` | Game — all cards shuffled, no SRS recording |
| `?mode=srs` | Game — only due cards, full SRS flow (see below) |

Back button always navigates to `?` (clears params) → mode picker. Retry state is reset via a `useEffect` watching `mode`, not before `navigate()`, to avoid a transient render where `mode=srs` + `retryCount=0` would flash the all-done screen.

## SRS Session Flow

```
[Mode picker] → startSRS() → mode=srs
    ↓
[Game] — due cards only, shuffled
  • correct answer → 7 interval pills shown, timer paused
      → user picks interval (or presses 1–7) → recordReviewWithInterval()
      → ASAP (0 days) → passed=false; all others → passed=true
  • wrong answer   → recordReview('incorrect'), nextReviewAt=now → passed=false
  • onCardResult(id, passed) — route accumulates passed=false IDs in pendingMissedIds ref
    ↓
[handleFinished — last card done]
  if pendingMissedIds.length > 0:
    → setMissedIds, retryCount++ → navigate clears questionId (replace:true, keeps mode)
    → challenges recomputes → TypingGame re-mounts (isRetry=true, initialQuestionId=undefined)
  else:
    → goToPicker()
    ↓
[Retry phase — isRetry=true in srsContext]
  Same game flow; "X cards remaining" shows "Reviewing X missed cards"
  handleFinished again → if still misses → another retry; else → goToPicker()
    ↓
[All done screen — shown when mode=srs but challenges.length===0]
  Reached if: 0 cards due at session start, OR navigating back during session.
```

## SRS Algorithm (`src/lib/srsAlgorithm.ts`)

- **`computeReview(card, grade)`** — SM-2: `incorrect` resets reps + EF−0.2, interval=0, nextReviewAt=now; `hard` EF−0.1, shorter interval; `correct` EF+0.1, longer interval.
- **`computeReviewFromInterval(card, intervalDays)`** — bypasses SM-2; sets nextReviewAt directly and nudges EF/reps by magnitude (ASAP→−0.2/reset, 1w→+0.15/+1 rep).
- **`isCardDue(card)`** — true if `nextReviewAt === 0` (new) or `nextReviewAt <= now`.

## Progress View

Cards are bucketed into three groups: **due** (`isCardDue` = true and `lastReviewedAt > 0`), **new** (`lastReviewedAt === 0`), **upcoming** (not due, sorted by `nextReviewAt` ascending). Time until review is formatted by `formatTimeUntil()` in `SRSProgressView.tsx`.

## Normal Mode

All collection challenges shuffled. Game receives no `srsContext` — no SRS recording, no interval pills, no retry phase. Timer auto-advances after correct (5s) or incorrect (5s) answer.

## Game Internals

- Status lifecycle: `typing` → `completed` (correct) or `submitted` (incorrect) → auto-advance (or wait for pill in SRS mode)
- In SRS mode, correct answer pauses the timer (`setIsPaused(true)`) until a pill is selected, then restarts with a 2-second countdown.
- Recording fires exactly once per card via `hasRecordedRef` (reset on `status=typing`), triggered when `timeLeft === 0`.
- `cardsCompleted` (route state) drives the "X cards remaining" counter — derived from a stable counter, not `currentIndex`, to prevent flicker on refresh.
