# Ben Launches — development notes

## Stack
React 19 + Vite 8 + Tailwind 4 SPA, TypeScript, react-router 7. Backend is external: Supabase (client) plus two Cloudflare Workers (`cloudflare/votes-worker.js` for votes/submissions, `votes-worker-auth.js` for admin) and serverless PayPal functions in `api/paypal/` (also mounted locally by the `devApi()` Vite plugin in `scripts/dev-api.ts`).

## Sandbox setup (Base44)
- `docker-compose.base44.yml` runs `npm ci && vite dev` on host port 3000 from the bind-mounted source; node:22 image, no rebuild needed for code edits.
- The app boots fine with no secrets: `src/lib/supabase.ts` degrades to `supabaseConnected = false` without `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`, and PayPal/votes features just report missing. PayPal env vars (`PAYPAL_CLIENT_ID/SECRET`, sandbox by default) are only needed when exercising checkout.
- The `devApi()` Vite plugin also loads `.env.local` if present, but `.env.local` is git-ignored — use Base44 secrets instead.

## Quirks
- Vite config sets `hmr: false` and `strictPort: true` (port passed via CLI). After backend-adjacent edits, the preview iframe may need a manual reload.
- `scripts/generate-sitemap.mjs` regenerates **both** `public/sitemap.xml` and `public/robots.txt` from `config/` — run it with `node scripts/generate-sitemap.mjs` (no bun needed) after adding sites/posts/collections. Site-page `lastmod` uses each listing's `launched` date.
- Brand is **Ben Launches** (canonical origin `https://www.benlaunches.icu`, tagline "Get your site discovered"). Older "Boring Internet" references may remain in visible UI copy; metadata and crawler-facing files were migrated.
- `npm run icons` / `npm run sitemap` scripts assume bun in README, but plain node works for the sitemap generator.

## Checks
- `npx tsc -b` (typecheck), `npx oxlint src scripts` (lint; pre-existing warnings are OK, errors are not).
