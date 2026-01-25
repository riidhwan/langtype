# LangType

A typing application for language learners focused on **translation accuracy**. Unlike standard typing tests, users are presented with source text and must type the correct translation.

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (Vite-based full-stack React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand (client) + TanStack Query (server)
- **Testing**: Vitest + React Testing Library + Playwright
- **Deployment**: Cloudflare Pages via Nitro

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

For detailed architecture and code style guidelines, see:
- [Architecture Documentation](./docs/architecture.md)
- [Code Style Guide](./docs/code_style.md)

## Build & Deployment

### Production Build

```bash
npm run build
```

Output will be in `dist/` directory with Cloudflare Worker bundle.

### Deploy to Cloudflare Pages

```bash
npx wrangler --cwd dist/ pages deploy
```

## Learn More

- [TanStack Start Documentation](https://tanstack.com/start)
- [TanStack Router Documentation](https://tanstack.com/router)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Cloudflare Pages](https://pages.cloudflare.com)

## Contributing

Follow the established code style and testing practices. See [Code Style Guide](./docs/code_style.md) for conventions.
