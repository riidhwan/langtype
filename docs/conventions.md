# Conventions

## TypeScript

Strict mode. `interface` for object shapes, `type` for unions and aliases. Never use `any`. Use `unknown` at system boundaries and narrow explicitly.

Path alias: `@/*` → `src/*`. Always use it for imports outside the current directory.

```typescript
// correct
import { cn } from '@/lib/utils'
import type { Challenge } from '@/types/challenge'

// wrong
import { cn } from '../../lib/utils'
```

## Components

Functional only. Every component has a `Props` interface named exactly `Props`, placed directly above the function:

```typescript
interface Props {
    value: string
    status: Status
    onChange: (value: string) => void
    onSubmit: () => void
}

export function VisualTranslationInput({ value, status, onChange, onSubmit }: Props) {
```

- Destructure props in the signature, not inside the body
- Named export (not default)
- For HTML element wrappers, extend from React's own types:
  ```typescript
  interface Props extends React.InputHTMLAttributes<HTMLInputElement> {}
  ```

Use `cn()` from `@/lib/utils` for all conditional class names. Base classes first, overrides last:

```typescript
className={cn(
    'border rounded-[var(--radius)] font-mono text-sm',
    isCorrect && 'border-[var(--correct)] text-[var(--correct)]',
    className
)}
```

Event handler props are named `on[Action]` and typed with explicit payloads:

```typescript
onCardResult: (challengeId: string, passed: boolean) => void
onFinished: () => void
```

## Hooks

Organise the body in this order:

1. `useState` and `useRef` declarations
2. `useMemo` for values derived from props/state
3. `useEffect` blocks
4. Helper functions (callbacks, event handlers)
5. Return object

```typescript
export function useTypingEngine(sentences: string[]) {
    // 1 — state
    const [currentIndex, setCurrentIndex] = useState(0)
    const [input, setInput] = useState('')
    const [status, setStatus] = useState<Status>('typing')
    const hasRecordedRef = useRef(false)

    // 2 — derived
    const parsed = useMemo(() => sentences.map(parseSentence), [sentences])
    const { text: currentSentence, preFilledIndices } = parsed[currentIndex]

    // 3 — effects
    useEffect(() => { ... }, [currentIndex])

    // 4 — helpers
    const submit = () => { ... }
    const setInputDirect = (value: string) => { ... }

    // 5 — return
    return { input, setInput, setInputDirect, submit, status, currentSentence, preFilledIndices }
}
```

## Utilities (`src/lib/`)

Only pure functions, no internal state. File layout:

```
constants → types/interfaces → exported functions → private helpers (no export)
```

All exported functions have a one-line JSDoc comment when the behaviour is non-obvious. Use `export function`, never `export default`.

## Zustand Store

Split state and actions into two interfaces, then combine:

```typescript
interface SRSState {
    cards: Record<string, SRSCard>
    lastPlayedAt: Record<string, number>
    _hasHydrated: boolean          // underscore = internal flag
}

interface SRSActions {
    recordReview: (colId: string, chalId: string, grade: SRSGrade) => void
    setHasHydrated: (v: boolean) => void
}

export type SRSStore = SRSState & SRSActions
```

In components, selectors are always inline lambdas — never select the whole store:

```typescript
const cards = useSRSStore((s) => s.cards)
const recordReview = useSRSStore((s) => s.recordReview)
```

`skipHydration: true` is set in the persist config; the root route calls `useSRSStore.persist.rehydrate()` manually to control timing and prevent sort-order flicker.

## Route Files

```typescript
export const Route = createFileRoute('/collections/$id')({
    component: CollectionPage,
    loader: async ({ params }) => {
        const collection = await getCollection(params.id)
        if (!collection) throw notFound()
        return collection
    },
    validateSearch: (search: Record<string, unknown>) => { ... },
})

export function CollectionPage() {
    const collection = Route.useLoaderData()
    const { mode, view } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })
```

- Loader throws `notFound()` for missing resources — never returns `null`
- `validateSearch` type-guards all URL params; default to `undefined` for missing ones
- Component is a named export so tests can render it directly
- Use `Route.useLoaderData()` and `Route.useSearch()`, not the generic hooks
- Keep route files thin: routing setup, loaders, search param validation, and page-level composition only. Move non-trivial client state into hooks, typed UI into `components/domain` or `components/features`, and pure transforms into `src/lib`.

## Naming

| Thing | Convention |
|---|---|
| Components | `PascalCase` |
| Hooks | `camelCase` prefixed `use` |
| Utilities / helpers | `camelCase` |
| Constants | `UPPER_SNAKE_CASE` |
| Route files | `lowercase.$param.tsx` |
| Internal store flags | `_camelCase` (underscore prefix) |

