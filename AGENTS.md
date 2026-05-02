# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Critical Rules

**Never run `git commit` or `git push` unless the user explicitly asks.** This applies even after completing a task, fixing lint, or running tests successfully. Wait to be asked. When the user does explicitly ask Codex to commit and push, treat that as approval that the pre-commit review gate is satisfied unless the user says otherwise.

## GitHub Issues Workflow

Use GitHub Issues as the durable task queue and task handoff layer.

Before starting implementation, check whether the task already has a GitHub issue. If it does not, create or draft one first unless the change is truly tiny, such as a typo, comment correction, or metadata-only cleanup.

Issue expectations:
- Non-urgent features and fixes use a backlog issue
- Large tasks use one parent issue plus child issues for independently shippable slices
- Small fixes and improvements use a quick-fix issue with the problem, expected result, and verification notes
- Commits should reference the relevant issue with `Refs #N` or `Closes #N` when useful
- For complete, verified issue-backed work, use `Closes #N` when the commit should close the issue on merge or push. Do not downgrade to `Refs #N` solely because a post-commit review might happen; the explicit commit/push request is the review approval unless the user says otherwise.
- When finishing issue-backed work, always consider whether the issue needs a comment summarizing the outcome, verification, remaining risks, blockers, or handoff notes. Comment when it would leave useful durable context; skip it only when the final state is already obvious from the issue, commits, and PR/branch history.
- Close issues only after implementation, tests, docs, and review are complete

When GitHub CLI authentication is available, Codex may create, edit, comment on, and close issues as part of this workflow. If authentication is unavailable, draft the exact issue title/body/labels or issue comment for manual creation.

This workflow is intentionally open to improvement. During every task, watch for friction, ambiguity, repeated manual work, missing templates, weak acceptance criteria, unclear labels, or any other process issue. When a workflow improvement would help, mention it to the user before or during the final report so the user can decide whether to update the workflow.

## Critical Mindset

Do not blindly follow user commands when they appear unsuitable for the project, risky, inconsistent with existing architecture, or when there is a clearly better way to achieve the same goal.

When that happens, explain the concern or better alternative briefly and concretely, then ask whether to proceed with the original request or switch to the recommended approach. If the command is safe, straightforward, and fits the project, proceed normally.

## Commands

```bash
npm run dev           # Start Vite dev server (port 3000)
npm run build         # Production build for Cloudflare Pages
npm run lint          # ESLint
npm test              # Vitest unit/component tests
npm run test:watch    # Vitest in watch mode
npm run test:coverage # Vitest with v8 coverage
npm run test:e2e      # Playwright E2E tests
npm run cf-typegen    # Regenerate Cloudflare Worker types
```

Single test file: `npx vitest run src/hooks/__tests__/useTypingEngine.test.ts`

Deploy: `npx wrangler --cwd dist/ pages deploy`

## Instruction Loading

This file is the entry point, not the full instruction set.

When a task touches an area covered by a linked `@...` file, read that file before acting. Treat linked files as authoritative repository instructions, not optional background docs.

These docs are living documentation. They are not immutable references: when related behavior, architecture, conventions, vocabulary, or design changes, update the corresponding docs in the same task.

Always read:
- `@docs/product-behaviour.md` before changing user-facing flows
- `@docs/architecture.md` before changing shared data flow, stores, services, or routing
- `@docs/design-system.md` before changing UI, layout, styling, routes, or user-facing behavior
- `@docs/conventions.md` before broad refactors, adding new patterns, adding/changing tests, or deciding what verification to run
- `@docs/vocabulary.md` before changing domain terms, labels, challenge wording, or user-facing copy
- `@docs/runbooks/dictionary-update.md` before changing dictionary build, upload, publish, or maintenance workflow

If a linked file that applies to the task cannot be read, stop and ask the user how to proceed. Do not continue with changes that depend on unread repository instructions.

## Working Tree Safety

Before editing, check `git status --short` when the task may touch existing files.

Never revert, overwrite, or clean up user changes unless explicitly asked. If unrelated files are dirty, leave them alone. If dirty files overlap the task, inspect them and work with the existing changes.

## Verification

After code changes, run the narrowest relevant tests first. For route, store, service, or UI changes, also run `npm run build` before reporting completion unless the user asks to skip verification.

If verification cannot run, report why.

## Generated Files

`src/routeTree.gen.ts` is generated by TanStack Router. Do not hand-edit it unless route generation is unavailable or the task requires keeping the working tree consistent after route file changes. Prefer regenerating it through the normal dev/build tooling when possible.

## Git

Never run `git commit` or `git push` unless the user explicitly asks. When the user explicitly asks Codex to commit and push, treat that as approval that the pre-commit review gate is satisfied unless the user says otherwise.

When committing, stage only files relevant to the requested change. Leave local metadata, editor files, and unrelated dirty files uncommitted unless the user explicitly asks to include them.

When asked to commit, inspect recent history with `git log` and follow the established commit message style:
- Use a Conventional Commit subject, such as `feat: ...`, `fix: ...`, `docs: ...`, or `chore: ...`
- Include a detailed body for non-trivial changes
- Explain what changed, why it changed, and any removed or legacy behavior
- Use short paragraphs or bullets matching nearby commit history
- Include a co-author trailer when appropriate, matching prior commits
- Verify the final commit message with `git log -1 --pretty=fuller` before pushing

## Docs

@docs/vocabulary.md
@docs/architecture.md
@docs/product-behaviour.md
@docs/design-system.md
@docs/conventions.md
@docs/runbooks/dictionary-update.md
