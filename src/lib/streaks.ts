export interface SignInStreak {
  current: number;
  longest: number;
  lastDate: string;
}

const raw = (import.meta.env as Record<string, string | undefined>).VITE_VOTES_API_URL;
const endpoint = (raw ?? "").replace(/\/+$/, "");

export async function recordDailySignIn(userId: string): Promise<SignInStreak> {
  const fallback = { current: 1, longest: 1, lastDate: new Date().toISOString().slice(0, 10) };
  if (!endpoint || !userId) return fallback;
  try {
    const response = await fetch(`${endpoint}/auth/streak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) return fallback;
    const data = await response.json() as { streak?: SignInStreak };
    return data.streak ?? fallback;
  } catch {
    return fallback;
  }
}
