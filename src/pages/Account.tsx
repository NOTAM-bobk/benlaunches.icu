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
import { siteBySlug } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";

const ACCOUNT_NAV: Array<{ to: string; label: string }> = [
  { to: "/profile", label: "Your account" },
  { to: "/saved", label: "Saved" },
  { to: "/settings", label: "Settings" },
];

function AccountFrame({
  title,
  path,
  eyebrow,
  children,
}: {
  title: string;
  path: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteSeo
        title={title}
        description={`${title} for your Boring Internet account.`}
        path={path}
        noindex
      />
      <main className="account-page mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <header className="account-page-heading">
          <span className="account-eyebrow">Your account</span>
          <h1>{title}</h1>
          <p>{eyebrow}</p>
        </header>
        <div className="account-layout">
          <aside className="account-sidebar" aria-label="Account navigation">
            <nav className="account-nav">
              {ACCOUNT_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) => `account-nav-link${isActive ? " active" : ""}`}
                >
                  {item.label}
                  <span aria-hidden="true">→</span>
                </NavLink>
              ))}
            </nav>
          </aside>
          <section className="account-content">{children}</section>
        </div>
      </main>
    </>
  );
}

function AccountLoading({ title, path }: { title: string; path: string }) {
  return (
    <AccountFrame title={title} path={path} eyebrow="Getting your personal space ready…">
      <div className="account-panel account-message" role="status">
        <span className="account-message-mark" aria-hidden="true">…</span>
        <div>
          <h2>Loading your account</h2>
          <p>Your saved sites and settings will be here in a moment.</p>
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

function ProfileForm({ user }: { user: AuthUser }) {
  const { updateProfile } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    avatarSeed: user.avatarSeed,
    bio: user.bio ?? "",
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
          <h2>Make it yours</h2>
          <p>
            Your avatar and name appear in the account menu and on your saves. Pick a colour,
            a face, a ring or a robot — or shuffle for something else entirely.
          </p>
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
          <span>Pick one above or shuffle for a new illustration — no code to type.</span>
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
    { label: "Email updates", value: user.settings.emailUpdates ? "On" : "Off", to: "/settings" },
  ];

  return (
    <section className="account-panel account-overview">
      <div className="account-panel-heading">
        <span className="account-settings-icon" aria-hidden="true">◇</span>
        <div>
          <h2>At a glance</h2>
          <p>What this account has picked up so far.</p>
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
          <dt>Account reference</dt>
          <dd className="account-detail-mono">{user.id.slice(0, 8)}</dd>
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
          <p>The parts of the directory that are yours.</p>
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

export function Profile() {
  const { user, loading } = useAuth();
  if (loading) return <AccountLoading title="Your account" path="/profile" />;

  return (
    <AccountFrame
      title="Your account"
      path="/profile"
      eyebrow="Your name, avatar and bio, plus a summary of what you have saved and voted for."
    >
      {user ? (
        <div className="account-stack">
          <ProfileForm user={user} />
          <AccountOverview user={user} />
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
    <AccountFrame
      title="Saved"
      path="/saved"
      eyebrow="A shelf for sites you want to find again, plus everything you have voted for."
    >
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
            <p>
              Everything here is tied to {user.email}. Remove a site by opening it and tapping Save
              again.
            </p>
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
            <p>Signed in as {user.email}. Saved sites and votes follow this account between devices.</p>
          </div>
        </div>
        <div className="account-settings-actions">
          <div>
            <strong>Sign out</strong>
            <p>Ends the session in this browser. Your saved sites stay on the account.</p>
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
    <AccountFrame
      title="Settings"
      path="/settings"
      eyebrow="Email, motion and privacy switches for how this directory behaves for you."
    >
      {user ? <SettingsForm user={user} /> : <SignInRequired />}
    </AccountFrame>
  );
}
