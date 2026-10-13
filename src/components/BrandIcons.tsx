import type { ReactNode } from "react";
import { BRAND_PATHS } from "../lib/shareBrands";


/** Mail and text messages have no logo of their own, so they are drawn here. */
const DRAWN_ICONS: Record<string, ReactNode> = {
  email: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" focusable="false">
      <rect x="2.6" y="5.2" width="18.8" height="13.6" rx="2" />
      <path d="M3.6 6.6 12 13l8.4-6.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sms: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" focusable="false">
      <path
        d="M20.4 11.9c0 3.5-3.7 6.3-8.3 6.3-.9 0-1.8-.11-2.6-.31l-4.3 1.6 1.1-3.2c-1.5-1.1-2.4-2.7-2.4-4.4 0-3.5 3.7-6.3 8.2-6.3s8.3 2.8 8.3 6.3Z"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

/** One platform mark, sized for a share tile. Falls back to a monogram. */
export function BrandIcon({
  id,
  size = 18,
  fallback = null,
}: {
  id: string;
  size?: number;
  fallback?: ReactNode;
}) {
  const path = BRAND_PATHS[id];
  if (path) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
        <path d={path} fill="currentColor" />
      </svg>
    );
  }
  return <>{DRAWN_ICONS[id] ?? fallback}</>;
}
