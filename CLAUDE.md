# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Docs

@docs/vocabulary.md
@docs/architecture.md
@docs/product-behaviour.md
@docs/design-system.md
@docs/conventions.md
