/**
 * The "featured on" badges shown in the footer carousel.
 *
 * Add an entry per badge — the provider gives you an anchor around an image, and
 * these fields are that markup: `href` is the link target, `image` is the badge
 * file, and `width`/`height` are its pixel size so the row never jumps.
 */
export interface FeatureBadge {
  id: string;
  /** Used for the carousel dot's accessible name. */
  name: string;
  href: string;
  image: string;
  width: number;
  height: number;
  alt: string;
  /** Extra attributes the badge provider asks for (e.g. a verification flag). */
  attributes?: Record<string, string>;
}

export const featureBadges: FeatureBadge[] = [
  {
    id: "nick-launches",
    name: "Nick Launches",
    href: "https://nicklaunches.com/",
    image: "https://nicklaunches.com/badges/featured-premium-dark.png",
    width: 244,
    height: 56,
    alt: "Featured on Nick Launches",
  },
  {
    id: "launchaf",
    name: "LaunchAF",
    href: "https://launchaf.com/",
    image: "https://launchaf.com/api/badge/light?v=launchaf-blue-2026-2",
    width: 200,
    height: 56,
    alt: "Featured on LaunchAF",
    attributes: { "data-launchaf-badge": "true" },
  },
  {
    id: "startup-trusted",
    name: "StartupTrusted",
    href: "https://startuptrusted.com?ref=new.base31.org",
    image: "https://startuptrusted.com/api/badge?type=featured&style=dark",
    width: 240,
    height: 54,
    alt: "Boring Internet on StartupTrusted",
  },
  {
    id: "launch-llama-tools",
    name: "Launch Llama Tools",
    href: "https://tools.launchllama.co/products/base31-org?utm_source=badge&utm_medium=referral",
    image: "https://tools.launchllama.co/featured-badge.png?v=2",
    width: 200,
    height: 52,
    alt: "Featured on Launch Llama Tools",
  },
];
