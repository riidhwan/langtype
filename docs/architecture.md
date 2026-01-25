# Architecture Documentation

## 1. High-Level Overview

**LangType** is a typing application designed for language learners. It differs from standard typing tests by focusing on **translation accuracy** rather than just speed. Users are presented with a source text and must type the correct translation.

### Core Goals
- **Maintainability**: Clear separation of concerns via a Layer-First architecture.
- **Reliability**: A strong focus on TDD (Test-Driven Development) covering logic, components, and user flows.
- **Performance**: Leveraging Next.js Server Components for initial load and effective caching strategies.

## 2. Technology Stack

| Category | Technology | Reasoning |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | Standard for React apps, Server Components, SEO. |
| **Language** | TypeScript | Type safety, self-documenting code. |
| **Styling** | Tailwind CSS v4 | Utility-first, consistently fast development. |
| **Global State** | Zustand | Lightweight, simple API for client-only state (e.g., game progress). |
| **Server State** | TanStack Query v5 | Powerful caching, deduping, and background updates for API data. |
| **Unit Testing** | Vitest | Fast, Vite-native runner compatible with Jest API. |
| **Component Testing** | React Testing Library | Testing implementation details (user behavior), not internals. |
| **E2E Testing** | Playwright | Reliable end-to-end testing for critical user journeys. |

## 3. Directory Structure (Layer-First)

We utilize a **Layer-First** architecture to group code by its technical role. This makes it easier to navigate the codebase as it grows.

```
src/
├── app/                 # Next.js App Router (Routing layer)
│   ├── page.tsx         # Route handlers & Server Components
│   └── layout.tsx       # Root layout & Providers
│
├── components/          # Shared UI Components (Presentation layer)
│   ├── ui/              # Dumb/Genetic components (Button, Input)
│   └── domain/          # Business logic aware components (TypingArea)
│
├── hooks/               # Logic isolation (Logic layer)
│   └── useGameEngine.ts # Example: core typing logic
│
├── services/            # Data Access (Data layer)
│   └── api.ts           # API clients
│
├── store/               # Global State (State layer)
│   └── useStore.ts      # Zustand stores
│
└── lib/                 # Shared Utilities
    └── utils.ts
```

## 4. Key Concepts

### State Management
We separate state into two categories:
1.  **Server State**: Data that lives on the server (e.g., text content, user profile). Managed by **TanStack Query**.
2.  **Client State**: Ephemeral UI state (e.g., current wpm, typed characters). Managed by **Zustand**.

### Data Fetching
- **Server Components**: Fetch initial data directly in `page.tsx`.
- **Client Components**: Use `useQuery` hooks to fetch or revalidate data on interaction.

## 5. Testing Strategy

We follow a TDD approach with three tiers:

1.  **Logic (Unit Tests)**: Test complex logic (hooks, utils) in isolation using Vitest.
    *   *Example*: Verify `calculateWPM()` returns correct values.
2.  **Interaction (Component Tests)**: Test that components render and respond to user events using Vitest + RTL.
    *   *Example*: Verify typing into `TypingInput` updates the visual display.
3.  **Flow (E2E Tests)**: Test complete user journeys using Playwright.
    *   *Example*: A user can start a game, type a sentence, and see their score.
