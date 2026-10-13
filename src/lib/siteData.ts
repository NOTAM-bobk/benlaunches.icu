import exploreJson from "../../config/explore.json";
import categoriesJson from "../../config/categories.json";
import sitesJson from "../../config/sites.json";
import siteJson from "../../config/site.json";
import trendingJson from "../../config/trending.json";

export interface SiteCategory {
  id: string;
  label: string;
  blurb?: string;
}

/** One question/answer pair on an auto-generated detail page. */
export interface SiteFaqItem {
  question: string;
  answer: string;
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
  /**
   * The rest of the record is the same shape a submission arrives in. Every
   * field is optional, and the detail page renders a section only when its data
   * is actually there — so a site never needs a hand-written page.
   */
  tagline?: string;
  useCases?: string[];
  alternatives?: string[];
  pricing?: string;
  faq?: SiteFaqItem[];
  openSource?: boolean;
  /** ISO timestamp, set for entries that came through the review queue. */
  submittedAt?: string;
  source?: "config" | "submitted";
}

export interface SiteCollection {
  id: string;
  title: string;
  description: string;
  siteSlugs: string[];
}

export interface TrendingConfig {
  topLimit: number;
  title: string;
  tagline: string;
  boost: Record<string, number>;
  exclude: string[];
}

export interface ExploreConfig {
  featuredSlugs: string[];
  featuredCount: number;
  rowsPerPage: number;
  newAdditionsLimit: number;
  featuredSitesLimit: number;
  trendingPreviewCount: number;
  collections: SiteCollection[];
}

/* ---------------- normalising the config files ---------------- */

/**
 * Folds the free-text fields submissions use ("one per line") and the array
 * form the config files can use into one list.
 */
export function asLines(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split("\n")
      : [];
  return raw.map((line) => String(line).trim()).filter(Boolean);
}

/** "Question? Answer." per line, or { question, answer } objects. */
export function asFaq(value: unknown): SiteFaqItem[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split("\n")
      : [];
  const items: SiteFaqItem[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === "object") {
      const record = entry as { question?: unknown; answer?: unknown };
      const question = String(record.question ?? "").trim();
      if (question) items.push({ question, answer: String(record.answer ?? "").trim() });
      continue;
    }
    const text = String(entry ?? "").trim();
    if (!text) continue;
    const [head, ...rest] = text.split("?");
    const question = head?.trim() ?? text;
    items.push({
      question: rest.length > 0 ? `${question}?` : question,
      answer: rest.join("?").trim(),
    });
  }
  return items;
}

function normalizeSites(value: unknown): Site[] {
  const parsed = value as { sites?: Partial<Site>[] } | null | undefined;
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
    tagline: site.tagline,
    useCases: asLines(site.useCases),
    alternatives: asLines(site.alternatives),
    pricing: site.pricing,
    faq: asFaq(site.faq),
    openSource: site.openSource === true ? true : undefined,
    submittedAt: site.submittedAt,
    source: site.source ?? "config",
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

export const sites = normalizeSites(sitesJson);
export const categories = normalizeCategories(categoriesJson);
export const collections = normalizeCollections(explore.collections);

export const trendingConfig: TrendingConfig = {
  topLimit: trending.topLimit ?? sites.length,
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
  collections,
};

/** "All" first, then the categories from config/categories.json. */
export const categoryFilters: SiteCategory[] = [
  { id: "all", label: "All" },
  ...categories,
];

export function categoryById(id: string): SiteCategory | undefined {
  return categories.find((category) => category.id === id);
}

export function categoryLabel(id: string): string {
  if (id === "all") return "All";
  return categoryById(id)?.label ?? id;
}

export function sitesInCategory(list: Site[], categoryId: string): Site[] {
  if (categoryId === "all") return list;
  return list.filter((site) => site.category === categoryId);
}

export function sitesByCategory(categoryId: string): Site[] {
  return sitesInCategory(sites, categoryId);
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

/* ---------------- list helpers (shared with the live directory) ---------------- */

/** Ranked copy of any list, newest launch breaking ties. */
export function sortByRank(list: Site[]): Site[] {
  return [...list].sort(byRank);
}

/** Free-text match over name, description, tags and category. */
export function searchList(list: Site[], query: string): Site[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (site) =>
      site.name.toLowerCase().includes(q) ||
      site.description.toLowerCase().includes(q) ||
      site.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      site.category.toLowerCase().includes(q),
  );
}

/** Newest launch first, for the "new additions" rows. */
export function newestFirst(list: Site[], count = 10, offset = 0): Site[] {
  return [...list]
    .sort((a, b) => (b.launched ?? "").localeCompare(a.launched ?? ""))
    .slice(offset, offset + count);
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
  return newestFirst(sites, count, offset);
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

/** Ranked sites with the featured picks removed. */
export function featuredSiteRows(count = 40): Site[] {
  const featured = new Set(featuredSites().map((site) => site.slug));
  return rankedSites()
    .filter((site) => !featured.has(site.slug))
    .slice(0, count);
}

export function searchSites(query: string): Site[] {
  return searchList(sites, query);
}
