---
description: how to deploy the application to Cloudflare Pages (Workers)
---

This project uses **TanStack Start** with **Nitro** configured for **Cloudflare Pages**. Cloudflare Pages uses Cloudflare Workers under the hood for server-side logic.

### 1. Build the Application
Run the build command to generate the production-ready assets.
```bash
npm run build
```

### 2. Verify Output
Nitro will generate the deployment-ready files in the `dist/` directory.

### 3. Deploy using Wrangler
Use `wrangler` to deploy the `dist/` folder to Cloudflare Pages.
// turbo
```bash
npx wrangler pages deploy dist
```

> [!NOTE]
> If it's your first time, you might need to login using `npx wrangler login`.
