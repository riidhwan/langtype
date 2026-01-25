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
- All state management must use **Zustand** or **TanStack Query** as prescribed.
- All styles must use **Tailwind CSS**.
- All logic must be tested using the **TDD workflow** (Vitest/Playwright).

### 3. Maintain Folder Structure
- Respect the **Layer-First** directory structure.
- Never add logic to the `app/` directory; keep business logic in `hooks/`, `services/`, or `store/`.

### 4. Code Consistency
- Follow the naming conventions defined in the [Code Style Guide](file:///home/dhani/project/langtype/docs/code_style.md).
- Use the `cn()` utility for Tailwind class management.

## Example Workflow

**User**: "Implement the typing game logic."

**Standard-Minded Response**:
"I will implement the typing game logic. Before I begin, I am reviewing the `docs/architecture.md` to ensure I place the logic in the correct layer (e.g., a custom hook in `src/hooks/`) and `docs/code_style.md` for naming conventions. I will also start by writing a Vitest unit test in `src/hooks/__tests__` following our TDD commitment."
