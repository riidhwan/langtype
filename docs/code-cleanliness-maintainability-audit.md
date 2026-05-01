# Code Cleanliness and Maintainability Audit

Date: 2026-05-01

## Executive Summary

LangType is in good maintainability shape overall. The project has a clear layer-first structure, strict TypeScript, path aliases, a meaningful test suite, and living docs that match the current architecture. A previous high-priority concern around `TypingGame` owning too much session logic has been addressed by extracting focused hooks. The main remaining risks are concentrated in the visual input component, route-level derived data, and a few intentional hook dependency suppressions.

Overall assessment: **A- / good, with a few targeted cleanup items still worth scheduling.**

## Verification Snapshot

- `npm run lint`: passed.
- `npm test -- --run`: passed, 29 test files and 330 tests.
- `npm run build`: exited successfully. During the SSR build, Wrangler attempted to write a log under `/home/dhani/.config/.wrangler/logs` and reported an `EROFS` sandbox warning, but the build completed.
- Follow-up verification after the `TypingGame` refactor: `npm test -- --run src/hooks/__tests__/useTypingSessionQueue.test.ts src/hooks/__tests__/useSRSReviewRecording.test.ts src/hooks/__tests__/useTypingRetryReinsertion.test.ts src/hooks/__tests__/useTypingSessionCompletion.test.ts src/components/features/__tests__/TypingGame.test.tsx` passed, 5 files and 53 tests.
- Current working tree impact from this audit: this report file only. Pre-existing untracked `.claude/` and `.codex/` directories were left untouched.

## Strengths

### Clear Repository Shape

The codebase follows the documented routing, service, store, hook, component, and lib split. Most code lands in predictable places, and key concepts such as dictionary search, SRS state, custom collections, and typing behavior are easy to locate.

Examples:

- Routes stay mostly page-level.
- Services own collection and dictionary access.
- Stores keep persisted state centralized.
- `src/lib/stringUtils.ts` and `src/lib/srsAlgorithm.ts` contain heavily tested pure logic.

### Strong Test Coverage for Risky Logic

The suite is broad for the size of the app. The most fragile parts have direct tests:

- `stringUtils`: 33 tests.
- `srsAlgorithm`: 51 tests.
- `TypingGame`: 42 tests.
- `VisualTranslationInput`: 28 tests.
- Stores, services, dictionary behavior, routes, and editor flows are covered.

This makes cleanup work lower risk because existing behavior is well pinned.

### Good Type Discipline in Production Code

Production code mostly avoids `any`, uses typed stores and service boundaries, and follows strict mode. Most `any` usage is isolated to tests and generated route code. The project also uses `unknown`-style search validation in route definitions.

### Documentation Is Useful and Current

The docs describe real architecture rather than generic intent. `docs/architecture.md` accurately captures the layer model, dictionary data flow, free-input behavior, and store hydration constraints.

## Recently Resolved

### `TypingGame` Session Logic Was Extracted

Files:

- `src/components/features/TypingGame.tsx`
- `src/hooks/useTypingSessionQueue.ts`
- `src/hooks/useSRSReviewRecording.ts`
- `src/hooks/useTypingRetryReinsertion.ts`
- `src/hooks/useTypingSessionCompletion.ts`

The previous Issue #1 has been fixed. `TypingGame` is now a substantially thinner composition component: it renders the game surface and wires together focused hooks. Queue management, SRS review recording, retry reinsertion, and session completion now have separate hooks and dedicated tests.

This is a good maintainability improvement because the session rules are now easier to reason about independently, and the old cluster of `react-hooks/exhaustive-deps` suppressions in `TypingGame` has been removed.

Residual note: `TypingGame` still contains the interval-pill markup and status rendering. That is acceptable today; extract those into presentational components only if the UI grows further.

## Maintainability Concerns

### 1. Hook Dependency Suppressions Are Still Present

Remaining files with `react-hooks/exhaustive-deps` suppressions:

- `src/components/domain/VisualTranslationInput.tsx`
- `src/routes/collections.$id.tsx`
- `src/hooks/useUrlSync.ts`

The largest suppressions in `TypingGame` were removed by the refactor. The remaining suppressions appear to be intentional snapshot or reset behavior, especially session-start behavior in `collections.$id.tsx`. The issue is that the intent is still encoded as comments and lint disables rather than stable APIs. Over time this makes behavior harder to modify safely.

Recommended cleanup:

