import { supabase } from "./supabase";

/**
 * Visitor-built collections.
 *
 * A collection is a group of directory listings someone put together: "Useful
 * AI tools", "Sites to revisit", "Cool personal websites". Everything here goes
 * through Supabase, so a collection belongs to an account, follows it between
 * devices, and can be shared by URL once it is public. Bookmarks are the saved
 * sites that already live on the account — this module reads them too.
 */

export interface UserCollection {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  description: string;
  isPublic: boolean;
  siteSlugs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Curator {
  id: string;
  name: string;
  avatarSeed: string;
  bio: string;
  websiteUrl: string;
}

export interface CuratorProfile extends Curator {
  collections: UserCollection[];
  followers: number;
  following: number;
}

export interface PublicCollection extends UserCollection {
  curator: Curator | null;
}

export type CollectionResult<T> = { ok: true; value: T } | { ok: false; error: string };

type CollectionSiteRow = { slug: string; position: number | null };

type CollectionRow = {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  collection_sites?: CollectionSiteRow[] | null;
};

type CuratorRow = {
  id: string;
  name: string | null;
  avatar_seed: string | null;
  bio: string | null;
  website_url: string | null;
};

/** The columns a collection read always asks for, members included. */
const SELECT = "id,owner_id,slug,title,description,is_public,created_at,updated_at,collection_sites(slug,position)";

function fail(message: string): CollectionResult<never> {
  return { ok: false, error: message };
}

function fromError(error: { message?: string } | null, fallback: string): CollectionResult<never> {
  return { ok: false, error: error?.message || fallback };
}

function toCollection(row: CollectionRow): UserCollection {
  const members = [...(row.collection_sites ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  return {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    isPublic: row.is_public,
    siteSlugs: members.map((member) => member.slug),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCurator(row: CuratorRow): Curator {
  return {
    id: row.id,
    name: row.name || "Boring Internet user",
    avatarSeed: row.avatar_seed || row.id.slice(0, 8),
    bio: row.bio || "",
    websiteUrl: row.website_url || "",
  };
}

/** A URL-safe id for a new collection, unique among the owner's own. */
function slugify(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
  return base || `collection-${Date.now().toString(36)}`;
}

/** The shareable path for a collection: /collections/u/<owner>/<slug>. */
export function collectionPath(collection: Pick<UserCollection, "ownerId" | "slug">): string {
  return `/collections/u/${collection.ownerId}/${collection.slug}`;
}

export function collectionShareUrl(collection: Pick<UserCollection, "ownerId" | "slug">): string {
  if (typeof window === "undefined") return collectionPath(collection);
  return `${window.location.origin}${collectionPath(collection)}`;
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Every collection this account built, most recently touched first. */
export async function listMyCollections(): Promise<CollectionResult<UserCollection[]>> {
  if (!supabase) return fail("The account service is not connected.");
  const userId = await currentUserId();
  if (!userId) return fail("Sign in to see your collections.");
  const { data, error } = await supabase
    .from("collections")
    .select(SELECT)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) return fromError(error, "Could not load your collections.");
  return { ok: true, value: ((data ?? []) as CollectionRow[]).map(toCollection) };
}

export async function createCollection(input: {
  title: string;
  description?: string;
  isPublic?: boolean;
  siteSlugs?: string[];
}): Promise<CollectionResult<UserCollection>> {
  if (!supabase) return fail("The account service is not connected.");
  const userId = await currentUserId();
  if (!userId) return fail("Sign in to build a collection.");
  const title = input.title.trim();
  if (title.length < 2) return fail("Give the collection a name of at least two characters.");

  // A per-owner unique slug, so the shared link reads like the collection.
  const { data: existing } = await supabase.from("collections").select("slug").eq("owner_id", userId);
  const taken = new Set((existing ?? []).map((row) => row.slug as string));
  let slug = slugify(title);
  if (taken.has(slug)) {
    for (let n = 2; n < 100; n += 1) {
      const candidate = `${slug.slice(0, 36)}-${n}`;
      if (!taken.has(candidate)) {
        slug = candidate;
        break;
      }
    }
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({
      owner_id: userId,
      slug,
      title,
      description: (input.description ?? "").trim(),
      is_public: input.isPublic === true,
    })
    .select(SELECT)
    .single();
  if (error) return fromError(error, "Could not create the collection.");

  const collection = toCollection(data as CollectionRow);
  const slugs = [...new Set(input.siteSlugs ?? [])].slice(0, 200);
  if (slugs.length > 0) {
    const rows = slugs.map((entry, index) => ({
      collection_id: collection.id,
      slug: entry,
      position: index,
    }));
    const { error: memberError } = await supabase.from("collection_sites").insert(rows);
    if (memberError) {
      return fromError(memberError, "The collection was created, but its sites were not saved.");
    }
    collection.siteSlugs = slugs;
  }
  return { ok: true, value: collection };
}

export async function updateCollection(
  id: string,
  patch: { title?: string; description?: string; isPublic?: boolean },
): Promise<CollectionResult<UserCollection>> {
  if (!supabase) return fail("The account service is not connected.");
  const update: Record<string, string | boolean> = {};
  if (typeof patch.title === "string") {
    const title = patch.title.trim();
    if (title.length < 2) return fail("Keep the collection name at least two characters long.");
    update.title = title;
  }
  if (typeof patch.description === "string") update.description = patch.description.trim();
  if (typeof patch.isPublic === "boolean") update.is_public = patch.isPublic;
  if (Object.keys(update).length === 0) return fail("Nothing to change.");

  const { data, error } = await supabase.from("collections").update(update).eq("id", id).select(SELECT).single();
  if (error) return fromError(error, "Could not save the collection.");
  if (!data) return fail("That collection is no longer here.");
  return { ok: true, value: toCollection(data as CollectionRow) };
}

export async function deleteCollection(id: string): Promise<CollectionResult<{ id: string }>> {
  if (!supabase) return fail("The account service is not connected.");
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) return fromError(error, "Could not delete the collection.");
  return { ok: true, value: { id } };
}

/** Adds a listing, keeping it at the end of the collection. */
export async function addSiteToCollection(
  id: string,
  slug: string,
): Promise<CollectionResult<{ id: string; slug: string }>> {
  if (!supabase) return fail("The account service is not connected.");
  const { data: last } = await supabase
    .from("collection_sites")
    .select("position")
    .eq("collection_id", id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (Number(last?.position) || 0) + 1;
  const { error } = await supabase
    .from("collection_sites")
    .upsert({ collection_id: id, slug, position }, { onConflict: "collection_id,slug" });
  if (error) return fromError(error, "Could not add that site to the collection.");
  await touchCollection(id);
  return { ok: true, value: { id, slug } };
}

export async function removeSiteFromCollection(
  id: string,
  slug: string,
): Promise<CollectionResult<{ id: string; slug: string }>> {
  if (!supabase) return fail("The account service is not connected.");
  const { error } = await supabase.from("collection_sites").delete().eq("collection_id", id).eq("slug", slug);
  if (error) return fromError(error, "Could not remove that site.");
  await touchCollection(id);
  return { ok: true, value: { id, slug } };
}

/** Bumps updated_at so "recently updated" reflects an edit, not just a rename. */
async function touchCollection(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("collections").update({ updated_at: new Date().toISOString() }).eq("id", id);
}

/** One collection by its share link. Private ones only resolve for their owner. */
export async function getCollection(
  ownerId: string,
  slug: string,
): Promise<CollectionResult<UserCollection>> {
  if (!supabase) return fail("The account service is not connected.");
  const { data, error } = await supabase
    .from("collections")
    .select(SELECT)
    .eq("owner_id", ownerId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) return fromError(error, "Could not load that collection.");
  if (!data) return fail("That collection is private, or it no longer exists.");
  return { ok: true, value: toCollection(data as CollectionRow) };
}

export async function listPublicCollections(limit = 6): Promise<CollectionResult<PublicCollection[]>> {
  if (!supabase) return fail("The account service is not connected.");
  const { data, error } = await supabase
    .from("collections")
    .select(SELECT)
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return fromError(error, "Could not load public collections.");
  const rows = (data ?? []) as CollectionRow[];
  const ownerIds = [...new Set(rows.map((row) => row.owner_id))];
  const curators = await curatorsById(ownerIds);
  return {
    ok: true,
    value: rows.map((row) => ({ ...toCollection(row), curator: curators.get(row.owner_id) ?? null })),
  };
}

async function curatorsById(ids: string[]): Promise<Map<string, Curator>> {
  const map = new Map<string, Curator>();
  if (!supabase || ids.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id,name,avatar_seed,bio,website_url").in("id", ids);
  for (const row of (data ?? []) as CuratorRow[]) map.set(row.id, toCurator(row));
  return map;
}

/** A curator's public page: their profile, their public collections, their numbers. */
export async function getCurator(id: string): Promise<CollectionResult<CuratorProfile>> {
  if (!supabase) return fail("The account service is not connected.");
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,avatar_seed,bio,website_url")
    .eq("id", id)
    .maybeSingle();
  if (error) return fromError(error, "Could not load that curator.");
  if (!data) return fail("That curator could not be found.");

  const [{ data: collections }, followers, following] = await Promise.all([
    supabase
      .from("collections")
      .select(SELECT)
      .eq("owner_id", id)
      .eq("is_public", true)
      .order("updated_at", { ascending: false }),
    countFollows("curator_id", id),
    countFollows("follower_id", id),
  ]);

  return {
    ok: true,
    value: {
      ...toCurator(data as CuratorRow),
      collections: ((collections ?? []) as CollectionRow[]).map(toCollection),
      followers,
      following,
    },
  };
}

async function countFollows(column: "curator_id" | "follower_id", id: string): Promise<number> {
  if (!supabase) return 0;
  const { count } = await supabase
    .from("curator_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq(column, id);
  return count ?? 0;
}

export async function followerCount(curatorId: string): Promise<number> {
  return countFollows("curator_id", curatorId);
}

/** The curator ids this account follows. */
export async function listFollowing(): Promise<string[]> {
  if (!supabase) return [];
  const userId = await currentUserId();
  if (!userId) return [];
  const { data } = await supabase.from("curator_follows").select("curator_id").eq("follower_id", userId);
  return (data ?? []).map((row) => row.curator_id as string);
}

export async function isFollowing(curatorId: string): Promise<boolean> {
  if (!supabase) return false;
  const userId = await currentUserId();
  if (!userId || userId === curatorId) return false;
  const { data } = await supabase
    .from("curator_follows")
    .select("curator_id")
    .eq("follower_id", userId)
    .eq("curator_id", curatorId)
    .maybeSingle();
  return Boolean(data);
}

export async function followCurator(
  curatorId: string,
  follow: boolean,
): Promise<CollectionResult<{ following: boolean; followers: number }>> {
  if (!supabase) return fail("The account service is not connected.");
  const userId = await currentUserId();
  if (!userId) return fail("Sign in to follow a curator.");
  if (userId === curatorId) return fail("You already curate your own collections.");
  const result = follow
    ? await supabase.from("curator_follows").upsert({ follower_id: userId, curator_id: curatorId }, { onConflict: "follower_id,curator_id" })
    : await supabase.from("curator_follows").delete().eq("follower_id", userId).eq("curator_id", curatorId);
  if (result.error) return fromError(result.error, "Could not update who you follow.");
  return { ok: true, value: { following: follow, followers: await followerCount(curatorId) } };
}
