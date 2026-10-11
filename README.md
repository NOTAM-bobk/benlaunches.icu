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
| `config/sites.json` | Every site: `name`, `slug`, `url`, `description`, `category`, `tags`, `trending` (starting score), `launched`, plus any extra detail fields |
| `config/categories.json` | Categories used by the filters, the side navigation, and the counts |
| `config/trending.json` | `topLimit` for the trending page (`0` ranks every listed site), plus a `boost` map and an `exclude` list |
| `config/explore.json` | Home page: featured picks, "Very Interesting," editor picks, row size, section limits, and collections |
| `config/blog.json` | Posts with their full body (`blocks`: `p`, `h2`, `quote`, `ul`) |
| `config/launches.json` | The "Launches this week" ticker heading; the sites themselves come from recent `launched` dates |

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

**Advertise** → `/advertise` describes draft promoted-placement and verification
prices. Checkout is not connected; the listed amounts are proposals and cannot
be purchased yet. After submitting a site, the confirmation screen generates an
iframe badge snippet that points to the standalone `/embed` route.

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
localStorage and the submit form is disabled.

When a visitor is signed in through the account service, the submit form sends
the profile ID with the submission. Pending, approved, and rejected URLs appear
on `/profile`; approved URLs are returned on `/users/:id`. Analytics uses a
random browser identifier stored in localStorage only to deduplicate visitors
within a day. It does not store IP addresses or cookies.

Two KV behaviours are worth knowing: writes take up to ~60 seconds to appear
in reads from other locations (the admin page therefore polls every 30s while
unlocked), and neither `/submit` nor `/vote` is rate limited yet, so treat the
queue as trustworthy only behind the password.
