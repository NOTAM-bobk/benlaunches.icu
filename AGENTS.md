# Boring Internet — Base44 Setup Notes

## What this is

A Vite + React 19 + TypeScript + Tailwind CSS v4 app: a hand-curated directory of
launched websites. All page content comes from JSON files in `config/` — there is
no CMS and nothing is fetched at build time.

## Running it

```sh
docker compose -f docker-compose.base44.yml up -d
```

- **Image:** `node:22-slim` (deps installed via `npm ci` from `package-lock.json`).
- **Dev server:** Vite on port 5173, mapped to host port 3000.
- **Live source:** the repo is bind-mounted at `/app`; Vite serves unhashed
  modules so edits appear without image rebuilds. `hmr: false` is set in
  `vite.config.ts`, so changes trigger a full page reload, not hot module swap.
- **Healthcheck:** node one-liner hitting `http://localhost:5173/`.

## External integrations (all optional)

The app boots and renders without any external credentials. Every integration
degrades gracefully:

| Integration | Env vars | Without them |
| --- | --- | --- |
| Supabase (auth, profiles, saved sites) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | `supabase` is `null`; auth/profile/saved-sites pages show "not connected" |
| Cloudflare Worker (votes, submissions, analytics) | `VITE_VOTES_API_URL` | Votes fall back to localStorage; submit form is disabled; stats page shows "not connected" |
| PayPal (checkout) | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` | API routes return `503 checkout_offline`; checkout page shows "not switched on" panel |

PayPal vars are server-only (never `VITE_`-prefixed). The `scripts/dev-api.ts`
Vite plugin mounts the three `api/paypal/*.js` handlers inside the dev server so
checkout works locally when keys are present.

## Sandbox overrides

- `vite.config.ts`: `server.allowedHosts` is set to `.${BASE44_SANDBOX_HOST_DOMAIN}`
  only when `BASE44_PREVIEW_MODE === "1"`, so the preview proxy's host is accepted.
  Without the flag, the original config (no `allowedHosts`) is preserved.
- `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is passed through via compose
  `environment:` (platform-set; Vite >= 6.1 appends it to `allowedHosts`).

## Leftover template file

`src/App.tsx` is the default Vite template component (imports `./assets/hero.png`
which doesn't exist). It is **not imported** by `src/main.tsx` — the real entry
point uses `src/components/AppShell.tsx`. The 500 on `/src/App.tsx` is harmless.

## Package managers

Both `bun.lock` and `package-lock.json` exist. The Base44 compose uses `npm ci`
from `package-lock.json` since `node:22-slim` is pre-cached. The project's own
scripts use `bun run` but the dev command is just `vite`, which works with either.
