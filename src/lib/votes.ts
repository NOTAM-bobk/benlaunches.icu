import { useEffect, useState } from "react";

/**
 * Trending votes.
 *
 * Counts live in the Cloudflare Worker at `cloudflare/votes-worker.js` and are
 * wired up through VITE_VOTES_API_URL. Until that URL is configured the app
 * still works: votes are kept for the browser in localStorage and clearly
 * labelled as not shared.
 */
import { recordVoteForAccount } from "./auth";

const raw = (import.meta.env as Record<string, string | undefined>)
  .VITE_VOTES_API_URL;

export const votesEndpoint = (raw ?? "").replace(/\/+$/, "");
export const votesConnected = votesEndpoint.length > 0;

const VOTED_KEY = "bi:voted";
const COUNT_KEY = "bi:vote-counts:v2";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — votes just will not persist */
  }
}

/** Slugs this browser has already voted for. */
export function readVotedSlugs(): string[] {
  const value = readJson<unknown>(VOTED_KEY, []);
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function markVoted(slug: string) {
  const voted = new Set(readVotedSlugs());
  voted.add(slug);
  writeJson(VOTED_KEY, [...voted]);
}

export function readLocalCounts(): Record<string, number> {
  const value = readJson<Record<string, unknown>>(COUNT_KEY, {});
  const counts: Record<string, number> = {};
  for (const [slug, count] of Object.entries(value)) {
    if (typeof count === "number" && Number.isFinite(count)) counts[slug] = count;
  }
  return counts;
}

export function writeLocalCount(slug: string, count: number) {
  writeJson(COUNT_KEY, { ...readLocalCounts(), [slug]: count });
}

/** All shared counts, or `null` when the Worker is not connected/reachable. */
export async function fetchSharedCounts(): Promise<Record<string, number> | null> {
  if (!votesConnected) return null;
  try {
    const res = await fetch(`${votesEndpoint}/counts`, { credentials: "include", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const counts: Record<string, number> = {};
    for (const [slug, count] of Object.entries(data)) {
      const n = Number(count);
      if (Number.isFinite(n)) counts[slug] = n;
    }
    return counts;
  } catch {
    return null;
  }
}

/** Casts a vote. Returns the shared count, or `null` in local-only mode. */
export async function castVote(slug: string, direction: "up" | "down" = "up"): Promise<number | null> {
  if (!votesConnected) return null;
  try {
    const res = await fetch(`${votesEndpoint}/${direction === "up" ? "vote" : "unvote"}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: number };
    void recordVoteForAccount(slug, direction === "up");
    return typeof data.count === "number" ? data.count : null;
  } catch {
    return null;
  }
}


/**
 * One site's vote state: the live count, whether this browser has voted, and a
 * `vote()` that updates locally first and then syncs with the shared Worker.
 * Used by the site page and its bottom bar.
 */
export function useSiteVote(slug: string, fallbackCount = 0) {
  const [count, setCount] = useState(() => readLocalCounts()[slug] ?? fallbackCount);
  const [voted, setVoted] = useState(() => readVotedSlugs().includes(slug));
  const [pending, setPending] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSharedCounts().then((remote) => {
      if (!active || !remote) return;
      setShared(true);
      const value = remote[slug];
      if (typeof value === "number") setCount(value);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  async function vote() {
    if (pending || readVotedSlugs().includes(slug)) {
      setVoted(true);
      return;
    }

    const nextCount = count + 1;
    setCount(nextCount);
    setVoted(true);
    setPending(true);
    markVoted(slug);
    writeLocalCount(slug, nextCount);

    const sharedCount = await castVote(slug, "up");
    if (sharedCount !== null) {
      setShared(true);
      setCount(sharedCount);
      writeLocalCount(slug, sharedCount);
    }
    setPending(false);
  }

  return { count, voted, pending, shared, vote };
}
