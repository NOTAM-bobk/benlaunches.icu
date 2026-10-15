import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { FollowButton } from "../components/FollowButton";
import { SaveToCollection } from "../components/SaveToCollection";
import { avatarUrl, useAuth } from "../lib/auth";
import { siteBySlug, siteName, siteUrl } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";
import {
  collectionShareUrl,
  getCollection,
  getCurator,
  type CuratorProfile,
  type UserCollection as Collection,
} from "../lib/userCollections";

/** One visitor collection, readable by anyone when it is public. */
export default function UserCollection() {
  const { ownerId = "", slug = "" } = useParams();
  const { user } = useAuth();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [curator, setCurator] = useState<CuratorProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await getCollection(ownerId, slug);
      if (!active) return;
      if (!result.ok) {
        setState("missing");
        return;
      }
      setCollection(result.value);
      setState("ready");
      const profile = await getCurator(ownerId);
      if (active && profile.ok) setCurator(profile.value);
    })();
    return () => {
      active = false;
    };
  }, [ownerId, slug]);

  if (state === "missing") {
    return (
      <>
        <SiteSeo title="Collection not found" path={`/collections/u/${ownerId}/${slug}`} noindex />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center gap-4 text-center">
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase border px-3 py-2" style={{ borderColor: "var(--ink)" }}>
            404
          </span>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">That collection is private, or gone</h1>
          <p className="max-w-md" style={{ color: "var(--muted)" }}>
            A private collection only opens for the person who made it.
          </p>
          <Link to="/collections" className="nav-cta">
            Browse public collections
          </Link>
        </div>
      </>
    );
  }

  if (state === "loading" || !collection) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <p style={{ color: "var(--muted)" }}>Loading the collection…</p>
      </div>
    );
  }

  const members = collection.siteSlugs
    .map(siteBySlug)
    .filter((site): site is NonNullable<typeof site> => Boolean(site));
  const isOwner = user?.id === collection.ownerId;
  const shareUrl = collectionShareUrl(collection);
  const pageUrl = `${siteUrl}/collections/u/${collection.ownerId}/${collection.slug}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <SiteSeo
        title={collection.title}
        description={`${collection.description || `${collection.title} — a collection on ${siteName}.`} ${members.length} sites.`}
        path={`/collections/u/${collection.ownerId}/${collection.slug}`}
        noindex={!collection.isPublic}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: collection.title,
            description: collection.description,
            url: pageUrl,
            inLanguage: "en",
          },
        ]}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6" style={{ borderColor: "var(--rule)" }}>
          <Link to="/collections" className="text-[11px] font-bold tracking-[0.2em] uppercase accent-text">
            ← Collections
          </Link>
          <div className="ucol-title-row">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">{collection.title}</h1>
            {!collection.isPublic && <span className="ucol-chip private">Private</span>}
          </div>
          {collection.description && (
            <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
              {collection.description}
            </p>
          )}

          {curator && (
            <div className="ucol-curator">
              <Link to={`/curators/${curator.id}`} className="ucol-curator-link">
                <img src={avatarUrl(curator.avatarSeed)} alt="" width="38" height="38" />
                <span>
                  <small>Curated by</small>
                  <strong>{curator.name}</strong>
                </span>
              </Link>
              <FollowButton
                curatorId={curator.id}
                curatorName={curator.name}
                followers={curator.followers}
                className="btn ghost ucol-follow"
              />
            </div>
          )}

          <div className="ucol-actions">
            <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
              {members.length} site{members.length === 1 ? "" : "s"} · updated{" "}
              {new Date(collection.updatedAt).toLocaleDateString("en-US")}
            </span>
            {collection.isPublic && (
              <button type="button" className="btn ghost" onClick={() => void copyLink()}>
                {copied ? "Link copied ✓" : "Copy share link"}
              </button>
            )}
            {isOwner && (
              <Link to="/collections/mine" className="btn ghost">
                Manage collection
              </Link>
            )}
          </div>
        </header>

        {members.length === 0 ? (
          <p className="new-filter-empty">This collection is empty for now.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {members.map((site) => (
              <li key={site.id} className="ucol-member">
                <SiteIcon site={site} size={38} label={false} />
                <span className="ucol-member-copy">
                  <Link to={`/sites/${site.slug}`} className="ucol-member-name">
                    {site.name}
                  </Link>
                  <span className="ucol-member-description">{site.description}</span>
                  <span className="ucol-member-domain">{siteDomain(site.url)}</span>
                </span>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ucol-member-visit"
                >
                  Visit <span aria-hidden="true">↗</span>
                </a>
                <SaveToCollection slug={site.slug} className="mycol-mini-btn" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