## Git

Conventional Commits — `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`. Never run `git commit` or `git push` unless explicitly asked. When the user explicitly asks Codex to commit and push, treat that as approval that the pre-commit review gate is satisfied unless the user says otherwise.

GitHub Issues are used for task tracking. Before implementation, check for an existing issue or create/draft one unless the change is truly tiny. Use `Refs #N` or `Closes #N` in commit messages when useful.

Large changes are work that spans multiple features, broad refactors, risky behaviour changes, persistence/data-flow changes, or thousands of lines of code. Use one parent issue for the end goal and child issues for independently shippable slices. Each child issue must leave `main` buildable, testable, deployable, and safe for normal users.

Prefer vertical slices over layer-only mega-PRs:

- Add inactive data/model support before switching behaviour
- Introduce service, hook, or component abstractions behind current behaviour
- Add hidden UI, routes, or components before exposing them
- Wire incomplete user-facing behaviour behind a feature flag
- Enable the feature only after the flagged path is complete and verified
- Remove old paths, migration scaffolding, and feature flags as explicit cleanup work

Use branch-by-abstraction for deep internals so old and new implementations can coexist behind a stable interface during migration.

Feature flags are for incomplete user-facing behaviour that must land before it is ready for normal users. Start with lightweight Vite build-time flags named `VITE_FEATURE_*`, and add a central feature flag module only when the first real flag is needed. Flags are appropriate for new routes, new UI modes, alternate user flows, and risky temporary refactors. They are not appropriate for hiding broken shared code, avoiding tests, long-lived parallel architectures, or security/permission boundaries.

Every feature flag must have an owner issue, default state, reason for existing, enable/removal condition, and cleanup child issue. Do not close a large-change parent issue until temporary flags, old code paths, and migration scaffolding are removed or explicitly moved to follow-up issues.

For complete, verified issue-backed work, use `Closes #N` when the commit should close the issue on merge or push. Do not downgrade to `Refs #N` solely because a post-commit review might happen; the explicit commit/push request is the review approval unless the user says otherwise.

When finishing issue-backed work, always consider whether the issue needs a comment summarizing the outcome, verification, remaining risks, blockers, or handoff notes. Do not post outcome or completion comments while the relevant changes are only local and unpushed; wait until the commit/PR is pushed, or draft the comment for manual posting when handing off unpushed work. Comment when it would leave useful durable context; skip it only when the final state is already obvious from the issue, commits, and PR/branch history. If GitHub access is unavailable, include the exact comment text in the final report so it can be posted manually.

For refactors that introduce lint rules, shared primitives, or other durable enforcement, include a final issue checklist item that explicitly confirms the enforcement boundary and whether the issue should close or split follow-up cleanup into a new issue.

Issue labels stay intentionally small:

| Group | Labels |
|---|---|
| Type | `bug`, `enhancement`, `documentation`, `refactor`, `maintenance` |
| Size | `size:quick`, `size:planned`, `size:epic` |
| Status | `status:backlog`, `status:ready`, `status:active`, `status:blocked` |
| Area | `area:dictionary`, `area:srs`, `area:custom-collections`, `area:ui`, `area:tests` |

Treat the workflow itself as improvable. If a task reveals unclear issue criteria, missing templates, repeated manual steps, weak labels, or better task-splitting practices, mention the improvement to the user so the workflow can be updated intentionally.

## Linting

**Always run `npm run lint` before considering a task complete.** Fix any errors it surfaces; warnings from genuinely unused-but-kept props (`_prefixed`) are acceptable.

## Testing

**Always consider whether unit tests and/or E2E tests are needed after every implementation — do not wait to be asked.** Write unit tests when new code has non-obvious threshold values, branching logic, or derived state that could silently regress. Write E2E tests when the change affects visual layout, positioning, or CSS properties that jsdom cannot verify. If unsure, ask.

**Bug fixes must include a regression test.** The test documents the invariant and prevents the same issue from reappearing silently.

Tests are co-located in `__tests__/` folders. Use `vi.useFakeTimers()` / `vi.advanceTimersByTime()` for timer-dependent logic. Use `renderHook` from RTL for hook tests.

### Unit Test Standard

Unit tests should prove behavior through public interfaces and observable outcomes. They are allowed to know the contract of the unit under test, but not its private implementation.

