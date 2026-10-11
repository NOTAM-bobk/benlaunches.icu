# SEO and AI SEO Audit — benlaunches.icu

**Audit date:** 2026-10-11  
**Scope:** Crawler-facing SEO, route metadata, social previews, structured data, sitemap/robots, AI crawler guidance, and search intent.  
**Visual scope:** No visual UI or layout changes were made.

## Executive summary

The application already had thoughtful route-level SEO in React: page titles, descriptions, canonical URLs, Open Graph/Twitter tags, JSON-LD, a sitemap, `robots.txt`, `llms.txt`, and `llms-full.txt`. The most important weakness was delivery: the published response for `/` was a Vite SPA shell with an empty `#root` and only a short noscript message. A crawler that does not execute JavaScript therefore could not see the directory’s meaningful homepage content or route-specific metadata.

This pass improves the static crawler baseline and tightens the indexation boundary without changing the visible application design.

## Findings and changes

### 1. Initial HTML had weak crawlable content — fixed at the baseline

**Finding:** The live homepage returned a 200 response but its raw HTML contained an empty app mount. The meaningful page content and route metadata were injected only after JavaScript ran.

**Implemented:** `index.html` now includes:

- A keyword-aware homepage title within a normal search-result length.
- A concise homepage meta description focused on discovery, website-to-website browsing, bored-button intent, and new launches.
- Canonical URL, robots, author, and application metadata.
- Open Graph and Twitter image/title/description metadata.
- Static `WebSite` JSON-LD with `SearchAction`.
- A useful no-JavaScript HTML fallback with an H1, H2, descriptive copy, and links to the primary public routes.

**Limitation:** This is a Vite client-rendered SPA. Deep routes still receive the shared HTML shell before React updates their head. Full per-route initial HTML requires SSR or build-time prerendering; that is the highest-impact remaining technical SEO opportunity.

### 2. Route-level metadata was generally strong — hardened

**Implemented:** `src/components/SeoHead.tsx` now:

- Deduplicates, trims, and caps keyword metadata at eight phrases so page-specific tags do not trigger common SEO-panel warnings.
- Normalizes relative canonical paths safely.
- Adds `og:image:secure_url` and `twitter:domain` to the shared social metadata.

Existing route metadata and JSON-LD were preserved.

### 3. Indexation boundary was too permissive — tightened

**Implemented:**

- Admin metadata is explicitly `noindex`.
- Analytics stats are `noindex`.
- The embedded badge route now emits `noindex` metadata without changing its badge output.
- `robots.txt` additionally excludes checkout, embed, account, stats, users, and unfinished Site Tinder routes.

`robots.txt` is not an access-control mechanism; private data remains protected by application/authentication controls.

### 4. Keyword coverage — aligned with requested intent

The shared site keyword config and homepage metadata now cover:

- `bored button`
- `website to website`
- `discover websites`
- `find websites`
- `new and upcoming websites`
- `website launch`
- `upcoming launches`
- `launch new websites`
- `launched sites directory`

The existing public landing pages already use these phrases naturally in headings, descriptions, and internal links. No keyword stuffing was added to visible copy.

### 5. AI SEO / answer-engine discoverability — improved

`public/llms.txt` now identifies:

- The canonical origin.
- The primary crawl targets as absolute URLs.
- Search intent vocabulary.
- Sitemap, expanded AI guide, and robots URLs.
- Citation guidance telling models to use the linked page as the source of truth and treat rankings, launches, and votes as time-sensitive.
- Routes that should not be summarized.

The existing `llms-full.txt` remains available as the expanded guide.

## Current strengths

- Public directory, collection, blog, and site-detail routes have route-specific React metadata.
- Site and collection detail pages include useful JSON-LD and breadcrumbs.
- Blog posts include `BlogPosting` structured data and published dates.
- Discovery, new websites, collections, and trending pages use `ItemList`/`CollectionPage` structured data.
- The sitemap is generated from config data and includes site, collection, service, and blog routes.
- Canonical URLs consistently use `https://www.benlaunches.icu` in source config.
- Missing detail pages already use `noindex` metadata instead of pretending to be valid content.
- Internal links connect homepage, discovery, new launches, trending, collections, blog, and submit flows.

## Remaining prioritized recommendations

1. **Highest impact — add SSR or build-time prerendering for public routes.** Generate initial HTML for `/`, `/discover-websites`, `/new-websites`, `/trending`, `/collections`, `/collections/:id`, `/blog`, `/blog/:slug`, and `/sites/:slug`. Ensure missing slugs return real 404 responses, not only a client-side not-found view.
2. **Verify post-deploy responses.** Request the homepage, one blog post, one site detail, an invalid site slug, `sitemap.xml`, and `robots.txt` with a normal user agent and a crawler user agent. Confirm status, raw body text, canonical, description, OG tags, and JSON-LD.
3. **Keep sitemap dates factual.** The generator currently assigns today’s date to static URLs without an explicit last-modified value. Prefer config/content modification dates over deployment date to avoid overstating freshness.
4. **Keep the brand naming consistent.** The repository currently uses `Boring Internet` in site config while the header shows `Ben Launches` and the canonical domain is benlaunches.icu. The metadata now uses `Ben Launches` as an alternate name, but a final brand decision would improve entity consistency.
5. **Add Search Console and Bing Webmaster verification** through the deployment provider when ready; this is operational setup rather than a code change.

## Validation checklist

- [x] No visual CSS/layout files changed.
- [x] Homepage title, description, canonical, social metadata, and JSON-LD exist in raw HTML.
- [x] Homepage no-JavaScript fallback contains meaningful crawlable content and internal links.
- [x] Runtime keywords are bounded and deduplicated.
- [x] Private/utility routes have stronger noindex/robots coverage.
- [x] AI crawler guide includes canonical absolute URLs and citation guidance.
- [ ] Full per-route SSR/prerendering remains to be implemented.
- [ ] Production deployment verification should be repeated after publishing these changes.
