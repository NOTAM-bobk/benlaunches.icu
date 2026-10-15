import { useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { SiteIcon } from "../components/SiteIcon";
import { SiteSeo } from "../components/SeoHead";
import {
  avatarLabel,
  avatarPresets,
  avatarUrl,
  randomAvatarSeed,
  useAuth,
  type AuthSettings,
  type AuthUser,
} from "../lib/auth";
import { collectionById, collectionSites, siteBySlug, siteName } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";
import { useSavedCollections } from "../lib/savedCollections";
import { readTheme, setTheme, THEME_PRESETS } from "../lib/theme";

const ACCOUNT_NAV: Array<{ to: string; label: string }> = [
  { to: "/profile", label: "Your account" },
  { to: "/saved", label: "Saved" },
  { to: "/settings", label: "Settings" },
];

/**
 * Every account screen wears the same clothes: a heading, one row of tabs in
 * the site's own button style, then the panels. There used to be a second
 * sidebar here — it is gone, like the one on the directory pages.
 */
function AccountFrame({
  title,
  path,
  children,
}: {
  title: string;
  path: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteSeo title={title} description={`${title} on ${siteName}.`} path={path} noindex />
      <main className="account-page mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <header className="account-page-heading">
          <span className="account-eyebrow">Your account</span>
          <h1>{title}</h1>
        </header>
        <nav className="account-tabs" aria-label="Your account">
          {ACCOUNT_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) => `account-tab${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <section className="account-content">{children}</section>
      </main>
    </>
  );
}

function AccountLoading({ title, path }: { title: string; path: string }) {
  return (
    <AccountFrame title={title} path={path}>
      <div className="account-panel account-message" role="status">
        <span className="account-message-mark" aria-hidden="true">…</span>
        <div>
          <h2>Loading your account</h2>
        </div>
      </div>
    </AccountFrame>
  );
}

function SignInRequired() {
  return (
    <div className="account-panel account-message">
      <span className="account-message-mark" aria-hidden="true">→</span>
      <div className="flex min-w-0 flex-col items-start gap-3">
        <div>
          <h2>Sign in to continue</h2>
          <p>Your saved sites, votes, and profile follow you between devices.</p>
        </div>
        <Link to="/auth" className="btn accent">
          Sign in or create an account
        </Link>
      </div>
    </div>
  );
}

function SiteList({
  title,
  slugs,
  empty,
}: {
  title: string;
  slugs: string[];
  empty: string;
}) {
  const entries = slugs.map(siteBySlug).filter((site): site is NonNullable<typeof site> => Boolean(site));

  return (
    <section className="account-list-section">
      <div className="account-list-heading">
        <h2>{title}</h2>
        <span>{entries.length}</span>
      </div>
      {entries.length > 0 ? (
        <ul className="account-site-list">
          {entries.map((site) => (
            <li key={site.id}>
              <Link to={`/sites/${site.slug}`} className="account-site-card">
                <SiteIcon site={site} size={44} label={false} />
                <span className="account-site-copy">
                  <strong>{site.name}</strong>
                  <span className="account-site-domain">{siteDomain(site.url)}</span>
                  <span className="account-site-description">{site.description}</span>
                </span>
                <span className="account-site-arrow" aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="account-empty-state">
          <span aria-hidden="true">◇</span>
          <p>{empty}</p>
        </div>
      )}
    </section>
  );
}

/**
 * The collections this browser kept. Saved sites live on the account; a kept
 * collection is local, which is why it says so at the foot of the list.
 */
function SavedCollections() {
  const [saved, toggle] = useSavedCollections();
  const entries = saved
    .map((id) => collectionById(id))
    .filter((collection): collection is NonNullable<typeof collection> => Boolean(collection));

  return (
    <section className="account-list-section">
      <div className="account-list-heading">
        <h2>Saved collections</h2>
        <span>{entries.length}</span>
      </div>
      {entries.length > 0 ? (
        <ul className="account-site-list">
          {entries.map((collection) => (
            <li key={collection.id}>
              <div className="account-site-card">
                <span className="account-collection-tiles" aria-hidden="true">
                  {collectionSites(collection)
                    .slice(0, 3)
                    .map((site) => (
                      <SiteIcon key={site.id} site={site} size={22} label={false} />
                    ))}
                </span>
                <span className="account-site-copy">
                  <Link to={`/collections/${collection.id}`} className="account-collection-name">
                    {collection.title}
                  </Link>
                  <span className="account-site-domain">
                    {collectionSites(collection).length} sites
                  </span>
                  <span className="account-site-description">{collection.description}</span>
                </span>
                <button
                  type="button"
                  className="account-collection-remove"
                  onClick={() => toggle(collection.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="account-empty-state">
          <span aria-hidden="true">◇</span>
          <p>No collections kept yet. Open one and tap Save.</p>
        </div>
      )}
      <p className="account-saved-note">A kept collection lives in this browser; saved websites follow your account.</p>
    </section>
  );
}

function ProfileForm({ user }: { user: AuthUser }) {
  const { updateProfile } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    avatarSeed: user.avatarSeed,
    bio: user.bio ?? "",
    websiteUrl: user.websiteUrl ?? "",
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await updateProfile(form);
    setBusy(false);
    setMessage(result.ok ? "Profile saved." : result.error);
  }

  return (
    <form className="account-panel account-form" onSubmit={save}>
      <div className="account-panel-heading">
        <img
          className="account-profile-avatar"
          src={avatarUrl(form.avatarSeed)}
          alt=""
          width="72"
          height="72"
        />
        <div>
          <h2>Your profile</h2>
          <p>Shown in the account menu and on the sites you save or vote for.</p>
        </div>
      </div>

      <label className="account-field">
        <span className="account-field-label">Name</span>
        <input
          className="field"
          value={form.name}
          maxLength={80}
          autoComplete="name"
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
        />
      </label>

      <div className="account-field">
        <span className="account-field-label">Avatar</span>
        <div className="avatar-picker" role="group" aria-label="Choose an avatar">
          {avatarPresets.map((preset) => {
            const active = form.avatarSeed === preset;
            const label = avatarLabel(preset);
            return (
              <button
                key={preset}
                type="button"
                className={`avatar-choice${active ? " active" : ""}`}
                aria-pressed={active}
                title={label}
                onClick={() => setForm((current) => ({ ...current, avatarSeed: preset }))}
              >
                <img src={avatarUrl(preset)} alt="" loading="lazy" decoding="async" />
                <span className="sr-only">{`Use the ${label} avatar`}</span>
              </button>
            );
          })}
        </div>
        <div className="avatar-picker-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              setForm((current) => ({
                ...current,
                avatarSeed: randomAvatarSeed(current.avatarSeed),
              }))
            }
          >
            <span aria-hidden="true">🎲</span> Shuffle
          </button>
        </div>
      </div>

      <label className="account-field">
        <span className="account-field-label">Short bio</span>
        <textarea
          className="field"
          rows={4}
          maxLength={240}
          value={form.bio}
          onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
        />
        <span>{form.bio.length}/240 characters</span>
      </label>

      <label className="account-field">
        <span className="account-field-label">Your website</span>
        <input
          className="field"
          type="url"
          value={form.websiteUrl}
          maxLength={300}
          placeholder="https://yourwebsite.com"
          autoComplete="url"
          onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))}
        />
        <span>Shown on your public profile.</span>
      </label>

      <div className="account-form-actions">
        <button className="btn accent" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
        {message && <span className="account-feedback" role="status">{message}</span>}
      </div>
    </form>
  );
}

/** A three-number summary of what the account has collected so far. */
function AccountOverview({ user }: { user: AuthUser }) {
  const stats = [
    { label: "Saved websites", value: user.saved.length, to: "/saved" },
    { label: "Votes cast", value: user.voted.length, to: "/trending" },
    { label: "Submitted sites", value: user.submitted.length, to: "/profile#submissions" },
    { label: "Email updates", value: user.settings.emailUpdates ? "On" : "Off", to: "/settings" },
  ];

  return (
    <section className="account-panel account-overview">
      <div className="account-panel-heading">
        <span className="account-settings-icon" aria-hidden="true">◇</span>
        <div>
          <h2>At a glance</h2>
        </div>
      </div>

      <ul className="account-stat-grid">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link to={stat.to} className="account-stat">
              <span className="account-stat-value">{stat.value}</span>
              <span className="account-stat-label">{stat.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <dl className="account-detail-list">
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Display name</dt>
          <dd>{user.name || "Not set"}</dd>
        </div>
        <div>
          <dt>Short bio</dt>
          <dd>{user.bio?.trim() || "No bio yet — add one above."}</dd>
        </div>
        <div>
          <dt>Website</dt>
          <dd>{user.websiteUrl ? <a href={user.websiteUrl} target="_blank" rel="noreferrer" className="accent-text underline break-all">{user.websiteUrl}</a> : "No website yet — add one above."}</dd>
        </div>
      </dl>
    </section>
  );
}

/** The four places worth a tap from your own page. */
function AccountShortcuts() {
  const links = [
    { to: "/saved", label: "Your saved sites", note: "Everything you kept" },
    { to: "/trending", label: "Trending list", note: "Where your votes land" },
    { to: "/submit", label: "Submit a site", note: "Five votes first" },
    { to: "/advertise", label: "Advertise", note: "Placements and extras" },
  ];

  return (
    <section className="account-panel">
      <div className="account-panel-heading">
        <span className="account-settings-icon" aria-hidden="true">◎</span>
        <div>
          <h2>Shortcuts</h2>
        </div>
      </div>
      <ul className="account-shortcuts">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="account-shortcut">
              <span>
                <strong>{link.label}</strong>
                <small>{link.note}</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SubmittedSites({ user }: { user: AuthUser }) {
  return <section className="account-panel account-submissions" id="submissions">
    <div className="account-panel-heading"><span className="account-settings-icon" aria-hidden="true">↗</span><div><h2>Your submitted sites</h2><p>Every URL you send is kept here. Approved sites also appear on your public profile.</p></div></div>
    {user.submitted.length ? <ul className="submitted-site-list">{user.submitted.map((submission) => <li key={submission.id}><a href={submission.url} target="_blank" rel="noreferrer"><strong>{submission.name}</strong><span>{submission.url}</span></a><span className={`submission-status ${submission.status}`}>{submission.status}</span></li>)}</ul> : <p className="account-empty-state">You have not submitted a site yet. <Link to="/submit" className="accent-text underline">Submit one now</Link>.</p>}
  </section>;
}

function StreakPanel({ user }: { user: AuthUser }) {
  return <section className="account-panel streak-panel" id="streak">
    <div className="streak-flame" aria-hidden="true">🔥</div>
    <div className="streak-copy"><span className="account-eyebrow">Daily sign-in</span><h2>{user.streak.current} day streak</h2><p>Best run: {user.streak.longest} day{user.streak.longest === 1 ? "" : "s"}.</p></div>
    <div className="streak-count"><strong>{user.streak.current}</strong><span>days</span></div>
  </section>;
}

export function Profile() {
  const { user, loading } = useAuth();
  if (loading) return <AccountLoading title="Your account" path="/profile" />;

  return (
    <AccountFrame title="Your account" path="/profile">
      {user ? (
        <div className="account-stack">
          {/* Edit on the left, read on the right: the form is the tall one. */}
          <div className="account-split">
            <ProfileForm user={user} />
            <div className="account-column">
              <AccountOverview user={user} />
              <StreakPanel user={user} />
            </div>
          </div>
          <SubmittedSites user={user} />
          <AccountShortcuts />
        </div>
      ) : (
        <SignInRequired />
      )}
    </AccountFrame>
  );
}

export function Saved() {
  const { user, loading } = useAuth();
  if (loading) return <AccountLoading title="Saved" path="/saved" />;

  return (
    <AccountFrame title="Saved" path="/saved">
      {user ? (
        <div className="account-stack">
          <div className="account-panel account-saved-summary">
            <div>
              <strong>{user.saved.length}</strong>
              <span>saved</span>
            </div>
            <div>
              <strong>{user.voted.length}</strong>
              <span>voted for</span>
            </div>
            <p>Tied to {user.email}. Tap Save on a site again to remove it.</p>
          </div>
          <div className="account-panel account-saved-panel">
            <SiteList
              title="Saved websites"
              slugs={user.saved}
              empty="You have not saved any websites yet. Open a site and tap Save to keep it here."
            />
            <SiteList
              title="Websites you voted for"
              slugs={user.voted}
              empty="Your voted websites will appear here after you cast a vote while signed in."
            />
            <SavedCollections />
          </div>
        </div>
      ) : (
        <SignInRequired />
      )}
    </AccountFrame>
  );
}

/** Every switch on the page, grouped so the panel reads in two short runs. */
const SETTING_GROUPS: Array<{
  id: string;
  title: string;
  note: string;
  items: Array<{ key: keyof AuthSettings; label: string; hint: string }>;
}> = [
  {
    id: "email",
    title: "Email",
    note: "What reaches your inbox, and how often.",
    items: [
      {
        key: "emailUpdates",
        label: "Email updates",
        hint: "Occasional notes about new sites and directory changes.",
      },
      {
        key: "weeklyDigest",
        label: "Weekly digest",
        hint: "One short round-up a week of everything that was added.",
      },
      {
        key: "newSiteAlerts",
        label: "New site alerts",
        hint: "A heads-up when something lands in a category you follow.",
      },
    ],
  },
  {
    id: "browsing",
    title: "Browsing",
    note: "How the pages behave while you read, and who sees your name.",
    items: [
      {
        key: "reducedMotion",
        label: "Reduced motion",
        hint: "Hold the launch ticker and the badge carousel still.",
      },
      {
        key: "publicProfile",
        label: "Public profile",
        hint: "Show your name and bio on the sites you vote for.",
      },
    ],
  },
];

/*
  The background swatches. A colour choice is a browser preference, so picking
  one repaints the page immediately and there is nothing to save.
*/
function ThemePicker() {
  const [theme, setThemeState] = useState(() => readTheme());
  const active = THEME_PRESETS.find((preset) => preset.id === theme) ?? THEME_PRESETS[0];

  return (
    <section className="account-panel account-settings-panel">
      <div className="account-panel-heading account-settings-heading">
        <span className="account-settings-icon" aria-hidden="true">◐</span>
        <div>
          <h2>Background</h2>
          <p>Kept in this browser, on every page.</p>
        </div>
      </div>

      <div className="theme-picker" role="radiogroup" aria-label="Background colour">
        {THEME_PRESETS.map((preset) => {
          const on = preset.id === active.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`theme-choice${on ? " active" : ""}`}
              onClick={() => {
                setTheme(preset.id);
                setThemeState(preset.id);
              }}
            >
              <span className="theme-swatch" style={{ background: preset.swatch }} aria-hidden="true" />
              <span className="theme-choice-label">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SettingsForm({ user }: { user: AuthUser }) {
  const { updateSettings, signOut } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<AuthSettings>(user.settings);

  async function save() {
    setBusy(true);
    setMessage("");
    const result = await updateSettings(settings);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(
      result.value.synced
        ? "Settings saved."
        : "Saved in this browser. The account service is older than these switches — redeploy it to sync them across devices.",
    );
  }

  const onCount = SETTING_GROUPS.flatMap((group) => group.items).filter(
    (item) => settings[item.key],
  ).length;

  return (
    <div className="account-stack">
      {SETTING_GROUPS.map((group) => (
        <section className="account-panel account-settings-panel" key={group.id}>
          <div className="account-panel-heading account-settings-heading">
            <span className="account-settings-icon" aria-hidden="true">
              {group.id === "email" ? "✉" : "◈"}
            </span>
            <div>
              <h2>{group.title}</h2>
              <p>{group.note}</p>
            </div>
          </div>

          <div className="account-settings-list">
            {group.items.map((item) => (
              <label className="setting-row" key={item.key}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, [item.key]: event.target.checked }))
                  }
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <ThemePicker />

      <div className="account-panel account-settings-actions">
        <div>
          <h2>Save your switches</h2>
          <p>
            {onCount === 0
              ? "Nothing is switched on at the moment."
              : `${onCount} of ${SETTING_GROUPS.flatMap((group) => group.items).length} switched on.`}
          </p>
        </div>
        <div className="account-form-actions">
          <button className="btn accent" type="button" onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
          {message && (
            <span className="account-feedback" role="status">
              {message}
            </span>
          )}
        </div>
      </div>

      <section className="account-panel">
        <div className="account-panel-heading">
          <span className="account-settings-icon" aria-hidden="true">☻</span>
          <div>
            <h2>This account</h2>
            <p>Signed in as {user.email}.</p>
          </div>
        </div>
        <div className="account-settings-actions">
          <div>
            <strong>Sign out</strong>
            <p>Ends this browser's session.</p>
          </div>
          <button className="btn ghost" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}

export function Settings() {
  const { user, loading } = useAuth();
  if (loading) return <AccountLoading title="Settings" path="/settings" />;

  return (
    <AccountFrame title="Settings" path="/settings">
      {user ? <SettingsForm user={user} /> : <SignInRequired />}
    </AccountFrame>
  );
}
