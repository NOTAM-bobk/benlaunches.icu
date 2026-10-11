import { votesConnected, votesEndpoint } from "./votes";

export interface AnalyticsDay {
  date: string;
  views: number;
  uniqueViews: number;
}

export interface AnalyticsStats {
  generatedAt: string;
  totals: { views: number; uniqueViews: number };
  days: AnalyticsDay[];
  topPages: Array<{ path: string; views: number }>;
}

const VISITOR_KEY = "bi:analytics-visitor";

function visitorId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const next = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try { window.localStorage.setItem(VISITOR_KEY, next); } catch { /* private browsing */ }
  return next;
}

export function trackPageView(path: string): void {
  if (!votesConnected || typeof window === "undefined") return;
  const body = JSON.stringify({ path: path || "/", visitorId: visitorId() });
  void fetch(`${votesEndpoint}/analytics/view`, {
    method: "POST",
    credentials: "omit",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => undefined);
}

export async function fetchAnalyticsStats(): Promise<AnalyticsStats | null> {
  if (!votesConnected) return null;
  try {
    const response = await fetch(`${votesEndpoint}/analytics/stats`, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json() as AnalyticsStats;
  } catch {
    return null;
  }
}
