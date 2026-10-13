import { asFaq, asLines, type Site } from "./siteData";
import type { Submission } from "./submissions";

/**
 * Turning an approved submission into a directory entry. Kept apart from the
 * provider below so this stays a plain module of functions.
 */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

/** A readable, stable slug for a submitted URL: "example.com/app" -> "example-app". */
export function siteSlugFromUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const host = slugify(hostname.replace(/^www\./, "").split(".")[0] ?? "");
    const path = slugify(pathname);
    return slugify(path ? `${host}-${path}` : host);
  } catch {
    return "";
  }
}

/** The optional half of a submission, in the shape the detail page expects. */
export function submissionMeta(submission: Submission): Partial<Site> {
  return {
    tagline: submission.tagline || undefined,
    useCases: asLines(submission.useCases),
    alternatives: asLines(submission.alternatives),
    pricing: submission.pricing || undefined,
    faq: asFaq(submission.faq),
    openSource: submission.openSource ? true : undefined,
    submittedAt: submission.reviewedAt ?? submission.createdAt,
  };
}

function uniqueSlug(base: string, taken: Map<string, number>, fallback: string): string {
  const seed = base || slugify(fallback) || fallback.slice(0, 8);
  if (!taken.has(seed)) return seed;
  for (let n = 2; n < 200; n++) {
    const candidate = `${seed}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${seed}-${Date.now()}`;
}

/**
 * Approved submissions join the list the config files describe. A submission
 * that matches a site already in the config tops up its missing metadata
 * instead of duplicating it; anything new is appended as its own entry, which
 * is what gives it a category chip, a row in the directory, and a generated
 * page at /sites/<slug>.
 */
export function mergeSubmittedSites(base: Site[], submissions: Submission[]): Site[] {
  const merged: Site[] = base.map((site) => ({ ...site, source: site.source ?? ("config" as const) }));
  const indexByUrl = new Map<string, number>();
  const indexBySlug = new Map<string, number>();
  merged.forEach((site, index) => {
    indexByUrl.set(normalUrl(site.url), index);
    indexBySlug.set(site.slug, index);
  });

  for (const submission of submissions) {
    const url = normalUrl(submission.url);
    const slug = siteSlugFromUrl(submission.url);
    const found = indexByUrl.get(url) ?? (slug ? indexBySlug.get(slug) : undefined);
    const meta = submissionMeta(submission);

    if (found !== undefined) {
      const site = merged[found]!;
      merged[found] = {
        ...site,
        description: site.description || submission.description || submission.tagline,
        tagline: site.tagline ?? meta.tagline,
        useCases: site.useCases?.length ? site.useCases : meta.useCases,
        alternatives: site.alternatives?.length ? site.alternatives : meta.alternatives,
        pricing: site.pricing ?? meta.pricing,
        faq: site.faq?.length ? site.faq : meta.faq,
        openSource: site.openSource ?? meta.openSource,
        submittedAt: site.submittedAt ?? meta.submittedAt,
      };
      continue;
    }

    const entry: Site = {
      id: `submitted-${submission.id}`,
      name: submission.name,
      slug: uniqueSlug(slug, indexBySlug, submission.name || submission.id),
      url: submission.url,
      description: submission.description || submission.tagline || "No description yet.",
      category: submission.categories[0] ?? "uncategorized",
      tags: submission.categories,
      launched: meta.submittedAt?.slice(0, 10),
      source: "submitted",
      ...meta,
    };
    indexByUrl.set(url, merged.length);
    indexBySlug.set(entry.slug, merged.length);
    merged.push(entry);
  }

  return merged;
}
