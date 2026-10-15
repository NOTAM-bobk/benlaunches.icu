# Boring Internet

A quiet directory of launched sites. Everything on the page comes out of editable
files in `config/`. There are two server-side pieces: a small Cloudflare Worker
that counts trending votes, and three Vercel functions in `api/` that take card
payments through PayPal (see [Payments](#payments-paypal-checkout)).

## Editing the site: the `config/` folder

Everything on the site comes from the JSON files in `config/`. Edit them and
redeploy — there is no CMS and nothing is fetched at build time.

| File | What it controls |
| --- | --- |
| `config/site.json` | Brand name, tagline, description, canonical URL, keywords, social links |
| `config/sites.json` | Every site: `name`, `slug`, `url`, `description`, `category`, `tags`, `trending` (starting score), `launched`, plus any extra detail fields |
| `config/categories.json` | Categories used by the filters, the side navigation, and the counts |
| `config/trending.json` | `topLimit` for the trending page (`0` ranks every listed site), plus a `boost` map and an `exclude` list |
| `config/explore.json` | Home page: featured picks, "Very Interesting," editor picks, row size, section limits, and collections |
| `config/blog.json` | Posts with their full body (`blocks`: `p`, `h2`, `quote`, `ul`) |
| `config/launches.json` | The "Launches this week" ticker heading; the sites themselves come from recent `launched` dates |
| `config/services.json` | Every paid placement and one-off service: name, price, unit, copy, and the long-form page at `/services/<id>` |
| `config/checkout.json` | Checkout copy: page headings, the payment promises, the contact block (`hello@base31.org` / `612 444 3853`), the "not switched on" wording, and the receipt text |

**Show a launch** → set a site's `launched` date in `config/sites.json`. The
home-page ticker automatically selects the newest sites launched in the last
seven days, shows at most five, and rotates through them. `config/launches.json`
only changes the section title.

**Add a site** → append an object to `config/sites.json` (keep `slug` unique and
stable — votes are stored under it), then add the slug to a collection in
`config/explore.json` or to `boost` in `config/trending.json` if it should rank
higher out of the gate.

**Open a site's page** → every listing gets its own screen at `/sites/<slug>`:
the name, the link out, the category, tags, launch date, votes, rank, the
collections it sits in, and anything else the listing carries. Any field beyond
the ones above is printed there as-is (for example `tagline`, `pricing`,
`faq`), so details that came in with a submission can be pasted straight into
`config/sites.json`.

**Pick something interesting** → the members of `interestingSlugs` in
`config/explore.json` become the home page's "Very Interesting" section, in the
order you list them. The section disappears while the list is empty.

**Pick editor recommendations** → add site slugs to `editorsPickSlugs` in
`config/explore.json`. They appear beneath "Very Interesting" in that order.

**Open a collection** → every entry in the `collections` array of
`config/explore.json` gets its own page at `/collections/<id>`, with the
collection name, its blurb, and a link out to each site. `/collections` lists
them all. Run `bun run sitemap` so the new pages are indexed.

**Compare two sites** → `/this-or-that` frames two random listings side by side
and takes one vote for whichever is better; the winner gets the same vote the
trending list counts and the next pair appears immediately. No config: the
pairs are drawn from `config/sites.json`.

**Advertise** → `/advertise` lists the promoted placements and one-off services,
priced from `config/services.json`. Each one has its own page at
`/services/<id>` with a **Buy now** button, which puts it in the basket and opens
`/checkout`. Change a price in one place (`config/services.json`) and the cards,
the service pages, the basket, and the amount charged all follow. After
submitting a site, the confirmation screen generates an iframe badge snippet that
points to the standalone `/embed` route.

**Write a post** → append an object to `config/blog.json` with `slug`, `title`,
`description`, `date`, `tags`, `excerpt`, and `blocks`. It appears on `/blog`
and gets its own readable page at `/blog/<slug>`.

There is nothing to upload per site: each row tries the site's own
`/favicon.ico`, then a keyless icon lookup for the domain, then falls back to a
monogram tile built from the name.

## Payments (PayPal checkout)

`/checkout` is a clean single-column page: the basket, what it costs, the contact
details, and one PayPal button. `/checkout/success` is the receipt.

**The browser never decides a price.** It sends ids and quantities; the server
looks each one up in `config/services.json`, works out the total, and creates the
PayPal order itself.

| Route | What it does |
| --- | --- |
| `GET /api/paypal/config` | Public client id and environment for the checkout page — never the secret |
| `POST /api/paypal/create-order` | Prices the basket from config, then creates a PayPal order |
| `POST /api/paypal/capture-order` | Captures the approved order, requires `COMPLETED`, and reports what was paid |

Both POST routes are same-origin only and answer `503 checkout_offline` (rather
than failing) while the keys below are missing, and the checkout page shows a
"not switched on yet" panel with the contact details instead of a pay button.

### Setup

1. Create a PayPal app at <https://developer.paypal.com/dashboard/applications>
   (there is a Sandbox tab and a Live tab, each with its own pair of keys).
2. Set these in **Vercel → Project → Settings → Environment Variables**, then
   **redeploy** — environment variables only apply to new deployments:

   | Name | Value |
   | --- | --- |
   | `PAYPAL_CLIENT_ID` | from your PayPal app |
   | `PAYPAL_CLIENT_SECRET` | from your PayPal app (server-only) |
   | `PAYPAL_ENV` | `sandbox` (default) or `production` |
   | `PAYPAL_CURRENCY` | optional, defaults to `USD` |

3. For local development, `cp .env.example .env.local` and paste the sandbox
   keys in. `bun run dev` mounts the same three handlers at the same paths, so
   the checkout page works locally instead of falling back to the offline panel.
   `.env` and `.env.local` are gitignored; never prefix these with `VITE_`, or
   Vite would inline them into the browser bundle.

Two things worth knowing: a price written as `/ week` is **charged once** for a
seven-day run (nothing recurs), and `vercel.json` keeps `/api` out of the
single-page catch-all rewrite, so the functions are reachable.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Vite dev server, with the `api/` payment handlers mounted |
| `bun run build` | Typecheck and build to `dist/` |
| `bun run icons` | Regenerate the icon set (see below) |
| `bun run sitemap` | Regenerate `public/sitemap.xml` and `public/robots.txt` from `config/` |
| `bun run lint` | oxlint |

Run `bun run sitemap` after adding sites or posts so search engines see them.

## Icons

`bun run icons` (`scripts/generate-icons.mjs`, no dependencies) draws the mark —
an ink tile with three stacked bars, the middle one in the brand orange — and
writes:

- `public/favicon.svg` — modern browsers and the tab strip
- `public/favicon.ico` — 16/32/48 px fallback for legacy browsers
- `public/icon-32.png`, `public/icon-192.png`, `public/icon-512.png`
- `public/apple-touch-icon.png` — iOS home screen
- `public/og.png` — 1200×630 card for search results and social previews
- `public/manifest.webmanifest` — installable app metadata

`index.html` and `src/components/SeoHead.tsx` link all of them. The OG tag
points at `og.png`; change the brand colours in the script and re-run it if the
palette moves.

## SEO

- Per-page `<title>`, description, canonical, and Open Graph/Twitter tags come
  from `src/components/SeoHead.tsx`, using `site.json` for defaults.
- Blog posts add `BlogPosting` + `BreadcrumbList` JSON-LD and
  `article:published_time`; the home page adds `WebSite` + `SearchAction`.
- Home, trending, collections, submit, and intent pages (`/discover-websites`,
  `/new-websites`) also publish `ItemList`/`CollectionPage`/`FAQPage` JSON-LD.
- `public/robots.txt` disallows utility routes (`/admin`, `/auth`) and points
  at `public/sitemap.xml`,
  which lists the static pages and every post.
- `public/llms.txt` and `public/llms-full.txt` describe crawl priorities for AI
  agents.
- Canonical URLs always use the production domain from `config/site.json`, so
  preview URLs never get indexed.

## Trending votes, submissions, and admin

The Worker at `cloudflare/votes-worker.js` handles votes, submissions, profiles, and lightweight analytics, all on Workers KV:

| Route | Who | What |
| --- | --- | --- |
| `GET /counts` | public | vote counts per site slug |
| `POST /vote`, `POST /unvote` | public | add or remove one vote |
| `POST /submit` | public | store a pending site submission (`/submit` page) |
| `POST /admin/submissions` | password | list submissions for review (`/admin` page) |
| `POST /admin/review` | password | set a submission to `approved` / `rejected` |
| `GET /profiles/:id/submissions` | public | approved URLs for a public profile; `?private=1` also includes moderation status for the signed-in account UI |
| `POST /analytics/view` | public | count a page view and a daily unique visitor without cookies or IP storage |
| `GET /analytics/stats` | public | rolling 30-day totals, daily chart data, and top pages for `/stats` |
| `GET /monthly-counts?month=YYYY-MM` | public | votes per site for one month |
| `GET /monthly-months` | public | which months have stored votes |
| `GET /health` | public | liveness, whether the admin password is set, submission and purchase counts |

Deployed at `https://boring-internet-votes.sawyerbobk563.workers.dev`.

Setup notes:

1. `wrangler kv namespace create VOTES`, then paste the id into
   `cloudflare/wrangler.toml`
2. `wrangler secret put ADMIN_PASSWORD` — the review queue password, kept as a
   Worker secret (never in the repo or the browser bundle)
3. `wrangler deploy --config cloudflare/wrangler.toml`
4. Set the site's `VITE_VOTES_API_URL` to the Worker URL

`cloudflare/wrangler.toml` also sets `ALLOWED_ORIGIN`, the comma-separated list
of browser origins the Worker answers for (`boringinternet.org`,
`new.base31.org`, `boringinternet.vercel.app`, `www.benlaunches.icu`,
`benlaunches.icu`). Entries are exact origins — scheme and host only. A trailing
slash, a path, or a missing `www.` will not match a real request and the Worker
falls back to the first entry, so vote writes from that site silently fail CORS.

Until `VITE_VOTES_API_URL` is set the pages say so: votes fall back to
localStorage and the submit form is disabled.

**Deploy the Worker after changing it.** The routes the pages call do not all
arrive together, and a stale deployment fails quietly. `/counts` has existed for
a while; `/monthly-counts`, `/monthly-months`, `/analytics/view`,
`/analytics/stats`, `/auth/streak`, `/payments/record` and `/admin/purchases`
were added later. An older Worker answers those with `404`, which the client
reads as "no shared numbers" and falls back to `0` — votes look missing even
though `/counts` still holds them.

Check what is actually live before assuming the frontend is wrong:

```bash
W=https://boring-internet-votes.sawyerbobk563.workers.dev
curl -s $W/health           # {"ok":true} on an old Worker
curl -s $W/monthly-counts?month=$(date -u +%Y-%m)   # 404 => redeploy needed
```

The current `votes-worker.js` answers `/health` with `ok`, `adminConfigured`,
`submissions` and `purchases`. If you only see `ok`, the deployment is behind the
repo. Run `wrangler deploy --config cloudflare/wrangler.toml` and reload.

### Deploying the Worker without a computer

The Worker is plain JavaScript with no build step, so it can be deployed from a
browser. Two ways:

**Cloudflare dashboard (nothing to configure first)**

1. Open <https://dash.cloudflare.com> → **Workers & Pages** →
   **boring-internet-votes** → **Edit code** (the in-dashboard editor).
2. In another tab, open the repo's `cloudflare/votes-worker.js` on GitHub and use
   the **Raw** button, then select all and copy.
3. In the dashboard editor, select the whole file and paste over it, then click
   **Deploy**.
4. The `VOTES` KV binding and the `ADMIN_PASSWORD` secret live in the Worker's
   configuration, not in the code, so they survive a code-only edit. Confirm at
   <https://boring-internet-votes.sawyerbobk563.workers.dev/health> — it should
   list `adminConfigured`, `submissions`, and `purchases`, not just `ok`.

**GitHub Actions (a button after a one-time setup)**

`.github/workflows/deploy-votes-worker.yml` deploys the Worker and then fails if
what is live still looks like the old script. Turn it on once:

1. Repository **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret** → `CLOUDFLARE_ACCOUNT_ID` (the account ID shown on
   the Workers & Pages overview).
2. A second secret, `CLOUDFLARE_API_TOKEN`, from
   <https://dash.cloudflare.com/profile/api-tokens>. The quickest route is the
   **Edit Cloudflare Workers** template; if you build a **Create Custom Token**
   instead, add two rows in the **Permissions** box by picking:
   **Account → Workers Scripts → Edit**, then **+ Add more** and
   **Account → Workers KV Storage → Edit**. Both are needed: the first deploys
   the script, the second confirms the `VOTES` KV binding (`wrangler.toml`
   references it by id, so the token must be able to read it). Leave **Account
   Resources** on *All accounts* or pick the one owning the Worker, then
   **Continue to summary → Create Token** and copy the value.
3. **Actions** → **Deploy votes Worker** → **Run workflow**.

After that, any commit that touches `cloudflare/` redeploys automatically, so the
Worker can be edited straight in GitHub's web editor too. Optional: set a repo
variable `WORKER_URL` if the Worker ever moves off its `workers.dev` address.

The payment queue behind `/admin` reads `VOTES_API_URL` and
`PAYMENTS_ADMIN_PASSWORD` from the *hosting* side, which are separate from
`VITE_VOTES_API_URL` — set both in the host's environment settings (server-only,
never `VITE_`-prefixed) and redeploy, or the queue stays empty even once the
Worker is current.

While the monthly routes are missing, `/trending` still ranks by the lifetime
`/counts` totals instead of showing zeros, so the page is never blank of votes;
it only loses the month-by-month archive until the Worker is current. `/stats`
uses the same signal: an old Worker makes it say it is *waiting on a Worker
redeploy* rather than showing an unexplained error.

When a visitor is signed in through the account service, the submit form sends
the profile ID with the submission. Pending, approved, and rejected URLs appear
on `/profile`; approved URLs are returned on `/users/:id`. Analytics uses a
random browser identifier stored in localStorage only to deduplicate visitors
within a day. It does not store IP addresses or cookies.

Two KV behaviours are worth knowing: writes take up to ~60 seconds to appear
in reads from other locations (the admin page therefore polls every 30s while
unlocked), and neither `/submit` nor `/vote` is rate limited yet, so treat the
queue as trustworthy only behind the password.
