import launchesJson from "../../config/launches.json";
import { sites, type Site } from "./siteData";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LAUNCHES = 5;
type LaunchesConfig = { title?: string };
const config = launchesJson as LaunchesConfig;

/** Heading over the ticker; rename it in config/launches.json. */
export const launchesTitle = config.title ?? "Launches this week";

/**
 * The ticker is derived from site `launched` dates, newest first. The rolling
 * seven-day window includes today and never shows more than five listings.
 */
export function launchesThisWeek(now = new Date()): Site[] {
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const weekStart = todayStart - (6 * DAY_MS);
  const todayEnd = todayStart + DAY_MS - 1;

  return sites
    .filter((site) => {
      if (!site.launched || !/^\d{4}-\d{2}-\d{2}$/.test(site.launched)) return false;
      const launchedAt = Date.parse(`${site.launched}T00:00:00.000Z`);
      return Number.isFinite(launchedAt) && launchedAt >= weekStart && launchedAt <= todayEnd;
    })
    .sort((a, b) => (b.launched ?? "").localeCompare(a.launched ?? ""))
    .slice(0, MAX_LAUNCHES);
}
