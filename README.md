# Boring Internet

A quiet directory of launched sites. Everything on the page comes out of one
editable file, and the only server-side piece is a small Cloudflare Worker that
counts trending votes.

## Editing the site: the `config/` folder

Everything on the site comes from six JSON files. Edit them and redeploy —
there is no CMS and nothing is fetched at build time.

| File | What it controls |
| --- | --- |
| `config/site.json` | Brand name, tagline, description, canonical URL, keywords, social links |
| `config/sites.json` | Every site: `name`, `slug`, `url`, `description`, `category`, `tags`, `trending` (starting score), `launched` |
| `config/categories.json` | Categories used by the filters, the side navigation, and the counts |
| `config/trending.json` | `topLimit` for the trending page, plus a `boost` map and an `exclude` list |
| `config/explore.json` | Home page: featured picks, row size, section limits, and the collections |
| `config/blog.json` | Posts with their full body (`blocks`: `p`, `h2`, `quote`, `ul`) |

**Add a site** → append an object to `config/sites.json` (keep `slug` unique and
stable — votes are stored under it), then add the slug to a collection in
`config/explore.json` or to `boost` in `config/trending.json` if it should rank
higher out of the gate. A site can also carry the optional detail-page fields
`tagline`, `useCases`, `alternatives`, `pricing`, `faq`, and `openSource`.

**Every listing gets a page automatically** → `/sites/<slug>` is generated from
the record itself: facts, tags, the collections it appears in, and the sites
nearest to it are all derived, and the optional fields above add their own
sections when present. Nothing per site is written by hand. Sites approved in
the review queue get the same page without a redeploy, because the browser
merges the approved half of the queue (`GET /sites` on the Worker) into the
config list before rendering.

**Open a collection** → every entry in the `collections` array of
`config/explore.json` gets its own page at `/collections/<id>`, with the
collection name, its blurb, and a link out to each site. `/collections` lists
them all. Run `bun run sitemap` so the new pages are indexed.

**Write a post** → append an object to `config/blog.json` with `slug`, `title`,
`description`, `date`, `tags`, `excerpt`, and `blocks`. It appears on `/blog`
and gets its own readable page at `/blog/<slug>`.

There is nothing to upload per site: each row tries the site's own
`/favicon.ico`, then a keyless icon lookup for the domain, then falls back to a
monogram tile built from the name.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Vite dev server |
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
- `public/robots.txt` disallows `/admin` and points at `public/sitemap.xml`,
  which lists the static pages, every post, and every generated `/sites/<slug>`
  page.
- Canonical URLs always use the production domain from `config/site.json`, so
  preview URLs never get indexed.

## Trending votes, submissions, and admin

The Worker at `cloudflare/votes-worker.js` does three things, all on Workers KV:

| Route | Who | What |
| --- | --- | --- |
| `GET /counts` | public | vote counts per site slug |
| `POST /vote`, `POST /unvote` | public | add or remove one vote |
| `POST /submit` | public | store a pending site submission (`/submit` page) |
| `GET /sites` | public | approved submissions, published as directory entries |
| `POST /admin/submissions` | password | list submissions for review (`/admin` page) |
| `POST /admin/review` | password | set a submission to `approved` / `rejected` |
| `GET /health` | public | liveness + whether the admin password is set |

Deployed at `https://boring-internet-votes.sawyerbobk563.workers.dev`.

Setup notes:

1. `wrangler kv namespace create VOTES`, then paste the id into
   `cloudflare/wrangler.toml`
2. `wrangler secret put ADMIN_PASSWORD` — the review queue password, kept as a
   Worker secret (never in the repo or the browser bundle)
3. `wrangler deploy --config cloudflare/wrangler.toml`
4. Set the site's `VITE_VOTES_API_URL` to the Worker URL

Until `VITE_VOTES_API_URL` is set the pages say so: votes fall back to
localStorage, the submit form is disabled, and the directory is the config
files only. Once it is set, approved submissions appear in the directory, in
the category chips, and on their own generated pages. Redeploy the Worker to
pick up the `GET /sites` route.

Two KV behaviours are worth knowing: writes take up to ~60 seconds to appear
in reads from other locations (the admin page therefore polls every 30s while
unlocked), and neither `/submit` nor `/vote` is rate limited yet, so treat the
queue as trustworthy only behind the password.