- Replace effect suppressions with small hooks that expose explicit snapshot semantics.
- Where a dependency is intentionally excluded, add a focused test that documents the invariant.
- Avoid adding new suppressions without first considering whether the code wants a ref, reducer, or extracted state machine.

Priority: **Medium**.

### 2. `VisualTranslationInput` Mixes Parsing, State, Focus, and Rendering — Addressed

Files:

- `src/components/domain/VisualTranslationInput.tsx`
- `src/components/domain/SlotTranslationInput.tsx`
- `src/components/domain/FreeTranslationInput.tsx`
- `src/components/domain/visualTranslationInputHelpers.ts`

The former 280-line component mixed:

- Free-input segmentation.
- Gap-state management.
- Focus behavior for gap inputs.
- Hidden input behavior for slot mode.
- Slot sizing heuristics.
- Status color computation.
- Two fairly different render paths.

Cleanup completed:

- `VisualTranslationInput` is now a thin mode switch.
- `SlotTranslationInput` owns slot-mode hidden input, focus, cursor, sizing, and status rendering.
- `FreeTranslationInput` owns free-input segmentation state, gap focus, and full-answer assembly.
- `buildSegments`, `buildFullAnswer`, and slot sizing helpers live in local pure helpers with direct tests.
- The component-specific `react-hooks/exhaustive-deps` suppression was removed.

Status: **Addressed**.

### 3. Home Route Contains Derived Data Logic That Belongs Outside the Route

File: `src/routes/index.tsx`

The home route is 221 lines and handles collection merging, sorting, tag extraction, due-count calculation, search filtering, hydration skeletons, and rendering. The route is still readable, but it violates the project’s own “thin route files” direction as the home screen grows.

Recommended cleanup:

- Extract a `useHomeCollections` hook for merge/sort/filter/due-count derivation.
- Extract `CollectionList`, `CollectionFilters`, and possibly `CollectionRow`.
- Memoize due-count derivation by `cards` and collections, because `getDueCount` repeatedly scans `Object.entries(cards)` during filtering and rendering.

Priority: **Medium**.

### 4. Store Selector Convention Is Not Fully Followed

File: `src/routes/collections.$id.tsx`

Line 71 uses `const { cards } = useSRSStore()`, selecting the whole Zustand store. The repository convention says components should use inline selectors and never select the whole store. This can cause avoidable rerenders when unrelated store actions or state change.

Recommended cleanup:

- Replace with `const cards = useSRSStore((s) => s.cards)`.
- Scan for similar whole-store selectors periodically.

Priority: **Low-Medium**.

### 5. Test Mocks Use Significant `any`

Most `any` usage is in tests, especially route/component mocks. That keeps production code clean, but it weakens test refactor safety and conflicts with the documented “never use `any`” rule.

Recommended cleanup:

- Add small typed mock helpers for TanStack route mocks and Zustand selectors.
- Replace repeated `(s: any) => any` store selector mocks with typed store fixtures.
- Do this opportunistically when touching test files, not as a large standalone churn unless desired.

Priority: **Low**.

### 6. Some UI Primitives Are Underused

There is a generic `Input` component, but route and feature files still contain many hand-styled `input`, `textarea`, `select`, and `button` elements. This is manageable today, but visual and accessibility consistency will drift as the app grows.

Recommended cleanup:

- Add or adopt small `Textarea`, `Select`, `IconButton`, and `ConfirmButton` primitives if repeated styling continues.
- Migrate only active surfaces as they are touched.

Priority: **Low-Medium**.

### 7. Build Tooling Has a Sandbox-Sensitive Wrangler Log Path

`npm run build` completed, but Wrangler emitted an `EROFS` warning because it attempted to write logs outside the writable workspace. This is not an app maintainability issue, but it can make CI or agent runs noisier.

Recommended cleanup:

- Consider configuring Wrangler log/output behavior for restricted environments if this warning appears in CI.
- No app code change is required unless builds start failing.

Priority: **Low**.

## Suggested Refactor Plan

1. Split `VisualTranslationInput` into slot and free-input subcomponents.
2. Extract home-page collection derivation into a hook and row/filter components.
3. Fix whole-store Zustand selection in `collections.$id.tsx`.
4. Add typed test mock helpers to reduce repeated `any`.
5. Introduce additional UI primitives only when repeated styling is actively being modified.

## Bottom Line

The codebase is clean enough to build on, and its tests give good confidence. The resolved `TypingGame` refactor removes the largest maintainability concern from the original audit. The next maintainability win is to split the visual input modes and thin the home route. The cleanup should stay incremental and test-preserving rather than becoming a broad rewrite.
