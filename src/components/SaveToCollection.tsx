import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/auth";
import { useSignInPrompt } from "../lib/signInPrompt";
import {
  addSiteToCollection,
  createCollection,
  listMyCollections,
  removeSiteFromCollection,
  type UserCollection,
} from "../lib/userCollections";

/**
 * "Save to collection" for one listing. Opens a small sheet of the collections
 * this account already keeps, ticks the ones the listing is in, and creates a
 * new one on the spot — the fastest path from reading a site to filing it.
 */
export function SaveToCollection({ slug, className = "btn ghost" }: { slug: string; className?: string }) {
  const { user } = useAuth();
  const askSignIn = useSignInPrompt();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const containing = collections.filter((collection) => collection.siteSlugs.includes(slug));

  useEffect(() => {
    if (!open) return;
    let active = true;
    void listMyCollections().then((result) => {
      if (!active) return;
      setLoading(false);
      if (result.ok) setCollections(result.value);
      else setError(result.error);
    });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function start() {
    if (!user) {
      askSignIn("save this site to a collection");
      return;
    }
    if (!open) {
      setLoading(true);
      setError("");
    }
    setOpen((value) => !value);
  }

  async function toggle(collection: UserCollection) {
    const has = collection.siteSlugs.includes(slug);
    setBusyId(collection.id);
    setError("");
    const result = has
      ? await removeSiteFromCollection(collection.id, slug)
      : await addSiteToCollection(collection.id, slug);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCollections((current) =>
      current.map((entry) =>
        entry.id === collection.id
          ? {
              ...entry,
              siteSlugs: has
                ? entry.siteSlugs.filter((value) => value !== slug)
                : [...entry.siteSlugs, slug],
            }
          : entry,
      ),
    );
  }

  async function create() {
    const name = title.trim();
    if (name.length < 2) {
      setError("Give the collection a name of at least two characters.");
      return;
    }
    setCreating(true);
    setError("");
    const result = await createCollection({ title: name, isPublic: false, siteSlugs: [slug] });
    setCreating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setCollections((current) => [result.value, ...current]);
  }

  return (
    <div className="save-collection" ref={root}>
      <button
        type="button"
        className={className}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={start}
      >
        {containing.length > 0 ? `In ${containing.length} collection${containing.length === 1 ? "" : "s"}` : "Save to collection"}
      </button>

      {open && (
        <div className="save-collection-menu" role="dialog" aria-label="Save to a collection">
          <span className="save-collection-head">Add to a collection</span>

          {loading ? (
            <p className="save-collection-note">Loading your collections…</p>
          ) : collections.length === 0 ? (
            <p className="save-collection-note">
              No collections yet. Name one below and this site goes straight in.
            </p>
          ) : (
            <ul className="save-collection-list">
              {collections.map((collection) => {
                const has = collection.siteSlugs.includes(slug);
                return (
                  <li key={collection.id}>
                    <button
                      type="button"
                      className={`save-collection-option${has ? " active" : ""}`}
                      aria-pressed={has}
                      disabled={busyId === collection.id}
                      onClick={() => void toggle(collection)}
                    >
                      <span className="save-collection-tick" aria-hidden="true">
                        {has ? "✓" : "+"}
                      </span>
                      <span className="save-collection-option-copy">
                        <strong>{collection.title}</strong>
                        <small>
                          {collection.siteSlugs.length} site{collection.siteSlugs.length === 1 ? "" : "s"} ·{" "}
                          {collection.isPublic ? "public" : "private"}
                        </small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="save-collection-new">
            <input
              type="text"
              value={title}
              maxLength={60}
              placeholder="New collection name"
              aria-label="New collection name"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void create();
              }}
            />
            <button type="button" className="btn accent" disabled={creating} onClick={() => void create()}>
              {creating ? "Creating…" : "Create"}
            </button>
          </div>

          {error && <p className="save-collection-error">{error}</p>}

          <Link to="/collections/mine" className="save-collection-manage" onClick={() => setOpen(false)}>
            Manage your collections →
          </Link>
        </div>
      )}
    </div>
  );
}
