/**
 * The daily streak for people who are not signed in: opening the site once a
 * day keeps it going, so it needs no account and no Worker. It lives in
 * localStorage, which means the number is per browser — clearing site data
 * starts it again.
 */
export interface VisitStreak {
  /** Consecutive days the site has been opened, counting today. */
  current: number;
  /** The best run this browser has had. */
  longest: number;
  /** Local calendar day of the last counted visit, as YYYY-MM-DD. */
  lastDate: string;
}

const KEY = "bi:visit-streak:v1";
const EMPTY: VisitStreak = { current: 0, longest: 0, lastDate: "" };

/** The visitor's own calendar day, not UTC, so the streak turns over at their midnight. */
function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The day before a YYYY-MM-DD key, in local time. */
function dayBefore(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return dayKey(new Date(year, month - 1, day - 1));
}

export function readVisitStreak(): VisitStreak {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<VisitStreak>;
    const current = Number(parsed.current) || 0;
    return {
      current,
      // A stored longest can lag behind a hand-edited current; trust the higher.
      longest: Math.max(Number(parsed.longest) || 0, current),
      lastDate: typeof parsed.lastDate === "string" ? parsed.lastDate : "",
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Count today's visit — once per day, whatever time it is. Called as the app
 * boots: opening the site is the whole requirement, no sign-in involved.
 */
export function recordVisitToday(): VisitStreak {
  if (typeof window === "undefined") return EMPTY;
  const today = dayKey(new Date());
  const streak = readVisitStreak();
  if (streak.lastDate === today) return streak;

  // Yesterday keeps the run alive; any older gap starts a new one.
  const current = streak.lastDate === dayBefore(today) ? streak.current + 1 : 1;
  const next: VisitStreak = {
    current,
    longest: Math.max(streak.longest, current),
    lastDate: today,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the streak simply will not persist */
  }
  return next;
}
