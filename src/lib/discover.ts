import { featuredSiteRows, rankedSites, sites, type Site } from "./siteData";

/** How many listings the discover page shows at once. */
export const DISCOVER_COUNT = 18;

/**
 * The listings a discover view shows.
 *
 * With no category chosen it is the page's own list, exactly as before. With
 * one, it is everything filed under that category in ranking order — taken from
 * the whole directory rather than the featured rows, so the number on the chip
 * and the number on the page always agree, and a category never opens empty.
 */
export function discoverList(category: string = "all", count: number = DISCOVER_COUNT): Site[] {
  if (category === "all") return featuredSiteRows(count);

  const rank = new Map(rankedSites().map((site, index) => [site.slug, index]));
  const order = (site: Site) => rank.get(site.slug) ?? Number.MAX_SAFE_INTEGER;

  return sites
    .filter((site) => site.category === category)
    .sort((a, b) => order(a) - order(b))
    .slice(0, count);
}
