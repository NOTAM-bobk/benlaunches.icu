import { NavContent } from "./NavContent";

/** Desktop-only side navigation: a compact, softly elevated navigation panel. */
export function SideNav() {
  return (
    <aside className="sidenav" aria-label="Site navigation">
      <div className="sidenav-panel">
        <NavContent />
      </div>
    </aside>
  );
}
