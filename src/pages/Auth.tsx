import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { useAuth } from "../lib/auth";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="mx-auto max-w-md p-8">Loading account…</div>;
  if (user) {
    return <><SiteSeo title="Account" description="Your Boring Internet account." path="/auth" noindex /><div className="mx-auto max-w-md px-4 py-12"><div className="card p-6 space-y-4"><h1 className="text-3xl font-bold">You’re signed in</h1><p style={{ color: "var(--muted)" }}>Welcome back, {user.name}.</p><div className="flex flex-wrap gap-3"><Link className="btn accent" to="/profile">Open profile</Link><Link className="btn ghost" to="/saved">View saved</Link></div></div></div></>;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const result = mode === "signin" ? await signIn(form.email, form.password) : await signUp(form.email, form.password, form.name);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    navigate("/profile");
  }

  return <><SiteSeo title={mode === "signin" ? "Sign in" : "Create account"} description="Sign in to save sites, keep your votes, and manage your profile." path="/auth" noindex /><div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center gap-6 text-center"><span className="text-[11px] font-bold tracking-[0.2em] uppercase border px-3 py-2" style={{ borderColor: "var(--ink)" }}>Access</span><h1 className="text-3xl sm:text-4xl font-bold">{mode === "signin" ? "Sign in" : "Create your account"}</h1><p className="max-w-md text-lg" style={{ color: "var(--muted)" }}>Save the sites you love, keep your voting history, and carry your profile between devices.</p><form className="card p-5 sm:p-6 w-full max-w-sm space-y-3 text-left" onSubmit={submit}>{mode === "signup" && <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required minLength={2} /> }<input type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="email" required /><input type="password" className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (8+ characters)" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={8} />{error && <p className="text-sm" style={{ color: "var(--accent)" }}>{error}</p>}<button type="submit" className="btn accent w-full" disabled={busy}>{busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}</button></form><button type="button" className="accent-text font-bold underline underline-offset-4" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}>{mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}</button><Link to="/" className="text-sm accent-text font-bold underline underline-offset-4">Back to the directory</Link></div></>;
}
