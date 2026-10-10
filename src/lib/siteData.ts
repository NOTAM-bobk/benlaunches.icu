import exploreJson from "../../config/explore.json";
import categoriesJson from "../../config/categories.json";
import sitesJson from "../../config/sites.json";
import siteJson from "../../config/site.json";
import trendingJson from "../../config/trending.json";
import changelogJson from "../../config/changelog.json";

export interface SiteCategory {
  id: string;
  label: string;
  blurb?: string;
}

export interface Site {
  id: string;
  name: string;
  slug: string;
  url: string;
  description: string;
  category: string;
  tags: string[];
  trending?: number;
  launched?: string;
  /** A listing a person has checked and marked as verified. */
  verified?: boolean;
  /**
   * Any field beyond the ones above, kept as readable text. Listings carry the
   * details that came in with a submission (tagline, pricing, FAQ, …), and the
   * site page prints whatever is there without needing a code change.
   */
  extras?: Record<string, string>;
}

export interface SiteCollection {
  id: string;
  title: string;
  description: string;
  siteSlugs: string[];
}

export interface TrendingConfig {
  /** How many sites the trending page shows. `0` ranks every listed site. */
  topLimit: number;
  title: string;
  tagline: string;
  boost: Record<string, number>;
  exclude: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export interface ChangelogConfig {
  /** The version the site is on right now; printed in the footer. */
  version: string;
  updated?: string;
  intro?: string;
  entries: ChangelogEntry[];
}

export interface ExploreConfig {
  featuredSlugs: string[];
  featuredCount: number;
  rowsPerPage: number;
  newAdditionsLimit: number;
  featuredSitesLimit: number;
  trendingPreviewCount: number;
  /** Slugs for the home page's "very interesting" section, in display order. */
  interestingSlugs: string[];
  /** Hand-picked directory slugs featured after "Very Interesting". */
  editorsPickSlugs: string[];
  collections: SiteCollection[];
}

/* ---------------- normalising the config files ---------------- */

/** The fields a listing is expected to have; everything else is extra detail. */
const SITE_FIELDS = new Set([
  "id",
  "name",
  "slug",
  "url",
  "description",
  "category",
  "tags",
  "trending",
  "launched",
  "verified",
]);

/** Any JSON value as one line of readable text, or "" when there is nothing to show. */
function describeValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.map(describeValue).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => {
        const text = describeValue(entry);
        return text ? `${humanizeKey(key)}: ${text}` : "";
      })
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

/** Extra listing detail, keyed the way it was written in the JSON. */
function extraDetails(site: Record<string, unknown>): Record<string, string> | undefined {
  const extras: Record<string, string> = {};
  for (const [key, value] of Object.entries(site)) {
    if (SITE_FIELDS.has(key)) continue;
    const text = describeValue(value);
    if (text) extras[key] = text;
  }
  return Object.keys(extras).length > 0 ? extras : undefined;
}

function normalizeSites(value: unknown): Site[] {
  const parsed = value as { sites?: Array<Partial<Site> & Record<string, unknown>> } | null | undefined;
  if (!Array.isArray(parsed?.sites)) return [];
  return parsed.sites.map((site) => ({
    id: site.id ?? site.slug ?? crypto.randomUUID(),
    name: site.name ?? "Untitled",
    slug: site.slug ?? site.id ?? "untitled",
    url: site.url ?? "#",
    description: site.description ?? "No description yet.",
    category: site.category ?? "uncategorized",
    tags: Array.isArray(site.tags) ? site.tags : [],
    trending: typeof site.trending === "number" ? site.trending : undefined,
    launched: site.launched,
    verified: site.verified === true,
    extras: extraDetails(site),
  }));
}

function normalizeCategories(value: unknown): SiteCategory[] {
  const parsed = value as { categories?: Partial<SiteCategory>[] } | null | undefined;
  if (!Array.isArray(parsed?.categories)) return [];
  return parsed.categories.map((category) => ({
    id: category.id ?? "uncategorized",
    label: category.label ?? category.id ?? "Uncategorized",
    blurb: category.blurb,
  }));
}

function normalizeCollections(value: unknown): SiteCollection[] {
  if (!Array.isArray(value)) return [];
  return (value as Partial<SiteCollection>[]).map((collection) => ({
    id: collection.id ?? crypto.randomUUID(),
    title: collection.title ?? "Collection",
    description: collection.description ?? "",
    siteSlugs: Array.isArray(collection.siteSlugs) ? collection.siteSlugs : [],
  }));
}

const site = siteJson as {
  name?: string;
  tagline?: string;
  description?: string;
  url?: string;
  keywords?: string[];
  author?: string;
  links?: { github?: string; contact?: string };
};

const trending = trendingJson as Partial<TrendingConfig> & {
  boost?: Record<string, number>;
  exclude?: string[];
};

const explore = exploreJson as Partial<ExploreConfig> & { collections?: unknown };

/* ---------------- exports ---------------- */

export const siteName = site.name ?? "Launched Sites";
export const siteTagline = site.tagline ?? "A small list of launched sites.";
export const siteDescription = site.description ?? siteTagline;
export const siteUrl = (site.url ?? "https://example.com").replace(/\/+$/, "");
export const siteKeywords = site.keywords ?? [];
export const siteAuthor = site.author ?? siteName;
export const siteLinks = site.links ?? {};

export const changelog: ChangelogConfig = {
  version: changelogJson.version ?? "0.0.0",
  updated: changelogJson.updated,
  intro: changelogJson.intro,
  entries: changelogJson.entries ?? [],
};

/** The version shown in the footer and at the top of the changelog. */
export const appVersion = changelog.version;

export const sites = normalizeSites(sitesJson);
export const categories = normalizeCategories(categoriesJson);
export const collections = normalizeCollections(explore.collections);

