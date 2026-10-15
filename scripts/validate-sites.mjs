/**
 * Validates the directory before a listing can go live.
 *
 *   node scripts/validate-sites.mjs              # everything, including live URLs
 *   node scripts/validate-sites.mjs --offline    # skip network checks
 *   node scripts/validate-sites.mjs --strict     # warnings fail the run too
 *   node scripts/validate-sites.mjs --timeout 6000
 *
 * It reads the same config files the site does and reports four kinds of
 * problem: duplicate listings, incomplete listings, spammy listings, and URLs
 * that are broken. Errors exit non-zero so a pull request or a push cannot
 * quietly ship a bad entry; warnings still exit zero unless --strict is set.
 *
 * The GitHub Action in .github/workflows/validate-sites.yml runs this on every
 * pull request and on every push that touches config/, so the "Approve &
 * publish" commit is checked too.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(readFileSync(join(ROOT, "config", file), "utf8"));

const args = process.argv.slice(2);
const OFFLINE = args.includes("--offline") || args.includes("--no-network");
const STRICT = args.includes("--strict");
const timeoutIndex = args.indexOf("--timeout");
const TIMEOUT = timeoutIndex >= 0 ? Number(args[timeoutIndex + 1]) || 8000 : 8000;
const CONCURRENCY = 6;

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MIN_DESCRIPTION = 20;
const MAX_FEATURED = 6;

/** Words a directory like this never needs to list. Word-boundary matched. */
const SPAM_WORDS = [
  "casino", "viagra", "cialis", "payday loan", "work from home", "make money fast",
  "forex signals", "binary options", "crypto pump", "buy followers", "cheap followers",
  "escort", "adult dating", "xxx", "porn", "download crack", "keygen", "torrent",
  "essay writing service", "academic ghostwriting", "replica watches", "counterfeit",
];
const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly", "is.gd", "cutt.ly",
  "rebrand.ly", "shorturl.at", "adf.ly", "shorte.st",
]);

let errors = 0;
let warnings = 0;

function error(message) {
  errors += 1;
  console.log(`  ✗ ${message}`);
}

function warn(message) {
  warnings += 1;
  console.log(`  ! ${message}`);
}

function heading(title) {
  console.log(`\n${title}`);
}

