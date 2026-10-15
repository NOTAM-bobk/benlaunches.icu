/**
 * The background the site is drawn on. Each preset only retints the paper —
 * background, panels, rules and muted copy — so the ink text and the orange
 * accent stay the same on every one of them, which is why a preset can never
 * make a page unreadable.
 *
 * The choice is a browser preference, like a dark-mode switch: it lives in
 * localStorage and is applied before React renders (see main.tsx).
 */

/** Every custom property a preset is allowed to set, in the order they are written. */
const THEME_VARS = ["--bg", "--bg-glow", "--surface", "--rule", "--muted"] as const;

export interface ThemePreset {
  id: string;
  label: string;
  /** The colour shown on the swatch in the picker. */
  swatch: string;
  /**
   * Values to write onto the document root. Empty means "whatever index.css
   * already sets", which is the cream default.
   */
  vars: Partial<Record<(typeof THEME_VARS)[number], string>>;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "cream", label: "Cream", swatch: "#f7e0c6", vars: {} },
  {
    id: "sand",
    label: "Sand",
    swatch: "#efe4d3",
    vars: {
      "--bg": "#efe4d3",
      "--bg-glow": "#f8f1e4",
      "--surface": "#fffaf2",
      "--rule": "#dcc9ae",
      "--muted": "#6b5a44",
    },
  },
  {
    id: "mint",
    label: "Mint",
    swatch: "#dcefe3",
    vars: {
      "--bg": "#dcefe3",
      "--bg-glow": "#eaf8f0",
      "--surface": "#f8fffb",
      "--rule": "#b7d8c5",
      "--muted": "#40684f",
    },
  },
  {
    id: "sky",
    label: "Sky",
    swatch: "#dbe8f6",
    vars: {
      "--bg": "#dbe8f6",
      "--bg-glow": "#eaf3fc",
      "--surface": "#f8fbff",
      "--rule": "#b8cee6",
      "--muted": "#46617f",
    },
  },
  {
    id: "rose",
    label: "Rose",
    swatch: "#f7dfe3",
    vars: {
      "--bg": "#f7dfe3",
      "--bg-glow": "#fdeef1",
      "--surface": "#fff8f9",
      "--rule": "#e6c0c7",
      "--muted": "#7c4a54",
    },
  },
  {
    id: "lilac",
    label: "Lilac",
    swatch: "#e7e1f7",
    vars: {
      "--bg": "#e7e1f7",
      "--bg-glow": "#f2eefd",
      "--surface": "#faf8ff",
      "--rule": "#cdc3e8",
      "--muted": "#5b4d7d",
    },
  },
  {
    id: "paper",
    label: "Paper",
    swatch: "#f3f1ea",
    vars: {
      "--bg": "#f3f1ea",
      "--bg-glow": "#faf8f1",
      "--surface": "#fffdf9",
      "--rule": "#d8d2c2",
      "--muted": "#6a6353",
    },
  },
];

const KEY = "bi:theme:v1";
const DEFAULT_THEME = THEME_PRESETS[0].id;

/** The preset the visitor picked, or the default when there is nothing stored. */
export function readTheme(): string {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(KEY);
    return THEME_PRESETS.some((preset) => preset.id === stored) ? (stored as string) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Paints a preset onto the document root. Unknown ids fall back to the default. */
export function applyTheme(id: string): void {
  if (typeof document === "undefined") return;
  const preset = THEME_PRESETS.find((candidate) => candidate.id === id) ?? THEME_PRESETS[0];
  const root = document.documentElement;
  for (const name of THEME_VARS) {
    const value = preset.vars[name];
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  }
}

/** Remember and apply a preset in one step — clicking a swatch should be live. */
export function setTheme(id: string): void {
  applyTheme(id);
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* private mode: the choice just will not survive the tab */
  }
}
