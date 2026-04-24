# Conventions

## TypeScript

Strict mode. Use `interface` for object shapes, `type` for unions. Never use `any`.

## Components

Functional only. Each has a `Props` interface. Use `cn()` (clsx + tailwind-merge) for conditional classNames.

## Hooks

Extract all non-trivial logic from components into custom hooks.

## Naming

- Components: `PascalCase`
- Hooks/utils: `camelCase` prefixed `use`
- Constants: `UPPER_SNAKE_CASE`
- Route files: `lowercase.$param.tsx`

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
