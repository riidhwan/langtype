---
name: Project Standards
description: Ensures the agent adheres to the established architecture and code style guides by consulting the `docs/` directory before any implementation.
---

# Project Standards Skill

This skill ensures that every technical decision and code implementation aligns with the project's core documentation.

## Core Directives

### 1. Consult Documentation First
- **BEFORE** writing any code, creating new components, or refactoring existing logic, you **MUST** read the relevant files in the `docs/` directory.
- Specifically:
    - [Architecture Documentation](file:///home/dhani/project/langtype/docs/architecture.md)
    - [Code Style Guide](file:///home/dhani/project/langtype/docs/code_style.md)

### 2. Adhere to the Tech Stack
- **Framework**: TanStack Start (Vite-based) with TanStack Router for file-based routing.
- **State Management**: Use **Zustand** for client state, **TanStack Query** for server state.
- **Styling**: All styles must use **Tailwind CSS**.
- **Testing**: Follow the **TDD workflow** (Vitest for unit/component, Playwright for E2E).
- **Deployment**: Cloudflare Pages via Nitro.

### 3. Maintain Folder Structure
- Respect the **Layer-First** directory structure.
- Routes go in `src/routes/` using TanStack Router file conventions.
- Keep business logic in `hooks/`, `services/`, or `store/` — not in route files.

### 4. Route File Conventions
- `__root.tsx` - Root layout with `<HeadContent />` and `<Scripts />`
- `index.tsx` - Index route for a path
- `$param.tsx` - Dynamic route parameter (e.g., `collections.$id.tsx`)
- Use `createFileRoute` with `loader` for server-side data fetching.

### 5. Code Consistency
- Follow the naming conventions defined in the [Code Style Guide](file:///home/dhani/project/langtype/docs/code_style.md).
- Use the `cn()` utility for Tailwind class management.

## Example Workflow

**User**: "Implement the typing game logic."

**Standard-Minded Response**:
"I will implement the typing game logic. Before I begin, I am reviewing the `docs/architecture.md` to ensure I place the logic in the correct layer (e.g., a custom hook in `src/hooks/`) and `docs/code_style.md` for naming conventions. I will also start by writing a Vitest unit test in `src/hooks/__tests__` following our TDD commitment."
