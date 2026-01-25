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
Nitro will generate the deployment-ready files in the `.output` directory.

### 3. Deploy using Wrangler
Use `wrangler` to deploy the application. Since this project is configured for **Cloudflare Workers** (via the `cloudflare-module` preset), you should deploy from the output directory:

// turbo
```bash
npx wrangler deploy --cwd .output/server
```

> [!IMPORTANT]
> Ensure your `wrangler.jsonc` (or `wrangler.toml`) is correctly configured. In the Cloudflare Dashboard, make sure you are using the **Workers & Pages > Workers** section, not the Pages section.

> [!NOTE]
> If it's your first time, you might need to login using `npx wrangler login`.
