import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { avatarUrl, useAuth } from "../lib/auth";

function Avatar({ seed, size }: { seed: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="account-fallback"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
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

export function AccountMenu() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const seed = user?.avatarSeed || "boring-internet";

  return (
    <div className="account" ref={rootRef}>
      <button
        type="button"
        className="account-box"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? `Account: ${user.name}` : "Account and sign in"}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar key={seed} seed={seed} size={26} />
      </button>

      {open && (
        <div className="account-menu" role="menu" aria-label="Account">
          {loading ? (
            <p className="account-note account-menu-loading" role="status">Checking account…</p>
          ) : user ? (
            <>
              <div className="account-head">
                <Avatar key={`${seed}-menu`} seed={seed} size={40} />
                <div className="min-w-0">
                  <p className="account-name truncate">{user.name}</p>
                  <p className="account-note truncate">{user.email}</p>
                </div>
              </div>
              <Link to="/profile" role="menuitem" className="account-item" onClick={() => setOpen(false)}>
                Your account
              </Link>
              <Link to="/saved" role="menuitem" className="account-item" onClick={() => setOpen(false)}>
                Saved
              </Link>
              <Link to="/settings" role="menuitem" className="account-item" onClick={() => setOpen(false)}>
                Settings
              </Link>
              <Link to="/users" role="menuitem" className="account-item" onClick={() => setOpen(false)}>
                Find users
              </Link>
              <button
                type="button"
                role="menuitem"
                className="account-item account-signout"
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <div className="account-head">
                <Avatar key={`${seed}-guest`} seed={seed} size={40} />
                <div>
                  <p className="account-name">Guest</p>
                  <p className="account-note">Not signed in</p>
                </div>
              </div>
              <Link to="/auth" role="menuitem" className="account-item account-item-primary" onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link to="/submit" role="menuitem" className="account-item" onClick={() => setOpen(false)}>
                Submit your site
              </Link>
              <Link to="/users" role="menuitem" className="account-item" onClick={() => setOpen(false)}>
                Find users
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
