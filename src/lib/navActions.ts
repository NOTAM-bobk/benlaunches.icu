import { posts } from "./posts";
import {
  categoryById,
  categoryCount,
  categoryLabel,
  collections,
  collectionSites,
  rankedSites,
  siteBySlug,
  sites,
} from "./siteData";
import { siteDomain } from "./siteTile";

/** One row in the contextual group of the side menu. */
export interface NavAction {
  id: string;
  label: string;
  /** Internal route to navigate to. */
  to?: string;
  /** External link, opened in a new tab. */
  href?: string;
  badge?: string;
}

/** What the side menu shows for the page you are actually on. */
export interface NavContext {
  id: string;
  title: string;
  note?: string;
  actions: NavAction[];
  /** The button at the bottom of the panel, which also changes per page. */
  primary: NavAction;
  secondary: NavAction;
}

const SUBMIT: NavAction = { id: "submit", label: "Submit your site", to: "/submit" };
const TRENDING: NavAction = { id: "trending", label: "Top ranking", to: "/trending" };
const DIRECTORY: NavAction = { id: "directory", label: "Browse the directory", to: "/#all-sites" };
const BORED: NavAction = { id: "bored", label: "I'm bored", to: "/this-or-that" };

function directoryAction(): NavAction {
  return { ...DIRECTORY, badge: String(sites.length) };
}

/**
 * The actions for wherever the visitor is standing: the home page, a category,
 * a search, a listing, the notes, a collection, or one of the games. Everything
 * is derived from the directory, so adding a site changes these rows without
 * touching this file.
 */
