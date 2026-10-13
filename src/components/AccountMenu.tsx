import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

const SEED_KEY = "bi:avatar-seed";

/** A stable, anonymous seed so everyone gets their own little avatar. */
function newSeed(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

/** DiceBear renders the avatar on its own servers; we just display the SVG. */
function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f7e0c6,fff7ee`;
}

function Avatar({ seed, size }: { seed: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="account-fallback" style={{ width: size, height: size }} aria-hidden="true">
        ☻
      </span>
    );
  }
  return (
    <img
      src={avatarUrl(seed)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * The compact account box in the header: a small square holding a DiceBear
 * avatar that opens a dropdown with the sign-in action.
 */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState("boring-internet");
  const rootRef = useRef<HTMLDivElement>(null);

  // Read (or create) this browser's avatar seed after mount.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(SEED_KEY);
      if (!stored) {
        stored = newSeed();
        window.localStorage.setItem(SEED_KEY, stored);
      }
    } catch {
      stored = newSeed();
    }
    setSeed(stored);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  return (
    <div className="account" ref={rootRef}>
      <button
        type="button"
        className="account-box"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account and sign in"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar seed={seed} size={22} />
      </button>

      {open && (
        <div className="account-menu" role="menu" aria-label="Account">
          <div className="account-head">
            <Avatar seed={seed} size={40} />
            <div className="min-w-0">
              <p className="account-name">Guest</p>
              <p className="account-note">Not signed in</p>
            </div>
          </div>
          <Link
            to="/auth"
            role="menuitem"
            className="account-item account-item-primary"
            onClick={() => setOpen(false)}
          >
            Sign in
          </Link>
          <Link
            to="/submit"
            role="menuitem"
            className="account-item"
            onClick={() => setOpen(false)}
          >
            Submit your site
          </Link>
        </div>
      )}
    </div>
  );
}
