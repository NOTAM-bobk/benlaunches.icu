import { useState } from "react";

/**
 * The collections a visitor kept. Unlike saved sites — which live on the
 * account — collections are kept in this browser, so keeping one never asks
 * for an account. The Saved screen reads the same key, which is why this lives
 * in a module of its own rather than inside the home page.
 */
const KEY = "bi:collections";

export function readSavedCollections(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

/** Writes the list, tolerating private mode where storage refuses to keep it. */
export function writeSavedCollections(ids: string[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* private mode */
  }
}

/** The saved collection ids, plus a toggle that persists them. */
export function useSavedCollections(): [string[], (id: string) => void] {
  const [saved, setSaved] = useState<string[]>(readSavedCollections);

  function toggle(id: string) {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
      writeSavedCollections(next);
      return next;
    });
  }

  return [saved, toggle];
}
