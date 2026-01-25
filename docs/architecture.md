# Architecture Documentation

## 1. High-Level Overview

**LangType** is a typing application designed for language learners. It differs from standard typing tests by focusing on **translation accuracy** rather than just speed. Users are presented with a source text and must type the correct translation.

### Core Goals
- **Maintainability**: Clear separation of concerns via a Layer-First architecture.
- **Reliability**: A strong focus on TDD (Test-Driven Development) covering logic, components, and user flows.
- **Performance**: Leveraging TanStack Start's SSR and Cloudflare Workers for global edge deployment.

## 2. Technology Stack

| Category | Technology | Reasoning |
| :--- | :--- | :--- |
| **Framework** | TanStack Start (Vite) | Full-stack React framework with SSR, file-based routing, and edge deployment. |
| **Language** | TypeScript | Type safety, self-documenting code. |
| **Styling** | Tailwind CSS v4 | Utility-first, consistently fast development. |
| **Global State** | Zustand | Lightweight, simple API for client-only state (e.g., game progress). |
| **Server State** | TanStack Query v5 | Powerful caching, deduping, and background updates for API data. |
| **Deployment** | Cloudflare Pages | Edge deployment via Nitro + Cloudflare Workers. |
| **Unit Testing** | Vitest | Fast, Vite-native runner compatible with Jest API. |
| **Component Testing** | React Testing Library | Testing implementation details (user behavior), not internals. |
| **E2E Testing** | Playwright | Reliable end-to-end testing for critical user journeys. |

## 3. Directory Structure (Layer-First)

We utilize a **Layer-First** architecture to group code by its technical role.

```
src/
├── routes/              # TanStack Router (Routing layer)
│   ├── __root.tsx       # Root layout & HTML shell
│   ├── index.tsx        # Home page route
│   └── collections.$id.tsx  # Dynamic collection route
│
├── components/          # Shared UI Components (Presentation layer)
│   ├── ui/              # Dumb/Generic components (Button, Input)
│   ├── domain/          # Business logic aware components (TypingGame)
│   └── features/        # Feature-specific composite components
│
├── hooks/               # Logic isolation (Logic layer)
│   └── useGameEngine.ts # Example: core typing logic
│
├── services/            # Data Access (Data layer)
│   └── challengeService.ts  # Collection data loading
│
├── store/               # Global State (State layer)
│   └── useStore.ts      # Zustand stores
│
├── data/                # Static data files
│   └── collections/     # JSON collection files
│
├── lib/                 # Shared Utilities
│   └── utils.ts
│
└── router.tsx           # Router configuration
```

## 4. Key Concepts

### Routing
TanStack Router uses **file-based routing** with type-safe route definitions:
- `src/routes/__root.tsx` - Root layout with `<HeadContent />` and `<Scripts />`
- `src/routes/index.tsx` - Home page (`/`)
- `src/routes/collections.$id.tsx` - Dynamic route (`/collections/:id`)

### State Management
We separate state into two categories:
1.  **Server State**: Data that lives on the server (e.g., text content, user profile). Managed by **TanStack Query**.
2.  **Client State**: Ephemeral UI state (e.g., current wpm, typed characters). Managed by **Zustand**.

### Data Fetching
- **Route Loaders**: Fetch data in `loader` functions that run server-side.
- **Static Imports**: For build-time data, use static JSON imports bundled by Vite.
- **Client Components**: Use `useQuery` hooks to fetch or revalidate data on interaction.

## 5. Build & Deployment

### Development
```bash
npm run dev      # Start Vite dev server
```

### Production Build
```bash
npm run build    # Build for Cloudflare Pages
```

Output structure:
- `dist/` - Static assets + Cloudflare worker
- `dist/_worker.js/` - Edge worker bundle

### Deployment
```bash
npx wrangler --cwd dist/ pages deploy
```

## 6. Testing Strategy

We follow a TDD approach with three tiers:

1.  **Logic (Unit Tests)**: Test complex logic (hooks, utils) in isolation using Vitest.
    *   *Example*: Verify `calculateWPM()` returns correct values.
2.  **Interaction (Component Tests)**: Test that components render and respond to user events using Vitest + RTL.
    *   *Example*: Verify typing into `TypingInput` updates the visual display.
3.  **Flow (E2E Tests)**: Test complete user journeys using Playwright.
    *   *Example*: A user can start a game, type a sentence, and see their score.
