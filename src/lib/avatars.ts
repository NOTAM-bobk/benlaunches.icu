/**
 * DiceBear avatars for the home page's "find launches" strip.
 *
 * The strip is a line-up of *different* styles in circles — a crowd of people
 * rather than one repeated face. Each entry pins a style, a stable seed (so the
 * same face comes back on every visit) and a background colour drawn from the
 * warm palette.
 *
 * Every style used here is CC0 or free for personal and commercial use, so the
 * row needs no attribution line. The API draws each image server-side and needs
 * no key: https://www.dicebear.com/how-to-use/http-api/
 */
export interface Avatar {
  /** DiceBear style id, e.g. "lorelei". */
  style: string;
  /** Stable text seed: the same seed always draws the same face. */
  seed: string;
  /** Tile colour behind the face, as a hex triplet without the `#`. */
  background: string;
}

/** DiceBear's current major version, as it appears in the URL path. */
const API = "https://api.dicebear.com/10.x";

export const homeAvatars: Avatar[] = [
  { style: "lorelei", seed: "quiet-web", background: "f2c14e" },
  { style: "notionists", seed: "plain-html", background: "6ea8d8" },
  { style: "open-peeps", seed: "no-tracking", background: "e2574c" },
  { style: "avataaars", seed: "text-first", background: "86c07b" },
  { style: "bottts", seed: "small-sites", background: "f0d9bf" },
  { style: "pixel-art", seed: "slow-reading", background: "b7a2e0" },
  { style: "moods", seed: "no-ads", background: "e79ac0" },
  { style: "thumbs", seed: "one-person", background: "f2c14e" },
];

/** The SVG for one avatar, sized by CSS so it stays crisp on any screen. */
export function avatarUrl({ style, seed, background }: Avatar): string {
  return `${API}/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${background}`;
}
