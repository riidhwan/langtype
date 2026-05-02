# LangType

A personal tool I built because I couldn't find an existing app that suited the way I learn German. It combines a typing-based drill — source text is shown and the correct German translation must be typed — with a spaced repetition system for flashcard-like review scheduling, except answers are always typed rather than self-evaluated. Designed specifically around the vocabulary and grammar patterns I'm currently studying. Live at [typing.ramdhani.me](https://typing.ramdhani.me).

It is unlikely to be useful to anyone else in its current form. That said, the development approach and backlog are oriented toward generic use cases, and the app will most likely evolve into something more broadly applicable over time.

The app is fully client-side. There is no backend or server-side logic — all data is statically bundled and state is persisted locally in the browser. This is a deliberate choice to avoid operational maintenance, though it may change as the project grows.

## Features

- **Spaced Repetition (SRS)** — SM-2 algorithm with per-card intervals; missed cards are replayed in a retry phase at the end of each session
- **Two input modes** — slot mode (one box per character) and free input mode (open text per gap, hides character count for harder recall)
- **Tag filtering + search** — filter collections by tag or keyword on the home page
- **Keyboard-first** — navigate entirely with keyboard; SRS interval selection via number keys 1–7

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (Vite-based full-stack React)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 + CSS custom properties
- **State**: Zustand (persisted to IndexedDB)
- **Testing**: Vitest + React Testing Library + Playwright
- **Deployment**: Cloudflare Pages

## Getting Started

### Development Server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Testing

```bash
# Run unit/component tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Project Structure

This project follows a **Layer-First** architecture:

```
src/
├── routes/          # TanStack Router file-based routing
├── components/      # UI components (ui/, domain/, features/)
├── hooks/           # Custom React hooks (logic isolation)
├── services/        # Data access layer
├── store/           # Zustand global state
├── data/            # Static JSON data (collections)
├── lib/             # Shared utilities
└── types/           # TypeScript type definitions
```

## Build & Deployment

### Production Build

```bash
npm run build
```

Output will be in the `dist/` directory.

### Deploy to Cloudflare Pages

```bash
npx wrangler --cwd dist/ pages deploy
```

## License

[AGPL-3.0-only](./LICENSE)

## AI-Assisted Development

All development is done through [Claude Code](https://claude.ai/code). The rules below govern how this workflow operates.

### Docs are the source of truth

Five documents in `docs/` are loaded into Claude's context on every session via `CLAUDE.md`. All code must conform to them. Deviations are treated as bugs, not style preferences.

| File | Governs |
|---|---|
| `architecture.md` | Layer structure, data flow, component placement rules, key modules |
| `conventions.md` | TypeScript rules, component/hook/store patterns, testing standards |
| `design-system.md` | Theme tokens, typography scale, layout patterns — no hardcoded colours |
| `product-behaviour.md` | Every user-facing flow, state machine, and edge case |
| `vocabulary.md` | Agreed terms for pages, views, and concepts |

### Use the vocabulary

All prompts must use terms from `vocabulary.md`. Do not introduce informal or ad-hoc names for pages, views, or concepts. If a new concept enters the project, extend `vocabulary.md` first, then use the term.

### Plan before implement

For any non-trivial change, Claude must enter plan mode: explore the codebase, write a structured plan file, and receive explicit approval before writing any code. Implementation does not begin until the plan is signed off.

Non-trivial manual code changes made outside this workflow are heavily discouraged. They bypass the planning cycle, skip doc updates, and drift from established patterns — breaking the contract between the code and the docs.

Commits must also be made by Claude, not manually. This ensures the commit message accurately reflects what actually changed, following the Conventional Commits standard enforced by the project.

### Track work with GitHub Issues

GitHub Issues are the durable task queue for this project. Before implementation starts, Claude checks whether the task already has an issue. If it does not, Claude creates or drafts one first, except for truly tiny changes such as typo fixes, comment corrections, or metadata-only cleanup.

Use the templates in `.github/ISSUE_TEMPLATE/`:

| Template | Use for |
|---|---|
| Backlog item | Non-urgent features, fixes, or ideas to revisit later |
| Planned task | Scoped work that needs acceptance criteria or decomposition |
| Quick fix | Small fixes or improvements that need documentation but not deep planning |

Large work should be split into one parent issue plus child issues for independently shippable slices. The parent issue keeps the overall goal and checklist; each child issue should be small enough to implement, test, review, and commit separately.

Recommended labels:

| Label group | Values |
|---|---|
| Type | `bug`, `enhancement`, `documentation`, `refactor`, `maintenance` |
| Size | `size:quick`, `size:planned`, `size:epic` |
| Status | `status:backlog`, `status:ready`, `status:in-progress`, `status:blocked` |
| Area | `area:dictionary`, `area:srs`, `area:custom-collections`, `area:ui`, `area:tests` |

When GitHub CLI authentication is available, Claude may create, update, comment on, and close issues as part of the workflow. If authentication is unavailable, Claude drafts the exact issue title, body, and labels for manual creation.

This workflow is always open to improvement. For every instruction and task, Claude should watch for workflow friction, ambiguity, repeated manual work, missing issue fields, unclear labels, or better task-splitting patterns. When an improvement seems useful, Claude should mention it so the developer can decide whether to update the workflow.

### Keep the docs current

Every doc must reflect the current state of the codebase. Updates happen in the same session as the code change, not later.

- New code pattern (component structure, hook convention, store pattern) → update `conventions.md` or `architecture.md`
- New token, utility class, or layout pattern in `globals.css` → update `design-system.md`
- Any user-facing flow added, removed, or changed → update `product-behaviour.md`
- New concept introduced → update `vocabulary.md`

### Write tests as part of every task

Tests are not added after the fact. For every implementation, Claude determines whether unit tests, E2E tests, or both are required, and writes them before closing the task. Bug fixes must include a regression test. When behaviour changes, the tests change with it.

### Cross-session memory

Claude maintains a persistent memory store scoped to this project. Workflow rules, user preferences, and past decisions are stored there and applied automatically across sessions without re-briefing.

### The developer's role

The developer's responsibility in this workflow is supervision, review, testing, and improving the development workflow — not writing code. Every change Claude produces must be read, evaluated, and tested by the developer before it is accepted.

Knowledge of clean code principles, the technology stack, security practices, and software engineering best practices is required — not to write the implementation, but to evaluate it. The developer must be capable of identifying flawed architecture, security issues, and patterns that will cause problems at scale. The quality of the codebase is bounded by the developer's ability to review and course-correct.