- Test the invariant, not the implementation detail. A harmless refactor should not break the test.
- Prefer focused tests with one clear behavioral reason to fail.
- Use Arrange / Act / Assert structure when it improves clarity.
- Cover the happy path, important branches, boundary values, empty/error states, and regression cases.
- Use small deterministic fixtures or builder helpers. Avoid large opaque fixtures that hide the behavior under test.
- Keep the unit boundary explicit. Mock external services, browser/storage/network boundaries, expensive collaborators, and framework plumbing; do not mock the logic being tested.
- Await async behavior explicitly with Testing Library or Vitest async helpers. Do not rely on incidental timing.
- Reset mocks, timers, stores, local storage, and module/global state between tests.

Standards by unit type:

- Pure utilities: use table tests for meaningful input classes and edge cases. Assert exact outputs and thrown errors.
- Hooks: use `renderHook`, wrap state changes in `act`, use fake timers for time-dependent behavior, and assert returned state/actions instead of hook internals.
- Components: use Testing Library queries by role, label, and visible text first. Use `user-event` for user flows, reserve `fireEvent` for low-level events that `user-event` cannot express, and assert visible UI or callback outcomes.
- Stores and services: reset persisted or module state in `beforeEach`; assert state transitions, returned values, and externally visible side effects.
- Routes and loaders: test loader/search behavior separately from page rendering where practical; route component tests may mock router plumbing but should still assert page-level behavior.

Avoid:

- Snapshot-only unit tests.
- "Renders without crashing" tests with no behavioral assertion.
- Over-mocking, especially mocking the unit under test.
- Assertions coupled to private state, CSS class names, or implementation-only call order.
- Real timers, arbitrary sleeps, or unbounded retries for timer-dependent logic.
- Shared mutable fixtures that are not rebuilt or reset for each test.
- Broad integration tests mislabeled as unit tests when a narrower unit test would be clearer.
- Testing layout, computed CSS, or pixel-level behavior in jsdom. Use Playwright for browser-rendered behavior.

Unit test audit checklist:

- Each test documents a user, business, or code invariant.
- Each test has one clear reason to fail.
- Bug fixes include a regression test that fails without the fix.
- Branching logic, derived state, thresholds, and error/empty states are covered.
- Async work is awaited explicitly.
- Mocks are scoped to external boundaries and reset between tests.
- Fake timers are restored with `vi.useRealTimers()`.
- Store, storage, module, and global state cannot leak into the next test.
- Component tests prefer accessible queries; `data-testid` is used only when accessible queries are unsuitable.
- jsdom limitations are respected; browser layout and visual regressions are covered by E2E tests.

### Mock Patterns

Use `vi.hoisted()` for mock values referenced inside `vi.mock()` factories; wrap real module functions in `vi.fn()` when per-test overrides are needed:

```typescript
vi.mock('@/lib/foo', async (orig) => {
    const a = await orig()
    return { ...a, fn: vi.fn(a.fn) }
})
```

### Route Component Tests

Export the component from the route file (e.g. `export function Home()`), then render it directly. Standard mock setup:

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

### E2E Tests

Live in `e2e/`, run with `npm run test:e2e`. Use Playwright + Chromium only. Update baselines with `npx playwright test --update-snapshots`; commit new PNGs alongside the code change.

*When to write E2E over unit:* visual layout, computed CSS that jsdom ignores, pixel-level screenshot regression.

Standard setup:

```typescript
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('lt_theme', 'warm'))
    await page.goto('/collections/dev_test?mode=normal&questionId=4')
    await page.waitForSelector('[data-testid="visual-translation-input"]')
    await page.evaluate(() => document.fonts.ready)
})

// Alignment assertion
test('elements align vertically', async ({ page }) => {
    const a = await page.locator('[data-testid="..."] input').first().boundingBox()
    const b = await page.locator('[data-testid="..."] span').first().boundingBox()
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2)
})

// Screenshot regression
test('renders correctly', async ({ page }) => {
    await expect(page.locator('[data-testid="..."]')).toHaveScreenshot('name.png')
})
```

Key gotchas:
- `reuseExistingServer: !process.env.CI` — kill the dev server before running tests after code changes, or Playwright reuses the stale one.
- `@playwright/test` is the test runner; `playwright` is the browser library — they are separate packages.
- Prefer `data-testid` selectors over CSS class selectors.

### `data-testid` Inventory

Keep this updated when adding or removing attributes.

| Attribute | Element | Component |
|---|---|---|
| `visual-translation-input` | root `div` | `VisualTranslationInput` |
| `char-slot` | per-character `div` | `VisualTranslationInput` (slot mode only) |

## Dictionary Data

`data/dictionary/raw/*` and `data/dictionary/generated/*` are gitignored. Do not commit the raw Wiktextract JSONL file or generated dictionary artifacts. Commit repeatable dictionary scripts, validation/upload tests, docs, and tiny fixtures under `test/fixtures/`.