function normalizeUrl(raw) {
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${host}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

function findSpam(text) {
  const lower = text.toLowerCase();
  const hits = SPAM_WORDS.filter((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower));
  if (hits.length > 0) return `spam wording: ${hits.join(", ")}`;
  if (/!{3,}|\?{3,}|\${3,}|(\b\w+\b)(\s+\1){3,}/i.test(text)) return "shouting or repeated text";
  return null;
}

const sitesFile = read("sites.json");
const categoriesFile = read("categories.json");
const exploreFile = read("explore.json");
const trendingFile = read("trending.json");

const sites = Array.isArray(sitesFile.sites) ? sitesFile.sites : [];
const categoryIds = new Set((categoriesFile.categories ?? []).map((entry) => entry.id));
const knownSlugs = new Set(sites.map((site) => site.slug));

if (sites.length === 0) {
  error("config/sites.json has no listings at all.");
}

/* ---------------- duplicates and incomplete fields ---------------- */

heading(`Listing shape (${sites.length} listings)`);

const seenIds = new Map();
const seenSlugs = new Map();
const seenUrls = new Map();
const seenNames = new Map();
const urlChecks = [];

for (const [index, site] of sites.entries()) {
  const label = site?.slug ? `"${site.slug}"` : `entry ${index + 1}`;

  if (typeof site?.id !== "string" || site.id.trim().length === 0) error(`${label}: missing id`);
  if (typeof site?.name !== "string" || site.name.trim().length < 2) error(`${label}: missing or too-short name`);
  if (typeof site?.slug !== "string" || !SLUG_RE.test(site.slug)) error(`${label}: slug must be lowercase letters, numbers and dashes`);
  if (typeof site?.url !== "string" || !/^https?:\/\//i.test(site.url)) error(`${label}: url must start with http:// or https://`);
  if (typeof site?.description !== "string" || site.description.trim().length < MIN_DESCRIPTION) {
    error(`${label}: description is missing or shorter than ${MIN_DESCRIPTION} characters`);
  }
  if (typeof site?.category !== "string" || site.category.trim().length === 0) error(`${label}: missing category`);
  if (!Array.isArray(site?.tags) || site.tags.filter((tag) => typeof tag === "string" && tag.trim()).length === 0) {
    error(`${label}: give it at least one tag`);
  }

  if (typeof site?.category === "string" && site.category && !categoryIds.has(site.category)) {
    warn(`${label}: category "${site.category}" is not in config/categories.json`);
  }

  if (typeof site?.id === "string") {
    if (seenIds.has(site.id)) error(`${label}: duplicate id, already used by "${seenIds.get(site.id)}"`);
    else seenIds.set(site.id, site.slug ?? site.name);
  }
  if (typeof site?.slug === "string") {
    if (seenSlugs.has(site.slug)) error(`${label}: duplicate slug`);
    else seenSlugs.set(site.slug, true);
  }
  if (typeof site?.name === "string") {
    const key = site.name.trim().toLowerCase();
    if (seenNames.has(key)) warn(`${label}: name is also used by "${seenNames.get(key)}"`);
    else seenNames.set(key, site.slug ?? site.name);
  }

  const normalized = typeof site?.url === "string" ? normalizeUrl(site.url) : null;
  if (normalized) {
    if (seenUrls.has(normalized)) error(`${label}: duplicate url, also on "${seenUrls.get(normalized)}"`);
    else seenUrls.set(normalized, site.slug ?? site.name);
    try {
      const host = new URL(site.url).hostname.replace(/^www\./, "").toLowerCase();
      if (SHORTENERS.has(host)) warn(`${label}: ${host} hides the real destination`);
    } catch {
      /* the scheme check above already flagged it */
    }
  }

  const prose = `${site?.name ?? ""} ${site?.description ?? ""} ${(site?.tags ?? []).join(" ")}`;
  const spam = findSpam(prose);
  if (spam) error(`${label}: ${spam}`);
  if (typeof site?.name === "string" && site.name.length > 12 && site.name === site.name.toUpperCase()) {
    warn(`${label}: the name is all capitals`);
  }

  if (typeof site?.url === "string" && /^https?:\/\//i.test(site.url)) urlChecks.push({ slug: site.slug, url: site.url, name: site.name });
}

/* ---------------- the featured launch slots ---------------- */

heading("Featured launch slots");

const featured = sites.filter((site) => site.featured === true);
if (featured.length > MAX_FEATURED) {
  warn(`${featured.length} listings are marked "featured": true; the slots show at most ${MAX_FEATURED}`);
}
console.log(`  · ${featured.length} featured${featured.length > 0 ? `: ${featured.map((site) => site.slug).join(", ")}` : ""}`);
for (const site of sites) {
  if (site.featured !== undefined && typeof site.featured !== "boolean") {
    error(`"${site.slug}": featured must be true or false`);
  }
}

/* ---------------- config cross-references ---------------- */

heading("Config cross-references");

for (const collection of exploreFile.collections ?? []) {
  for (const slug of collection.siteSlugs ?? []) {
    if (!knownSlugs.has(slug)) error(`collection "${collection.id}" points at unknown site "${slug}"`);
  }
}
for (const key of ["featuredSlugs", "interestingSlugs", "editorsPickSlugs"]) {
  for (const slug of exploreFile[key] ?? []) {
    if (!knownSlugs.has(slug)) warn(`${key} points at unknown site "${slug}"`);
  }
}
for (const slug of Object.keys(trendingFile.boost ?? {})) {
  if (!knownSlugs.has(slug)) warn(`trending boost points at unknown site "${slug}"`);
}
for (const slug of trendingFile.exclude ?? []) {
  if (!knownSlugs.has(slug)) warn(`trending exclude points at unknown site "${slug}"`);
}

/* ---------------- live URL checks ---------------- */

async function checkUrl({ slug, url }, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "BenLaunches-ListingCheck/1.0 (+https://benlaunches.icu)" },
    });
    const status = response.status;
    if (status >= 200 && status < 400) return { slug, ok: true, status };
    // 403/405/429 usually means the site blocks automated checks, not that it is gone.
    if ([403, 405, 429].includes(status)) return { slug, ok: true, status, blocked: true };
    if (attempt < 2 && status >= 500) return checkUrl({ slug, url }, attempt + 1);
    return { slug, ok: false, status };
  } catch (cause) {
    if (attempt < 2) return checkUrl({ slug, url }, attempt + 1);
    return { slug, ok: false, status: 0, reason: cause?.name === "AbortError" ? "timed out" : "could not connect" };
  } finally {
    clearTimeout(timer);
  }
}

if (OFFLINE) {
  heading("Live URL checks");
  console.log(`  · skipped (--offline), ${urlChecks.length} URLs unchecked`);
} else {
  heading(`Live URL checks (${urlChecks.length} URLs, ${TIMEOUT}ms timeout)`);
  for (let index = 0; index < urlChecks.length; index += CONCURRENCY) {
    const batch = urlChecks.slice(index, index + CONCURRENCY);
    const results = await Promise.all(batch.map((entry) => checkUrl(entry)));
    for (const result of results) {
      if (result.ok && result.blocked) warn(`"${result.slug}" answered HTTP ${result.status} — probably blocking the checker`);
      else if (!result.ok) error(`"${result.slug}" is not reachable (${result.status || result.reason})`);
    }
  }
  console.log(`  · checked ${urlChecks.length} URLs`);
}

/* ---------------- summary ---------------- */

heading("Result");
console.log(`  ${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}`);
if (errors > 0) {
  console.log("  Failing the run. Fix the errors above before merging.");
  process.exitCode = 1;
} else if (STRICT && warnings > 0) {
  console.log("  --strict is on, so the warnings above fail the run.");
  process.exitCode = 1;
} else {
  console.log("  Listings look shippable.");
}
