# Design System

All styling uses CSS custom-property themes defined in `src/globals.css`. **Do not use hard-coded colours or Tailwind colour utilities like `text-green-600` — use theme variables instead.**

## Theme Tokens (available in every theme: warm / slate / ink)

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

## Utility Classes (defined in `globals.css`, not Tailwind)

- `.mono-label` — JetBrains Mono 11px uppercase, used for section headings and counters
- `.key-hint` — keycap-style badge for keyboard shortcut hints (e.g. `<kbd className="key-hint">enter</kbd>`)

## UI Primitives

Use the generic primitives in `src/components/ui/` for ordinary app controls before hand-styling raw elements:

| Primitive | Use |
|---|---|
| `Input` | Standard single-line text inputs with shared form-control tokens |
| `Textarea` | Standard multi-line text inputs with shared form-control tokens |
| `Select` | Native selects with shared form-control tokens |
| `Button` | Standard non-icon buttons; choose a variant before hand-styling repeated button classes |
| `IconButton` | Fixed-size icon-only buttons; always provide an `aria-label` |
| `ConfirmButton` | Native `window.confirm` destructive actions; pass the exact confirmation copy through `confirmMessage` |

Primitive base classes own the shared border, background, focus, disabled, and sizing defaults. Pass `className` only for contextual overrides such as using `bg-background` inside a `bg-card` list row.

`Button` variants:

| Variant | Use |
|---|---|
| `secondary` | Bordered card/action buttons such as add actions and mode cards |
| `link` | Muted underlined text buttons for secondary navigation or cancellation |
| `dangerLink` | Inline destructive confirmation actions |
| `pill` | Small rounded filters and tag buttons; pass `selected` for the active state |

Do not use these primitives for specialized typing controls whose behavior depends on raw input layout, slot rendering, IME handling, or game-specific keyboard flow. Those controls stay in their domain components.

Raw buttons are allowed only for specialized controls where a primitive would obscure the control's structure or interaction contract, such as typing/game keycaps, structural overlay dismiss layers, and route links rendered by router primitives. Prefer `IconButton` for icon-only floating/toggle controls.

`langtype/no-raw-ui-controls` enforces the form-control side of this convention in feature and domain code. If a raw `input`, `textarea`, or `select` is genuinely part of a specialized compound control, add a targeted `eslint-disable-next-line langtype/no-raw-ui-controls` comment that states why the primitive does not fit. Direct `window.confirm` calls are only allowed inside `ConfirmButton`.

## Typography

| Use case | Classes |
|---|---|
| Section label / heading | `mono-label` |
| Page / collection title | `text-2xl font-bold` or `text-3xl font-bold` |
| Card title | `text-[15px] font-semibold` |
| Body text | default (DM Sans via `body`) |
| Monospace data (counts, badges, code) | `font-mono text-[11px]` or `font-mono text-[13px]` |
| Sentence to translate | `text-2xl md:text-3xl font-semibold` |
| Character input slots | `font-mono text-lg md:text-xl` |

## Page Layout Pattern

```tsx
<main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
    <div className="w-full max-w-2xl"> {/* or max-w-4xl for list pages */}
        {/* content */}
    </div>
</main>
```

## Card / List Row Pattern

Vertical list: single bordered container with dividers — `divide-y divide-border border rounded-[var(--radius)] bg-card overflow-hidden`. Each row: `hover:bg-[var(--bg3)] transition-colors`.

Card grid (if needed): `border rounded-[var(--radius)] bg-card hover:border-primary transition-colors`.

## Icons

Use `IconSearch` and `IconChevronRight` from `src/components/ui/icons.tsx`. No icon library is installed — add new icons to that file as inline SVGs.

## Feedback States

- Correct: `text-[var(--correct)]` with `font-mono text-[13px]`
- Incorrect: box with `bg-[var(--incorrect-bg)] border border-[var(--incorrect)] rounded-[var(--radius)]`