export const trendingConfig: TrendingConfig = {
  topLimit:
    typeof trending.topLimit === "number" && trending.topLimit > 0
      ? trending.topLimit
      : sites.length,
  title: trending.title ?? "Trending",
  tagline: trending.tagline ?? "Most active this week.",
  boost: trending.boost ?? {},
  exclude: trending.exclude ?? [],
};

export const exploreConfig: ExploreConfig = {
  featuredSlugs: explore.featuredSlugs ?? [],
  featuredCount: explore.featuredCount ?? 2,
  rowsPerPage: explore.rowsPerPage ?? 10,
  newAdditionsLimit: explore.newAdditionsLimit ?? 40,
  featuredSitesLimit: explore.featuredSitesLimit ?? 40,
  trendingPreviewCount: explore.trendingPreviewCount ?? 3,
  interestingSlugs: explore.interestingSlugs ?? [],
  editorsPickSlugs: explore.editorsPickSlugs ?? [],
  collections,
};

/** Every category in the config, including the ones no listing uses yet. */
export const categoryChoices: SiteCategory[] = categories;

/** Categories at least one listing is filed under, in config order. */
const usedCategoryIds = new Set(sites.map((site) => site.category));

/** Ids a listing uses that the config has no entry for, so they still show up. */
const unlistedCategories: SiteCategory[] = [...usedCategoryIds]
  .filter((id) => id !== "all" && !categories.some((category) => category.id === id))
  .sort()
  .map((id) => ({ id, label: humanizeKey(id) }));

/**
 * What the filter row and the side menu offer: "All", then the categories that
 * have at least one listing. A niche category added to the config stays out of
 * the way until a site uses it, so nothing leads to an empty page.
 */
export const categoryFilters: SiteCategory[] = [
  { id: "all", label: "All" },
  ...categories.filter((category) => usedCategoryIds.has(category.id)),
  ...unlistedCategories,
];

export function categoryById(id: string): SiteCategory | undefined {
  return categories.find((category) => category.id === id);
}

/** Short words that read better in caps when a listing uses them lowercase. */
const ACRONYMS = new Set(["faq", "seo", "url", "api", "rss", "id", "ui", "ux", "css", "html"]);

/** "targetAudience" -> "Target Audience", "faq" -> "FAQ", "FAQ" stays "FAQ". */
export function humanizeKey(key: string): string {
  const words = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      return /^[A-Z0-9]{2,}$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function categoryLabel(id: string): string {
  if (id === "all") return "All";
  return categoryById(id)?.label ?? id;
}

export function sitesByCategory(categoryId: string): Site[] {
  if (categoryId === "all") return sites;
  return sites.filter((site) => site.category === categoryId);
}

export function categoryCount(categoryId: string): number {
  return sitesByCategory(categoryId).length;
}

export function siteBySlug(slug: string): Site | undefined {
  return sites.find((site) => site.slug === slug);
}

export function sitesBySlugs(slugs: string[]): Site[] {
  return slugs
    .map((slug) => siteBySlug(slug))
    .filter((site): site is Site => Boolean(site));
}

export function collectionSites(collection: SiteCollection): Site[] {
  return sitesBySlugs(collection.siteSlugs);
}

export function collectionById(id: string): SiteCollection | undefined {
  return collections.find((collection) => collection.id === id);
}

/** Effective ranking score: stored score + any editorial boost. */
export function rankScore(site: Site): number {
  return (site.trending ?? 0) + (trendingConfig.boost[site.slug] ?? 0);
}

/** Highest score first, newest launch as the tie-breaker. */
function byRank(a: Site, b: Site): number {
  const diff = rankScore(b) - rankScore(a);
  if (diff !== 0) return diff;
  return (b.launched ?? "").localeCompare(a.launched ?? "");
}

export function rankedSites(): Site[] {
  const excluded = new Set(trendingConfig.exclude);
  return sites.filter((site) => !excluded.has(site.slug)).sort(byRank);
}

export function trendingSites(count = 6, offset = 0): Site[] {
  return rankedSites().slice(offset, offset + count);
}

/** Newest launch date first. */
export function newAdditions(count = 10, offset = 0): Site[] {
  return [...sites]
    .sort((a, b) => (b.launched ?? "").localeCompare(a.launched ?? ""))
    .slice(offset, offset + count);
}

/** The home hero picks, falling back to the top ranked sites. */
export function featuredSites(): Site[] {
  const picked = sitesBySlugs(exploreConfig.featuredSlugs);
  if (picked.length >= exploreConfig.featuredCount) {
    return picked.slice(0, exploreConfig.featuredCount);
  }
  const filler = rankedSites().filter((site) => !picked.includes(site));
  return [...picked, ...filler].slice(0, exploreConfig.featuredCount);
}

/** The hand-picked "very interesting" picks, in the order the config lists them. */
export function interestingSites(): Site[] {
  return sitesBySlugs(exploreConfig.interestingSlugs);
}

/** The hand-picked "Editors' Picks", in the order the config lists them. */
export function editorsPicks(): Site[] {
  return sitesBySlugs(exploreConfig.editorsPickSlugs);
}

/** Ranked sites with the featured picks removed. */
export function featuredSiteRows(count = 40): Site[] {
  const featured = new Set(featuredSites().map((site) => site.slug));
  return rankedSites()
    .filter((site) => !featured.has(site.slug))
    .slice(0, count);
}

export function searchSites(query: string): Site[] {
  const q = query.trim().toLowerCase();
  if (!q) return sites;
  return sites.filter(
    (site) =>
      site.name.toLowerCase().includes(q) ||
      site.description.toLowerCase().includes(q) ||
      site.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      site.category.toLowerCase().includes(q),
  );
}
