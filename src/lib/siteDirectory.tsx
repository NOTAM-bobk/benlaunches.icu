import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { posts } from "./posts";
import { mergeSubmittedSites } from "./submittedSites";
import {
  categories,
  categoryById as configCategoryById,
  categoryFilters,
  collections as configCollections,
  exploreConfig,
  newestFirst,
  searchList,
  sites as configSites,
  sitesInCategory,
  sortByRank,
  trendingConfig,
  type Site,
  type SiteCategory,
  type SiteCollection,
} from "./siteData";
import { fetchApprovedSites, type Submission } from "./submissions";

/* ---------------- the directory the app reads from ---------------- */

export interface Directory {
  /** Config sites with every approved submission merged in. */
  sites: Site[];
  categories: SiteCategory[];
  categoryFilters: SiteCategory[];
  collections: SiteCollection[];
  /** Entries that came through the review queue. */
  submittedCount: number;
  rankedSites(): Site[];
  siteBySlug(slug: string): Site | undefined;
  categoryById(id: string): SiteCategory | undefined;
  categoryLabel(id: string): string;
  categoryCount(id: string): number;
  /** Only the categories that actually hold sites, with their counts. */
  categoriesInUse(): Array<{ category: SiteCategory; count: number }>;
  sitesByCategory(id: string): Site[];
  searchSites(query: string): Site[];
  newest(count?: number, offset?: number): Site[];
  latestLaunch?: string;
  featuredSites(): Site[];
  featuredRows(count: number): Site[];
  trending(count: number, offset?: number): Site[];
  collectionMembers(collection: SiteCollection): Site[];
  collectionById(id: string): SiteCollection | undefined;
  collectionsForSite(slug: string): SiteCollection[];
  relatedSites(site: Site, count: number): Site[];
  rankOf(site: Site): number;
  /** Rows for the home page's article strip. */
  recentPosts(count: number): typeof posts;
}

function buildDirectory(list: Site[], submittedCount: number): Directory {
  const sites = list;
  const bySlug = new Map(sites.map((site) => [site.slug, site]));
  const ranked = sortByRank(sites.filter((site) => !trendingConfig.exclude.includes(site.slug)));
  const rankIndex = new Map(ranked.map((site, index) => [site.slug, index]));

  const collectionMembers = (collection: SiteCollection): Site[] =>
    collection.siteSlugs
      .map((slug) => bySlug.get(slug))
      .filter((site): site is Site => Boolean(site));

  const categoriesInUse = categories
    .map((category) => ({
      category,
      count: sites.filter((site) => site.category === category.id).length,
    }))
    .filter((entry) => entry.count > 0);

  const featuredSites = (): Site[] => {
    const picked = exploreConfig.featuredSlugs
      .map((slug) => bySlug.get(slug))
      .filter((site): site is Site => Boolean(site));
    if (picked.length >= exploreConfig.featuredCount) {
      return picked.slice(0, exploreConfig.featuredCount);
    }
    const seen = new Set(picked.map((site) => site.slug));
    const filler = ranked.filter((site) => !seen.has(site.slug));
    return [...picked, ...filler].slice(0, exploreConfig.featuredCount);
  };

  const featuredRows = (count: number): Site[] => {
    const featured = new Set(featuredSites().map((site) => site.slug));
    return ranked.filter((site) => !featured.has(site.slug)).slice(0, count);
  };

  return {
    sites,
    categories,
    categoryFilters,
    collections: configCollections,
    submittedCount,
    rankedSites: () => ranked,
    siteBySlug: (slug) => bySlug.get(slug),
    categoryById: (id) => configCategoryById(id),
    categoryLabel: (id) => (id === "all" ? "All" : configCategoryById(id)?.label ?? id),
    categoryCount: (id) => sitesInCategory(sites, id).length,
    categoriesInUse: () => categoriesInUse,
    sitesByCategory: (id) => sitesInCategory(sites, id),
    searchSites: (query) => searchList(sites, query),
    newest: (count = 10, offset = 0) => newestFirst(sites, count, offset),
    latestLaunch: newestFirst(sites, 1)[0]?.launched,
    featuredSites,
    featuredRows,
    trending: (count, offset = 0) => ranked.slice(offset, offset + count),
    collectionMembers,
    collectionById: (id) => configCollections.find((collection) => collection.id === id),
    collectionsForSite: (slug) =>
      configCollections.filter((collection) => collection.siteSlugs.includes(slug)),
    relatedSites: (site, count) => {
      const tags = new Set(site.tags.map((tag) => tag.toLowerCase()));
      return ranked
        .filter((candidate) => candidate.slug !== site.slug)
        .map((candidate) => ({
          candidate,
          score:
            (candidate.category === site.category ? 2 : 0) +
            candidate.tags.reduce(
              (total, tag) => total + (tags.has(tag.toLowerCase()) ? 1 : 0),
              0,
            ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map((entry) => entry.candidate);
    },
    rankOf: (site) => (rankIndex.has(site.slug) ? rankIndex.get(site.slug)! + 1 : 0),
    recentPosts: (count) => posts.slice(0, count),
  };
}

/** Config-only directory, used before the provider mounts (and during SSR). */
const fallbackDirectory = buildDirectory(configSites.map((site) => ({ ...site })), 0);

const DirectoryContext = createContext<Directory>(fallbackDirectory);

/**
 * Holds the live directory: the config files plus every approved submission,
 * fetched once from the Worker so newly listed sites show up without a rebuild.
 */
export function DirectoryProvider({ children }: { children: ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    let active = true;
    void fetchApprovedSites().then((list) => {
      if (active && list.length > 0) setSubmissions(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => buildDirectory(mergeSubmittedSites(configSites, submissions), submissions.length),
    [submissions],
  );

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>;
}

export function useDirectory(): Directory {
  return useContext(DirectoryContext);
}
