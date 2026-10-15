import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { sites } from "../lib/siteData";

/** The games the directory ships with — the same list the mobile menu shows. */
const GAMES = [
  { to: "/this-or-that", label: "This or That", note: "two sites, one pick" },
  { to: "/site-tinder", label: "Site Tinder", note: "swipe the directory" },
  {
    to: "/website-personality-quiz",
    label: "The Website Personality Quiz",
    note: "six questions, one type",
  },
];

/**
 * The "Games" tab in the top nav: a button that opens the list rather than a
 * link, so the games are one click from every page instead of living in the
 * side rail. The dice that used to sit in that rail landed here as well.
 */
export function GamesMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Keeps the random row from opening the same site twice in a row. */
  const lastRandom = useRef<string | null>(null);
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const onGames = GAMES.some((game) => game.to === path);

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

  function openRandomSite() {
    const pool = lastRandom.current
      ? sites.filter((site) => site.id !== lastRandom.current)
      : sites;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) return;
    lastRandom.current = pick.id;
    window.open(pick.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="games-root" ref={rootRef}>
      <button
        type="button"
        className={`nav-link games-toggle${onGames ? " active" : ""}${
          open ? " games-toggle-open" : ""
        }`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="games-toggle-label">Games</span>
        <span
          className={`games-caret${open ? " games-caret-open" : ""}`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 12 12" focusable="false">
            <path d="M2.75 4.5 6 7.75 9.25 4.5" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="games-menu" role="menu" aria-label="Games">
          <span className="games-menu-head">Play with the directory</span>
          {GAMES.map((game) => (
            <Link
              key={game.to}
              to={game.to}
              role="menuitem"
              className="games-item"
              aria-current={game.to === path ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <span className="games-item-label">{game.label}</span>
              <span className="games-item-note">{game.note}</span>
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            className="games-item"
            onClick={() => {
              setOpen(false);
              openRandomSite();
            }}
          >
            <span className="games-item-label">Bored button</span>
            <span className="games-item-note">one random site, new tab</span>
          </button>
        </div>
      )}
    </div>
  );
}
