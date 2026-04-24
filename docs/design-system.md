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
