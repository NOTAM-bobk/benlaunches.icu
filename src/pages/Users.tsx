import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { SiteIcon } from "../components/SiteIcon";
import { SiteSeo } from "../components/SeoHead";
import { avatarUrl, getPublicProfile, searchPublicProfiles, type PublicProfile } from "../lib/auth";
import { siteBySlug } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";

function ProfileAvatar({ seed, size = 64 }: { seed: string; size?: number }) {
  return <img className="users-avatar" src={avatarUrl(seed)} alt="" width={size} height={size} loading="lazy" />;
}

function SiteList({ title, slugs, empty }: { title: string; slugs: string[]; empty: string }) {
  const sites = slugs.map(siteBySlug).filter((site): site is NonNullable<typeof site> => Boolean(site));
  return (
    <section className="users-site-section">
      <div className="users-section-heading"><h2>{title}</h2><span>{sites.length}</span></div>
      {sites.length > 0 ? (
        <ul className="users-site-list">
          {sites.map((site) => (
            <li key={site.id}>
              <Link to={`/sites/${site.slug}`} className="users-site-card">
                <SiteIcon site={site} size={42} label={false} />
                <span className="users-site-copy"><strong>{site.name}</strong><span>{siteDomain(site.url)}</span></span>
                <span aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="users-empty">{empty}</p>}
    </section>
  );
}

function UserCard({ profile }: { profile: PublicProfile }) {
  return (
    <Link to={`/users/${profile.id}`} className="users-card">
      <ProfileAvatar seed={profile.avatarSeed} size={56} />
      <span className="users-card-copy"><strong>{profile.name}</strong>{profile.bio && <span>{profile.bio}</span>}<small>{profile.voted.length} liked · {profile.saved.length} saved</small></span>
      <span className="users-card-arrow" aria-hidden="true">→</span>
    </Link>
  );
}

export function Users() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void searchPublicProfiles(initialQuery).then((result) => {
      if (!active) return;
      if (result.ok) setProfiles(result.value.profiles);
      else setError(result.error);
      setLoading(false);
    });
    return () => { active = false; };
  }, [initialQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = query.trim();
    setSearchParams(next ? { q: next } : {});
  }

  return (
    <>
      <SiteSeo title="Find users" description="Find people exploring the Boring Internet directory." path="/users" noindex />
      <main className="users-page mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <header className="users-heading">
          <span className="account-eyebrow">Community</span>
          <h1>Find users</h1>
          <p>See what other people are enjoying, saving, and coming back to.</p>
        </header>
        <form className="users-search" onSubmit={submit}>
          <label htmlFor="user-search" className="sr-only">Search users by name</label>
          <input id="user-search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name…" autoComplete="off" />
          <button className="btn accent" type="submit">Search</button>
        </form>
        {error && <p className="users-error" role="alert">{error}</p>}
        {loading ? <p className="users-status" role="status">Looking for people…</p> : profiles.length > 0 ? <div className="users-grid">{profiles.map((profile) => <UserCard key={profile.id} profile={profile} />)}</div> : <div className="account-panel users-empty-panel"><strong>No users found.</strong><span>Try another name, or be the first to create a profile.</span></div>}
      </main>
    </>
  );
}

export function UserProfile() {
  const { id = "" } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getPublicProfile(id).then((result) => {
      if (!active) return;
      if (result.ok) setProfile(result.value.profile);
      else setError(result.error);
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="users-page mx-auto max-w-6xl px-4 sm:px-6 py-14"><p className="users-status">Loading profile…</p></main>;
  if (!profile) return <main className="users-page mx-auto max-w-6xl px-4 sm:px-6 py-14"><div className="account-panel users-empty-panel"><strong>{error || "Profile not found."}</strong><Link to="/users" className="accent-text underline">Find another user</Link></div></main>;

  return (
    <>
      <SiteSeo title={`${profile.name} · Boring Internet`} description={`See ${profile.name}'s liked and saved websites.`} path={`/users/${profile.id}`} noindex />
      <main className="users-page mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <Link to="/users" className="users-back">← Find users</Link>
        <header className="user-profile-header">
          <ProfileAvatar seed={profile.avatarSeed} size={96} />
          <div><span className="account-eyebrow">Boring Internet profile</span><h1>{profile.name}</h1>{profile.bio && <p>{profile.bio}</p>}</div>
        </header>
        <div className="user-profile-stats"><span><strong>{profile.voted.length}</strong> liked</span><span><strong>{profile.saved.length}</strong> saved</span></div>
        <div className="user-profile-lists">
          <SiteList title="Liked websites" slugs={profile.voted} empty="Nothing liked yet." />
          <SiteList title="Saved websites" slugs={profile.saved} empty="Nothing saved yet." />
        </div>
      </main>
    </>
  );
}
