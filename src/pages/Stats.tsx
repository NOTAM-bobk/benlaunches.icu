import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { fetchAnalyticsStats, type AnalyticsResult } from "../lib/analytics";
import { votesConnected } from "../lib/votes";

function number(value: number) { return new Intl.NumberFormat("en-US").format(value); }

export default function Stats() {
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetchAnalyticsStats().then((value) => { setResult(value); setLoading(false); }); }, []);
  const stats = result?.status === "ok" ? result.stats : null;
  const maxViews = useMemo(() => Math.max(1, ...(stats?.days ?? []).map((day) => day.views)), [stats]);

  return <>
    <SiteSeo title="Directory stats" description="A transparent look at visits to Ben Launches." path="/stats" noindex />
    <main className="stats-page mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <header className="stats-heading">
        <span className="account-eyebrow">Open numbers</span>
        <h1>Directory stats</h1>
        <p>Visits to Ben Launches, counted at the edge. We do not use cookies or store IP addresses.</p>
      </header>
      {!votesConnected ? <div className="account-panel stats-message"><strong>Analytics is not connected.</strong><span>Set VITE_VOTES_API_URL to the deployed Cloudflare Worker to turn this page on.</span></div> : loading ? <p className="users-status">Loading the latest numbers…</p> : result?.status === "missing" ? <div className="account-panel stats-message"><strong>Waiting on a Worker redeploy.</strong><span>The vote counter answers, but this version of it has no /analytics routes yet, so there is nothing to chart. Deploying the current cloudflare/votes-worker.js turns this page on; counts start from zero and fill as pages are viewed.</span></div> : result?.status === "unavailable" ? <div className="account-panel stats-message"><strong>Stats are temporarily unavailable.</strong><span>Try refreshing in a moment. If the whole directory is quiet, the vote counter may be down.</span></div> : stats ? <>
        <div className="stats-cards">
          <div className="stats-card"><strong>{number(stats.totals.views)}</strong><span>Views in the last 30 days</span></div>
          <div className="stats-card"><strong>{number(stats.totals.uniqueViews)}</strong><span>Unique visitors in the last 30 days</span></div>
          <div className="stats-card"><strong>{number(stats.days.reduce((sum, day) => sum + day.views, 0))}</strong><span>Tracked page loads</span></div>
        </div>
        <section className="account-panel stats-chart-panel">
          <div className="account-panel-heading"><span className="account-settings-icon" aria-hidden="true">↗</span><div><h2>Views by day</h2><p>Rolling 30-day window. Unique visitor counts are deduplicated per day.</p></div></div>
          <div className="stats-chart" role="img" aria-label="Bar chart of daily page views">
            {stats.days.map((day) => <div className="stats-bar-wrap" key={day.date} title={`${day.date}: ${number(day.views)} views`}><div className="stats-bar" style={{ height: `${Math.max(4, day.views / maxViews * 100)}%` }} /><span>{day.date.slice(5)}</span></div>)}
          </div>
        </section>
        <section className="account-panel stats-pages-panel">
          <div className="account-panel-heading"><span className="account-settings-icon" aria-hidden="true">#</span><div><h2>Most visited pages</h2><p>Top paths from the same rolling window.</p></div></div>
          <ol className="stats-page-list">{stats.topPages.map((page) => <li key={page.path}><code>{page.path}</code><strong>{number(page.views)}</strong></li>)}</ol>
        </section>
        <p className="stats-footnote">Updated {new Date(stats.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. <Link to="/privacy" className="accent-text underline">Read the privacy policy</Link>.</p>
      </> : <div className="account-panel stats-message"><strong>Stats are temporarily unavailable.</strong><span>Try refreshing in a moment.</span></div>}
    </main>
  </>;
}
