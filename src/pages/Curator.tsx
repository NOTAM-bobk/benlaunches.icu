import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { FollowButton } from "../components/FollowButton";
import { avatarUrl } from "../lib/auth";
import { siteBySlug, siteName } from "../lib/siteData";
import { collectionPath, getCurator, type CuratorProfile } from "../lib/userCollections";

/** A curator's public page: who they are, and every collection they shared. */
export default function Curator() {
  const { id = "" } = useParams();
  const [curator, setCurator] = useState<CuratorProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    let active = true;
    void getCurator(id).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setState("missing");
        return;
      }
      setCurator(result.value);
      setFollowers(result.value.followers);
      setState("ready");
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (state === "missing") {
    return (
      <>
        <SiteSeo title="Curator not found" path={`/curators/${id}`} noindex />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center gap-4 text-center">
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase border px-3 py-2" style={{ borderColor: "var(--ink)" }}>
            404
          </span>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">That curator is not here</h1>
          <Link to="/collections" className="nav-cta">
            Browse collections
          </Link>
        </div>
      </>
    );
  }

  if (state === "loading" || !curator) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <p style={{ color: "var(--muted)" }}>Loading the curator…</p>
      </div>
    );
  }

  return (
    <>
      <SiteSeo
        title={`${curator.name} — curator`}
        description={`${curator.bio || `${curator.name} keeps public collections on ${siteName}.`}`}
        path={`/curators/${curator.id}`}
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <header className="curator-header">
          <img className="curator-avatar" src={avatarUrl(curator.avatarSeed)} alt="" width="84" height="84" />
          <div className="curator-copy">
            <span className="account-eyebrow">Curator</span>
            <h1>{curator.name}</h1>
            {curator.bio && <p>{curator.bio}</p>}
            {curator.websiteUrl && (
              <a href={curator.websiteUrl} target="_blank" rel="noreferrer" className="accent-text underline break-all">
                {curator.websiteUrl}
              </a>
            )}
            <div className="curator-stats">
              <span>
                <strong>{curator.collections.length}</strong> public collection
                {curator.collections.length === 1 ? "" : "s"}
              </span>
              <span>
                <strong>{followers}</strong> follower{followers === 1 ? "" : "s"}
              </span>
              <span>
                <strong>{curator.following}</strong> following
              </span>
            </div>
          </div>
          <FollowButton
            curatorId={curator.id}
            curatorName={curator.name}
            followers={curator.followers}
            className="btn accent"
            onChange={(_following, count) => setFollowers(count)}
          />
        </header>

        {curator.collections.length === 0 ? (
          <p className="new-filter-empty">No public collections yet.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {curator.collections.map((collection) => {
              const members = collection.siteSlugs
                .map(siteBySlug)
                .filter((site): site is NonNullable<typeof site> => Boolean(site));
              return (
                <li key={collection.id}>
                  <Link to={collectionPath(collection)} className="card card-link ucol-tile">
                    <div className="tile-cluster">
                      {members.slice(0, 5).map((site) => (
                        <SiteIcon key={site.id} site={site} size={28} label={false} />
                      ))}
                    </div>
                    <h2>{collection.title}</h2>
                    {collection.description && <p>{collection.description}</p>}
                    <span className="ucol-tile-meta">
                      {members.length} site{members.length === 1 ? "" : "s"} · open →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
