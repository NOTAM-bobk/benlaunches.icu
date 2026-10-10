import { useCallback, useEffect, useState } from "react";
import { setReducedMotionPreference } from "./motion";
import { supabase, supabaseConnected } from "./supabase";

export interface AuthSettings {
  emailUpdates: boolean;
  weeklyDigest: boolean;
  newSiteAlerts: boolean;
  reducedMotion: boolean;
  publicProfile: boolean;
}

export const SETTINGS_KEYS: ReadonlyArray<keyof AuthSettings> = [
  "emailUpdates", "weeklyDigest", "newSiteAlerts", "reducedMotion", "publicProfile",
];

export function normalizeSettings(raw: unknown): AuthSettings {
  const value = (raw ?? {}) as Partial<AuthSettings>;
  return {
    emailUpdates: value.emailUpdates === true,
    weeklyDigest: value.weeklyDigest === true,
    newSiteAlerts: value.newSiteAlerts === true,
    reducedMotion: value.reducedMotion === true,
    publicProfile: value.publicProfile === true,
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarSeed: string;
  bio: string;
  settings: AuthSettings;
  saved: string[];
  voted: string[];
}

export interface PublicProfile {
  id: string;
  name: string;
  avatarSeed: string;
  bio: string;
  saved: string[];
  voted: string[];
}

export type AuthResult<T> = { ok: true; value: T } | { ok: false; error: string };

type ProfileRow = {
  id: string;
  name: string;
  avatar_seed: string;
  bio: string;
  email_updates: boolean;
  weekly_digest: boolean;
  new_site_alerts: boolean;
  reduced_motion: boolean;
  public_profile: boolean;
};

function failure(error: { message?: string } | null, fallback: string): AuthResult<never> {
  return { ok: false, error: error?.message || fallback };
}

type PublicProfileRow = Pick<ProfileRow, "id" | "name" | "avatar_seed" | "bio">;

function publicProfile(profile: PublicProfileRow, saved: Array<{ slug: string }> | null, voted: Array<{ slug: string }> | null): PublicProfile {
  return {
    id: profile.id,
    name: profile.name || "Boring Internet user",
    avatarSeed: profile.avatar_seed || profile.id.slice(0, 8),
    bio: profile.bio || "",
    saved: (saved ?? []).map((row) => row.slug),
    voted: (voted ?? []).map((row) => row.slug),
  };
}

export async function searchPublicProfiles(query = ""): Promise<AuthResult<{ profiles: PublicProfile[] }>> {
  if (!supabase) return { ok: false, error: "The account service is not connected." };
  const client = supabase;
  const term = query.trim();
  let request = client.from("profiles").select("id,name,avatar_seed,bio").order("name", { ascending: true }).limit(24);
  if (term) request = request.ilike("name", `%${term.replace(/[%_]/g, "\\$&")}%`);
  const { data, error } = await request;
  if (error) return failure(error, "Could not find users.");
  const profiles = (data ?? []) as PublicProfileRow[];
  const expanded = await Promise.all(profiles.map(async (profile) => {
    const [{ data: saved }, { data: voted }] = await Promise.all([
      client.from("saved_sites").select("slug").eq("user_id", profile.id).order("created_at", { ascending: false }),
      client.from("user_votes").select("slug").eq("user_id", profile.id).order("created_at", { ascending: false }),
    ]);
    return publicProfile(profile, saved, voted);
  }));
  return { ok: true, value: { profiles: expanded } };
}

export async function getPublicProfile(id: string): Promise<AuthResult<{ profile: PublicProfile }>> {
  if (!supabase) return { ok: false, error: "The account service is not connected." };
  const { data: profile, error } = await supabase.from("profiles").select("id,name,avatar_seed,bio").eq("id", id).maybeSingle<PublicProfileRow>();
  if (error) return failure(error, "Could not load this profile.");
  if (!profile) return { ok: false, error: "That profile could not be found." };
  const [{ data: saved }, { data: voted }] = await Promise.all([
    supabase.from("saved_sites").select("slug").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("user_votes").select("slug").eq("user_id", id).order("created_at", { ascending: false }),
  ]);
  return { ok: true, value: { profile: publicProfile(profile, saved, voted) } };
}

async function getCurrentUser(): Promise<AuthResult<{ user: AuthUser }>> {
  if (!supabase) return { ok: false, error: "The account service is not connected." };
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return failure(sessionError, "Could not load your account.");
  const authUser = sessionData.session?.user;
  if (!authUser) return { ok: false, error: "Not signed in." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,avatar_seed,bio,email_updates,weekly_digest,new_site_alerts,reduced_motion,public_profile")
    .eq("id", authUser.id)
    .maybeSingle<ProfileRow>();
  if (profileError) return failure(profileError, "Could not load your profile.");

  const safeProfile = profile ?? {
    id: authUser.id,
    name: (authUser.user_metadata?.name as string | undefined) ?? authUser.email?.split("@")[0] ?? "",
    avatar_seed: authUser.id.slice(0, 8),
    bio: "",
    email_updates: false,
    weekly_digest: false,
    new_site_alerts: false,
    reduced_motion: false,
    public_profile: false,
  };

  const [{ data: saved, error: savedError }, { data: voted, error: votedError }] = await Promise.all([
    supabase.from("saved_sites").select("slug").eq("user_id", authUser.id),
    supabase.from("user_votes").select("slug").eq("user_id", authUser.id),
  ]);
  if (savedError || votedError) return failure(savedError ?? votedError, "Could not load your saved sites.");

  return {
    ok: true,
    value: {
      user: {
        id: authUser.id,
        email: authUser.email ?? "",
        name: safeProfile.name,
        avatarSeed: safeProfile.avatar_seed,
        bio: safeProfile.bio,
        settings: normalizeSettings({
          emailUpdates: safeProfile.email_updates,
          weeklyDigest: safeProfile.weekly_digest,
          newSiteAlerts: safeProfile.new_site_alerts,
          reducedMotion: safeProfile.reduced_motion,
          publicProfile: safeProfile.public_profile,
        }),
        saved: (saved ?? []).map((row) => row.slug),
        voted: (voted ?? []).map((row) => row.slug),
      },
    },
  };
}

async function ensureProfile(userId: string, name: string, email?: string) {
  if (!supabase) return;
  await supabase.from("profiles").upsert({
    id: userId,
    name: name.trim() || email?.split("@")[0] || "",
    avatar_seed: userId.slice(0, 8),
  }, { onConflict: "id" });
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await getCurrentUser();
    if (result.ok) setReducedMotionPreference(result.value.user.settings.reducedMotion);
    setUser(result.ok ? result.value.user : null);
    setLoading(false);
    return result;
  }, []);

  useEffect(() => {
    void refresh();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  async function signIn(email: string, password: string) {
    if (!supabase) return { ok: false as const, error: "The account service is not connected." };
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) return failure(result.error, "Email or password is incorrect.");
    const current = await getCurrentUser();
    if (current.ok) setUser(current.value.user);
    return current;
  }

  async function signUp(email: string, password: string, name: string) {
    if (!supabase) return { ok: false as const, error: "The account service is not connected." };
    const result = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth` },
    });
    if (result.error) return failure(result.error, "Could not create your account.");
    if (!result.data.user) return { ok: false as const, error: "Could not create your account." };
    await ensureProfile(result.data.user.id, name, email);
    if (!result.data.session) return { ok: false as const, error: "Check your email to confirm your account, then sign in." };
    const current = await getCurrentUser();
    if (current.ok) setUser(current.value.user);
    return current;
  }

  async function signOut() {
    if (!supabase) return { ok: false as const, error: "The account service is not connected." };
    const result = await supabase.auth.signOut();
    setUser(null);
    return result.error ? failure(result.error, "Could not sign out.") : { ok: true as const, value: { ok: true } };
  }

  async function updateProfile(values: { name: string; avatarSeed: string; bio: string }) {
    if (!supabase || !user) return { ok: false as const, error: "Sign in to edit your profile." };
    const result = await supabase.from("profiles").update({ name: values.name.trim(), avatar_seed: values.avatarSeed.trim() || user.avatarSeed, bio: values.bio.trim() }).eq("id", user.id);
    if (result.error) return failure(result.error, "Could not save your profile.");
    return refresh();
  }

  async function updateSettings(settings: AuthSettings) {
    if (!supabase || !user) return { ok: false as const, error: "Sign in to edit settings." };
    const result = await supabase.from("profiles").update({
      email_updates: settings.emailUpdates,
      weekly_digest: settings.weeklyDigest,
      new_site_alerts: settings.newSiteAlerts,
      reduced_motion: settings.reducedMotion,
      public_profile: settings.publicProfile,
    }).eq("id", user.id);
    if (result.error) return failure(result.error, "Could not save your settings.");
    const refreshed = await refresh();
    return refreshed.ok ? { ok: true as const, value: { user: refreshed.value.user, synced: true } } : refreshed;
  }

  async function toggleSaved(slug: string) {
    if (!supabase || !user) return { ok: false as const, error: "Sign in to save websites." };
    const isSaved = user.saved.includes(slug);
    const result = isSaved
      ? await supabase.from("saved_sites").delete().eq("user_id", user.id).eq("slug", slug)
      : await supabase.from("saved_sites").insert({ user_id: user.id, slug });
    if (result.error) return failure(result.error, "Could not update saved sites.");
    return refresh();
  }

  return { user, loading, refresh, signIn, signUp, signOut, updateProfile, updateSettings, toggleSaved };
}

export async function recordVoteForAccount(slug: string, voted: boolean) {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  if (voted) await supabase.from("user_votes").upsert({ user_id: data.user.id, slug }, { onConflict: "user_id,slug" });
  else await supabase.from("user_votes").delete().eq("user_id", data.user.id).eq("slug", slug);
}

export function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed || "boring-internet")}&backgroundColor=f7e0c6,fff7ee`;
}

export const avatarPresets: string[] = [
  "quiet-web", "plain-html", "text-first", "slow-reading", "no-tracking",
  "one-person", "small-sites", "calm-cursor", "paper-trail", "night-owl",
];

const AVATAR_WORDS_FIRST = ["quiet", "plain", "slow", "calm", "warm", "paper", "night", "small", "open", "soft", "steady", "gentle", "sunny", "round", "amber", "still"];
const AVATAR_WORDS_SECOND = ["reader", "corner", "cursor", "screen", "shelf", "window", "notion", "garden", "signal", "lantern", "archive", "path", "kettle", "compass"];

export function randomAvatarSeed(current?: string): string {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const first = AVATAR_WORDS_FIRST[Math.floor(Math.random() * AVATAR_WORDS_FIRST.length)];
    const second = AVATAR_WORDS_SECOND[Math.floor(Math.random() * AVATAR_WORDS_SECOND.length)];
    const seed = `${first}-${second}`;
    if (seed !== current) return seed;
  }
  return `quiet-${Date.now().toString(36).slice(-4)}`;
}

export { supabaseConnected };
