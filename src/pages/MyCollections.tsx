import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { SaveToCollection } from "../components/SaveToCollection";
import { useAuth } from "../lib/auth";
import { searchSites, siteBySlug, siteName } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";
import {
  addSiteToCollection,
  collectionShareUrl,
  createCollection,
  deleteCollection,
  listMyCollections,
  removeSiteFromCollection,
  updateCollection,
  type UserCollection,
} from "../lib/userCollections";

/** Copies text, falling back to a hidden field when the clipboard API is blocked. */
async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    /* older browsers, or plain http */
  }
  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

function SignInRequired() {
  return (
    <div className="account-panel account-message">
      <span className="account-message-mark" aria-hidden="true">→</span>
      <div className="flex min-w-0 flex-col items-start gap-3">
        <div>
          <h2>Sign in to build collections</h2>
          <p>A collection is kept on your account, so it follows you between devices and can be shared.</p>
        </div>
        <Link to="/auth" className="btn accent">
          Sign in or create an account
        </Link>
      </div>
    </div>
  );
}

/** The saved websites on the account, read as the visitor's first collection. */
function Bookmarks({ saved }: { saved: string[] }) {
  const entries = saved.map(siteBySlug).filter((site): site is NonNullable<typeof site> => Boolean(site));

  return (
    <section className="account-panel mycol-panel">
      <div className="account-panel-heading">
        <span className="account-settings-icon" aria-hidden="true">★</span>
        <div>
          <h2>Bookmarked listings</h2>
          <p>
            {entries.length === 0
              ? "Nothing bookmarked yet. Tap Save site on a listing to keep it here."
              : `${entries.length} site${entries.length === 1 ? "" : "s"} you kept. File them into a collection below.`}
          </p>
        </div>
      </div>
      {entries.length > 0 && (
        <ul className="mycol-bookmarks">
          {entries.map((site) => (
            <li key={site.id}>
              <SiteIcon site={site} size={30} label={false} />
              <span className="mycol-bookmark-copy">
                <Link to={`/sites/${site.slug}`}>{site.name}</Link>
                <small>{siteDomain(site.url)}</small>
              </span>
              <SaveToCollection slug={site.slug} className="mycol-mini-btn" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One collection: its name, its visibility, and its members, all editable here. */
function CollectionCard({
  collection,
  bookmarks,
  onChange,
  onDelete,
}: {
  collection: UserCollection;
  bookmarks: string[];
  onChange: (updated: UserCollection) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const members = collection.siteSlugs.map(siteBySlug).filter((site): site is NonNullable<typeof site> => Boolean(site));
  const shareUrl = collectionShareUrl(collection);

  const suggestions = useMemo(() => {
    const term = query.trim();
    if (!term) return [];
    return searchSites(term)
      .filter((site) => !collection.siteSlugs.includes(site.slug))
      .slice(0, 8);
  }, [query, collection.siteSlugs]);

  const missingBookmarks = bookmarks.filter((slug) => !collection.siteSlugs.includes(slug));

  async function save() {
    setBusy(true);
    setError("");
    const result = await updateCollection(collection.id, { title, description });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(result.value);
    setEditing(false);
    setNotice("Saved.");
  }

  async function setVisibility(isPublic: boolean) {
    setBusy(true);
    setError("");
    const result = await updateCollection(collection.id, { isPublic });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(result.value);
    setNotice(isPublic ? "Anyone with the link can read it now." : "Only you can read it now.");
  }

  /** Adds one or several listings, then reports the new member list in one go. */
  async function addMany(slugs: string[]) {
    if (slugs.length === 0) return;
    setError("");
    const added: string[] = [];
    for (const slug of slugs) {
      const result = await addSiteToCollection(collection.id, slug);
      if (result.ok) added.push(slug);
      else setError(result.error);
    }
    if (added.length > 0) onChange({ ...collection, siteSlugs: [...collection.siteSlugs, ...added] });
  }

  async function add(slug: string) {
    await addMany([slug]);
  }

  async function remove(slug: string) {
    setError("");
    const result = await removeSiteFromCollection(collection.id, slug);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange({ ...collection, siteSlugs: collection.siteSlugs.filter((value) => value !== slug) });
  }

  async function copyLink() {
    setNotice((await copyText(shareUrl)) ? "Share link copied." : "Copying was blocked — the link is shown above.");
  }

  async function destroy() {
    setBusy(true);
    const result = await deleteCollection(collection.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDelete(collection.id);
  }

  return (
    <article className="mycol-card">
      <div className="mycol-card-head">
        <div className="mycol-card-title">
          <h3>{collection.title}</h3>
          <span className={`mycol-visibility ${collection.isPublic ? "public" : "private"}`}>
            {collection.isPublic ? "Public" : "Private"}
          </span>
          <span className="mycol-count">
            {members.length} site{members.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mycol-card-actions">
          <button type="button" className="mycol-mini-btn" onClick={() => void copyLink()}>
            Copy link
          </button>
          <button
            type="button"
            className="mycol-mini-btn"
            aria-pressed={collection.isPublic}
            disabled={busy}
            onClick={() => void setVisibility(!collection.isPublic)}
          >
            {collection.isPublic ? "Make private" : "Make public"}
          </button>
          <button type="button" className="mycol-mini-btn" onClick={() => setEditing((value) => !value)}>
            {editing ? "Close" : "Edit"}
          </button>
          <button type="button" className="mycol-mini-btn danger" disabled={busy} onClick={() => void destroy()}>
            Delete
          </button>
        </div>
      </div>

      {collection.description && !editing && <p className="mycol-description">{collection.description}</p>}

      {collection.isPublic && (
        <p className="mycol-share">
          <span>Share</span>
          <code>{shareUrl}</code>
          <Link to={`/collections/u/${collection.ownerId}/${collection.slug}`}>Open →</Link>
        </p>
      )}

      {editing && (
        <form
          className="mycol-edit"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            <span>Name</span>
            <input className="field" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span>Description</span>
            <textarea
              className="field"
              rows={3}
              value={description}
              maxLength={280}
              placeholder="What is this collection for?"
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className="mycol-edit-actions">
            <button type="submit" className="btn accent" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      <ul className="mycol-members">
        {members.length === 0 ? (
          <li className="mycol-members-empty">Nothing in here yet. Search for a site below, or add your bookmarks.</li>
        ) : (
          members.map((site) => (
            <li key={site.id}>
              <SiteIcon site={site} size={26} label={false} />
              <Link to={`/sites/${site.slug}`} className="mycol-member-name">
                {site.name}
              </Link>
              <span className="mycol-member-domain">{siteDomain(site.url)}</span>
              <button type="button" className="mycol-mini-btn" onClick={() => void remove(site.slug)}>
                Remove
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="mycol-add">
        <input
          type="search"
          value={query}
          placeholder="Search the directory to add a site"
          aria-label="Search the directory to add a site"
          onChange={(event) => setQuery(event.target.value)}
        />
        {missingBookmarks.length > 0 && (
          <button
            type="button"
            className="mycol-mini-btn"
            onClick={() => void addMany(missingBookmarks)}
          >
            Add {missingBookmarks.length} bookmark{missingBookmarks.length === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <ul className="mycol-suggestions">
          {suggestions.map((site) => (
            <li key={site.id}>
              <button type="button" onClick={() => void add(site.slug)}>
                <SiteIcon site={site} size={22} label={false} />
                <span>{site.name}</span>
                <span aria-hidden="true">+</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mycol-error">{error}</p>}
      {notice && <p className="mycol-notice" role="status">{notice}</p>}
    </article>
  );
}

export default function MyCollections() {
  const { user, loading } = useAuth();
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    void listMyCollections().then((result) => {
      if (!active) return;
      setLoadingList(false);
      if (result.ok) setCollections(result.value);
      else setListError(result.error);
    });
    return () => {
      active = false;
    };
  }, [user]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError("");
    const result = await createCollection({ title, description, isPublic });
    setCreating(false);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    setCollections((current) => [result.value, ...current]);
    setTitle("");
    setDescription("");
    setIsPublic(false);
  }

  return (
    <>
      <SiteSeo
        title="Your collections"
        description={`Build, share and follow curated collections of ${siteName} listings.`}
        path="/collections/mine"
        noindex
      />
      <main className="account-page mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <header className="account-page-heading">
          <span className="account-eyebrow">Your collections</span>
          <h1>Keep the sites you like</h1>
          <p className="mycol-intro">
            Group listings into collections such as “Useful AI tools” or “Sites to revisit”. Keep one
            private, or make it public and share its link. Everyone else&apos;s public collections live
            on{" "}
            <Link to="/collections">the collections page</Link>.
          </p>
        </header>

        <section className="account-content mycol-stack">
          {loading ? (
            <div className="account-panel account-message" role="status">
              <span className="account-message-mark" aria-hidden="true">…</span>
              <div>
                <h2>Loading your account</h2>
              </div>
            </div>
          ) : !user ? (
            <SignInRequired />
          ) : (
            <>
              <Bookmarks saved={user.saved} />

              <section className="account-panel mycol-panel">
                <div className="account-panel-heading">
                  <span className="account-settings-icon" aria-hidden="true">＋</span>
                  <div>
                    <h2>New collection</h2>
                    <p>Name it and pick who can read it — you can change both later.</p>
                  </div>
                </div>
                <form className="mycol-create" onSubmit={create}>
                  <label>
                    <span>Name</span>
                    <input
                      className="field"
                      value={title}
                      maxLength={80}
                      required
                      placeholder="Useful AI tools"
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea
                      className="field"
                      rows={2}
                      value={description}
                      maxLength={280}
                      placeholder="What belongs in here?"
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </label>
                  <label className="mycol-check">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(event) => setIsPublic(event.target.checked)}
                    />
                    <span>Anyone with the link can read this collection</span>
                  </label>
                  {createError && <p className="mycol-error">{createError}</p>}
                  <div>
                    <button type="submit" className="btn accent" disabled={creating}>
                      {creating ? "Creating…" : "Create collection"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="account-panel mycol-panel">
                <div className="account-panel-heading">
                  <span className="account-settings-icon" aria-hidden="true">◇</span>
                  <div>
                    <h2>Your collections</h2>
                    <p>
                      {collections.length === 0
                        ? "None yet — make one above."
                        : `${collections.length} collection${collections.length === 1 ? "" : "s"}, newest first.`}
                    </p>
                  </div>
                </div>
                {listError && <p className="mycol-error">{listError}</p>}
                {loadingList && collections.length === 0 ? (
                  <p className="mycol-members-empty">Loading…</p>
                ) : (
                  <div className="mycol-list">
                    {collections.map((collection) => (
                      <CollectionCard
                        key={collection.id}
                        collection={collection}
                        bookmarks={user.saved}
                        onChange={(updated) =>
                          setCollections((current) =>
                            current.map((entry) => (entry.id === updated.id ? updated : entry)),
                          )
                        }
                        onDelete={(id) => setCollections((current) => current.filter((entry) => entry.id !== id))}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </main>
    </>
  );
}
