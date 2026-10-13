import { posts } from "./posts";
import type { Directory } from "./siteDirectory";
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

/**
 * The actions for wherever the visitor is standing: the home page, a category,
 * a search, a blog note, a collection, a single listing, or the submit form.
 * Everything is derived from the live directory, so a new sites changes these
 * rows without any edits here.
 */
export function navContextFor(
  pathname: string,
  search: string,
  directory: Directory,
): NavContext {
  const path = pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search);
  const total = directory.sites.length;
  const listing = path.startsWith("/sites/")
    ? directory.siteBySlug(decodeURIComponent(path.slice("/sites/".length)))
    : undefined;

  if (listing) {
    const domain = siteDomain(listing.url);
    const inCollections = directory.collectionsForSite(listing.slug);
    const actions: NavAction[] = [
      { id: "open", label: `Open ${domain}`, href: listing.url },
      {
        id: "category",
        label: `More in ${directory.categoryLabel(listing.category)}`,
        to: `/?category=${listing.category}#explore`,
        badge: String(directory.categoryCount(listing.category)),
      },
      { id: "all", label: "Back to the directory", to: "/#all-sites", badge: String(total) },
    ];
    if (inCollections[0]) {
      actions.push({
        id: "collection",
        label: inCollections[0].title,
        to: `/collections/${inCollections[0].id}`,
        badge: String(directory.collectionMembers(inCollections[0]).length),
      });
    }
    return {
      id: "listing",
      title: "This listing",
      note: `${directory.categoryLabel(listing.category)}${listing.source === "submitted" ? " · just submitted" : ""}`,
      actions,
      primary: { id: "visit", label: `Visit ${domain}`, href: listing.url },
      secondary: { id: "elsewhere", label: "More sites like this", to: `/?category=${listing.category}#explore` },
    };
  }

  if (path === "/") {
    const query = params.get("q")?.trim() ?? "";
    const categoryId = params.get("category") ?? "all";
    const category = categoryId === "all" ? undefined : directory.categoryById(categoryId);

    if (query) {
      const matches = directory.searchSites(query);
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
          { id: "all", label: "Browse the directory", to: "/#all-sites", badge: String(total) },
        ],
        primary: { id: "browse", label: "Browse the directory", to: "/#all-sites" },
        secondary: SUBMIT,
      };
    }

    if (category) {
      const others = directory
        .categoriesInUse()
        .filter((entry) => entry.category.id !== category.id);
      return {
        id: "category",
        title: `Category: ${category.label}`,
        note: `${directory.categoryCount(category.id)} sites`,
        actions: [
          { id: "all", label: "All sites", to: "/#all-sites", badge: String(total) },
          ...others.map((entry) => ({
            id: `category-${entry.category.id}`,
            label: entry.category.label,
            to: `/?category=${entry.category.id}#explore`,
            badge: String(entry.count),
          })),
        ],
        primary: TRENDING,
        secondary: { id: "everything", label: "All categories", to: "/#explore" },
      };
    }

    const newest = directory.newest(1)[0];
    const arrivals = directory.newest(3);
    return {
      id: "home",
      title: "On this page",
      note: newest ? `Newest listing: ${newest.name}` : undefined,
      actions: [
        { id: "all", label: "All sites", to: "/#all-sites", badge: String(total) },
        ...arrivals
          .filter((site) => site.launched)
          .map((site) => ({
            id: `new-${site.slug}`,
            label: site.name,
            to: `/sites/${site.slug}`,
            badge: site.launched,
          })),
        {
          id: "collections",
          label: "Latest collections",
          to: "/#collections",
          badge: String(directory.collections.length),
        },
      ],
      primary: SUBMIT,
      secondary: TRENDING,
    };
  }

  if (path === "/trending") {
    const top = directory.trending(3);
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
        {
          id: "how",
          label: "How voting works",
          to: "/blog/how-voting-works",
        },
        { id: "all", label: "Browse the directory", to: "/#all-sites", badge: String(total) },
      ],
      primary: { id: "browse", label: "Browse the directory", to: "/#all-sites" },
      secondary: SUBMIT,
    };
  }

  if (path === "/blog" || path.startsWith("/blog/")) {
    const slug = path.startsWith("/blog/") ? path.slice("/blog/".length) : "";
    const current = slug ? posts.find((post) => post.slug === slug) : undefined;
    const index = current ? posts.findIndex((post) => post.slug === current.slug) : -1;
    const nextPost = index >= 0 ? posts[index - 1] : posts[0];
    const rest = posts.filter((post) => post.slug !== current?.slug && post.slug !== nextPost?.slug);

    return {
      id: "notes",
      title: current ? "In this note" : "Notes",
      note: current ? current.date : `${posts.length} notes`,
      actions: [
        ...(nextPost
          ? [
              {
                id: `next-${nextPost.slug}`,
                label: nextPost.title,
                to: `/blog/${nextPost.slug}`,
              },
            ]
          : []),
        ...rest.slice(0, 3).map((post) => ({
          id: `post-${post.slug}`,
          label: post.title,
          to: `/blog/${post.slug}`,
        })),
        { id: "all", label: "All notes", to: "/blog", badge: String(posts.length) },
      ],
      primary: current
        ? { id: "all-notes", label: "All notes", to: "/blog" }
        : SUBMIT,
      secondary: { id: "directory", label: "Browse the directory", to: "/#all-sites" },
    };
  }

  if (path === "/collections" || path.startsWith("/collections/")) {
    const id = path.startsWith("/collections/") ? path.slice("/collections/".length) : "";
    const current = id ? directory.collectionById(id) : undefined;
    const others = directory.collections.filter((collection) => collection.id !== current?.id);
    return {
      id: "collections",
      title: current ? current.title : "Collections",
      note: current
        ? `${directory.collectionMembers(current).length} sites`
        : `${directory.collections.length} collections`,
      actions: [
        ...(current
          ? [
              {
                id: "members",
                label: "Open the list",
                to: "/#all-sites",
                badge: String(directory.collectionMembers(current).length),
              },
            ]
          : []),
        ...others.slice(0, 3).map((collection) => ({
          id: `collection-${collection.id}`,
          label: collection.title,
          to: `/collections/${collection.id}`,
          badge: String(directory.collectionMembers(collection).length),
        })),
        { id: "all", label: "All collections", to: "/collections", badge: String(directory.collections.length) },
      ],
      primary: current
        ? { id: "all-collections", label: "All collections", to: "/collections" }
        : SUBMIT,
      secondary: { id: "directory", label: "Browse the directory", to: "/#all-sites" },
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
        { id: "all", label: "See what is already listed", to: "/#all-sites", badge: String(total) },
      ],
      primary: { id: "directory", label: "Browse the directory", to: "/#all-sites" },
      secondary: TRENDING,
    };
  }

  if (path === "/admin") {
    return {
      id: "admin",
      title: "Review queue",
      note: `${directory.submittedCount} approved from the queue`,
      actions: [
        { id: "all", label: "Browse the directory", to: "/#all-sites", badge: String(total) },
        SUBMIT,
        TRENDING,
      ],
      primary: { id: "directory", label: "Browse the directory", to: "/#all-sites" },
      secondary: SUBMIT,
    };
  }

  return {
    id: "elsewhere",
    title: "Elsewhere",
    note: path === "/auth" ? "Signing in is optional" : undefined,
    actions: [
      { id: "all", label: "Browse the directory", to: "/#all-sites", badge: String(total) },
      TRENDING,
      { id: "collections", label: "Collections", to: "/collections" },
    ],
    primary: { id: "directory", label: "Browse the directory", to: "/#all-sites" },
    secondary: SUBMIT,
  };
}
