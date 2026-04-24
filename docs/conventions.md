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

Conventional Commits — `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`. Never run `git commit` or `git push` unless explicitly asked.

## Testing

**Always consider whether unit tests and/or E2E tests are needed after every implementation — do not wait to be asked.** Write unit tests when new code has non-obvious threshold values, branching logic, or derived state that could silently regress. Write E2E tests when the change affects visual layout, positioning, or CSS properties that jsdom cannot verify. If unsure, ask.

**Bug fixes must include a regression test.** The test documents the invariant and prevents the same issue from reappearing silently.

Tests are co-located in `__tests__/` folders. Use `vi.useFakeTimers()` / `vi.advanceTimersByTime()` for timer-dependent logic. Use `renderHook` from RTL for hook tests.

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
