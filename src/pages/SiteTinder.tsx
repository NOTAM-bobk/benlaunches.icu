import { SiteSeo } from "../components/SeoHead";

/**
 * Site Tinder is not built yet — this is the holding page so the link in the
 * Games menu goes somewhere real instead of a 404.
 */
export default function SiteTinder() {
  return (
    <>
      <SiteSeo
        title="Site Tinder"
        description="Swipe through listed sites and keep the ones you like. Site Tinder is still being built."
        path="/site-tinder"
        keywords={["site tinder", "swipe websites", "discover new websites"]}
        noindex
      />

      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] accent-text">Games</p>
        <h1 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
          Site <span className="accent-text">Tinder</span>
        </h1>
        <p className="text-base" style={{ color: "var(--muted)" }}>
          Nothing here yet. When it is ready you will swipe through sites and keep the ones you
          like.
        </p>
      </div>
    </>
  );
}