export function navContextFor(pathname: string, search: string): NavContext {
  const path = pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search);
  const total = sites.length;
  const listing = path.startsWith("/sites/")
    ? siteBySlug(decodeURIComponent(path.slice("/sites/".length)))
    : undefined;

  if (listing) {
    const domain = siteDomain(listing.url);
    const inCollections = collections.filter((collection) =>
      collection.siteSlugs.includes(listing.slug),
    );
    const actions: NavAction[] = [
      { id: "open", label: `Open ${domain}`, href: listing.url },
      {
        id: "category",
        label: `More in ${categoryLabel(listing.category)}`,
        to: `/?category=${listing.category}#explore`,
        badge: String(categoryCount(listing.category)),
      },
      { ...directoryAction() },
    ];
    if (inCollections[0]) {
      actions.push({
        id: "collection",
        label: inCollections[0].title,
        to: `/collections/${inCollections[0].id}`,
        badge: String(collectionSites(inCollections[0]).length),
      });
    }
    return {
      id: "listing",
      title: "This listing",
      note: categoryLabel(listing.category),
      actions,
      primary: { id: "visit", label: `Visit ${domain}`, href: listing.url },
      secondary: {
        id: "similar",
        label: "More sites like this",
        to: `/?category=${listing.category}#explore`,
      },
    };
  }

  if (path === "/") {
    const query = params.get("q")?.trim() ?? "";
    const categoryId = params.get("category") ?? "all";
    const category = categoryId === "all" ? undefined : categoryById(categoryId);

    if (query) {
      const needle = query.toLowerCase();
      const matches = sites.filter(
        (site) =>
          site.name.toLowerCase().includes(needle) ||
          site.description.toLowerCase().includes(needle) ||
          site.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
          site.category.toLowerCase().includes(needle),
      );
      return {
        id: "search",
        title: "Your search",
        note: `“${query}”`,
        actions: [
          { id: "clear", label: "Clear the search", to: "/#explore" },
          ...matches.slice(0, 3).map((site) => ({
            id: `match-${site.slug}`,
            label: site.name,
            to: `/sites/${site.slug}`,
            badge: siteDomain(site.url),
          })),
          { ...directoryAction() },
        ],
        primary: { ...directoryAction() },
        secondary: SUBMIT,
      };
    }

    if (category) {
      return {
        id: "category",
        title: `Category: ${category.label}`,
        note: `${categoryCount(category.id)} sites`,
        actions: [
          { id: "all", label: "All sites", to: "/#all-sites", badge: String(total) },
          ...collections.slice(0, 2).map((collection) => ({
            id: `collection-${collection.id}`,
            label: collection.title,
            to: `/collections/${collection.id}`,
            badge: String(collectionSites(collection).length),
          })),
          { ...TRENDING },
        ],
        primary: TRENDING,
        secondary: { id: "everything", label: "All categories", to: "/#explore" },
      };
    }

    const arrivals = rankedSites().slice(0, 3);
    return {
      id: "home",
      title: "On this page",
      note: "every listing is checked by hand",
      actions: [
        { id: "all", label: "All sites", to: "/#all-sites", badge: String(total) },
        ...arrivals.map((site, index) => ({
          id: `pick-${site.slug}`,
          label: site.name,
          to: `/sites/${site.slug}`,
          badge: `#${index + 1}`,
        })),
        {
          id: "collections",
          label: "Latest collections",
          to: "/#collections",
          badge: String(collections.length),
        },
      ],
      primary: SUBMIT,
      secondary: BORED,
    };
  }

  if (path === "/discover-websites" || path === "/new-websites") {
    const isNew = path === "/new-websites";
    return {
      id: isNew ? "new" : "discover",
      title: isNew ? "New and upcoming" : "Discover",
      note: isNew ? "the latest launches" : "hand-picked corners of the web",
      actions: [
        { ...directoryAction() },
        { id: "trending", label: "Trending now", to: "/trending" },
        {
          id: "other",
          label: isNew ? "Discover websites" : "New and upcoming",
          to: isNew ? "/discover-websites" : "/new-websites",
        },
      ],
      primary: isNew ? { id: "discover", label: "Discover websites", to: "/discover-websites" } : SUBMIT,
      secondary: isNew ? SUBMIT : BORED,
    };
  }

  if (path === "/trending") {
    const top = rankedSites().slice(0, 3);
    return {
      id: "trending",
      title: "Trending now",
      note: top[0] ? `#1 ${top[0].name}` : undefined,
      actions: [
        ...top.map((site, index) => ({
          id: `top-${site.slug}`,
          label: site.name,
          to: `/sites/${site.slug}`,
          badge: `#${index + 1}`,
        })),
        { id: "how", label: "How voting works", to: "/blog/how-voting-works" },
        { ...directoryAction() },
      ],
      primary: { ...directoryAction() },
      secondary: SUBMIT,
    };
  }

  if (path === "/blog" || path.startsWith("/blog/")) {
    const slug = path.startsWith("/blog/") ? path.slice("/blog/".length) : "";
    const current = slug ? posts.find((post) => post.slug === slug) : undefined;
    const index = current ? posts.findIndex((post) => post.slug === current.slug) : -1;
    const nextPost = index >= 0 ? posts[index - 1] : posts[0];
    const rest = posts.filter(
      (post) => post.slug !== current?.slug && post.slug !== nextPost?.slug,
    );

    return {
      id: "notes",
      title: current ? "In this note" : "Notes",
      note: current ? current.date : `${posts.length} notes`,
      actions: [
        ...(nextPost
          ? [{ id: `next-${nextPost.slug}`, label: nextPost.title, to: `/blog/${nextPost.slug}` }]
          : []),
        ...rest.slice(0, 3).map((post) => ({
          id: `post-${post.slug}`,
          label: post.title,
          to: `/blog/${post.slug}`,
        })),
        { id: "all", label: "All notes", to: "/blog", badge: String(posts.length) },
      ],
      primary: current ? { id: "all-notes", label: "All notes", to: "/blog" } : SUBMIT,
      secondary: { ...directoryAction() },
    };
  }

  if (path === "/collections" || path.startsWith("/collections/")) {
    const id = path.startsWith("/collections/") ? path.slice("/collections/".length) : "";
    const current = id ? collections.find((collection) => collection.id === id) : undefined;
    const others = collections.filter((collection) => collection.id !== current?.id);
    return {
      id: "collections",
      title: current ? current.title : "Collections",
      note: current
        ? `${collectionSites(current).length} sites`
        : `${collections.length} collections`,
      actions: [
        ...(current
          ? [
              {
                id: "members",
                label: "Open the list",
                to: "/#all-sites",
                badge: String(collectionSites(current).length),
              },
            ]
          : []),
        ...others.slice(0, 3).map((collection) => ({
          id: `collection-${collection.id}`,
          label: collection.title,
          to: `/collections/${collection.id}`,
          badge: String(collectionSites(collection).length),
        })),
        {
          id: "all",
          label: "All collections",
          to: "/collections",
          badge: String(collections.length),
        },
      ],
      primary: current
        ? { id: "all-collections", label: "All collections", to: "/collections" }
        : SUBMIT,
      secondary: { ...directoryAction() },
    };
  }

  if (path === "/this-or-that" || path === "/site-tinder") {
    return {
      id: "games",
      title: "Games",
      note: "one site, or two to pick between",
      actions: [
        { id: "or", label: "This or That", to: "/this-or-that" },
        { id: "tinder", label: "Site Tinder", to: "/site-tinder" },
        { ...directoryAction() },
      ],
      primary: { ...directoryAction() },
      secondary: SUBMIT,
    };
  }

  if (path === "/submit") {
    return {
      id: "submit",
      title: "Before you send",
      note: "every entry is read by hand",
      actions: [
        { id: "launched", label: "What counts as launched", to: "/blog/what-counts-as-launched" },
        { id: "voting", label: "How voting works", to: "/blog/how-voting-works" },
        { ...directoryAction() },
      ],
      primary: { ...directoryAction() },
      secondary: TRENDING,
    };
  }

  if (path === "/advertise" || path.startsWith("/services")) {
    return {
      id: "advertise",
      title: "Get seen",
      note: "clearly labelled placements",
      actions: [
        SUBMIT,
        { ...directoryAction() },
        { id: "stats", label: "Directory stats", to: "/stats" },
      ],
      primary: SUBMIT,
      secondary: { ...directoryAction() },
    };
  }

  if (path === "/admin") {
    return {
      id: "admin",
      title: "Review queue",
      note: "submissions and reports",
      actions: [
        { ...directoryAction() },
        SUBMIT,
        { id: "stats", label: "Directory stats", to: "/stats" },
      ],
      primary: { ...directoryAction() },
      secondary: SUBMIT,
    };
  }

  return {
    id: "elsewhere",
    title: "Elsewhere",
    note: path === "/auth" ? "Signing in is optional" : undefined,
    actions: [
      { ...directoryAction() },
      { ...TRENDING },
      { id: "collections", label: "Collections", to: "/collections" },
      { id: "bored", label: "I'm bored", to: "/this-or-that" },
    ],
    primary: { ...directoryAction() },
    secondary: SUBMIT,
  };
}
