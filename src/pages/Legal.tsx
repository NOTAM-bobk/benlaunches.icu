import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { siteLinks, siteName } from "../lib/siteData";

/** The date the text below was last touched. Shown at the top of both pages. */
const LAST_UPDATED = "2026-10-09";

interface LegalSection {
  id: string;
  heading: string;
  body: ReactNode;
}

/**
 * One frame for both legal pages: eyebrow, title, "last updated" line, a quiet
 * table of contents, then the sections. Written in plain English on purpose —
 * these describe what the code in this repository actually does.
 */
function LegalPage({
  title,
  path,
  eyebrow,
  intro,
  sections,
}: {
  title: string;
  path: string;
  eyebrow: string;
  intro: string;
  sections: LegalSection[];
}) {
  // A link like /privacy#cookies arrives before the section exists, so the
  // browser's own jump misses. Scroll to it once the page has rendered.
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <SiteSeo
        title={title}
        description={`${title} for ${siteName}: what the directory does, what it stores, and what it does not.`}
        path={path}
        keywords={[title.toLowerCase(), `${siteName} ${title.toLowerCase()}`, "directory terms"]}
      />

      <div className="legal-page mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <header className="flex flex-col gap-3 border-b pb-6" style={{ borderColor: "var(--rule)" }}>
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            {eyebrow}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">{title}</h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            {intro}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--muted)" }}>
            Last updated {LAST_UPDATED}
          </p>
        </header>

        <nav className="legal-toc" aria-label="On this page">
          <span className="legal-toc-label">On this page</span>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.heading}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="legal-body">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="legal-section scroll-mt-28">
              <h2>{section.heading}</h2>
              {section.body}
            </section>
          ))}
        </div>

        <p className="legal-foot">
          Questions about this page?{" "}
          {siteLinks.contact ? (
            <a href={siteLinks.contact}>Email us</a>
          ) : (
            <Link to="/submit">Send us a note</Link>
          )}
          . See also the <Link to="/terms">terms of service</Link> and the{" "}
          <Link to="/privacy">privacy policy</Link>.
        </p>
      </div>
    </>
  );
}

const TERMS: LegalSection[] = [
  {
    id: "using-this-directory",
    heading: "Using this directory",
    body: (
      <>
        <p>
          {siteName} is a hand-edited list of launched websites. Browsing it is free and needs no
          account. We try to check every listing, but a link always leaves this site and lands on
          someone else's, so what you find there is up to them.
        </p>
        <p>
          Please do not scrape the directory in a way that strains it, resell the list as your own
          product, or present a listing as an endorsement by us.
        </p>
      </>
    ),
  },
  {
    id: "submissions-and-listings",
    heading: "Submissions and listings",
    body: (
      <>
        <p>
          You can submit a site for review from the{" "}
          <Link to="/submit">submit page</Link>. A person reads every submission. We may edit the
          wording, change the category or tags, delay an entry, or decline it. There is no fee to
          be considered.
        </p>
        <p>
          You keep all rights to your site and its name. By submitting, you confirm the site is
          yours or that you are allowed to promote it, and you give us permission to describe and
          link to it here.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    heading: "Accounts",
    body: (
      <>
        <p>
          An account is optional. It is what lets you save websites and vote in a way that follows
          you between devices. Keep your password to yourself and use an email address you can
          actually receive mail at, since that is how we would reach you about the account.
        </p>
        <p>
          You are responsible for what happens under your account. We may suspend an account that
          breaks these terms, and you can stop using it at any time.
        </p>
      </>
    ),
  },
  {
    id: "votes-and-rankings",
    heading: "Votes and rankings",
    body: (
      <>
        <p>
          Votes move the <Link to="/trending">trending list</Link>. One vote per site per account
          (or per browser while you are signed out), and voting for a site you run is fine — once.
        </p>
        <p>
          We may ignore, reset, or remove votes when a site is being pushed artificially, and the
          rankings are a picture of interest rather than a promise about quality.
        </p>
      </>
    ),
  },
  {
    id: "paid-placements",
    heading: "Paid placements and services",
    body: (
      <>
        <p>
          The placements and services on the <Link to="/advertise">advertise page</Link> can be
          bought on the <Link to="/checkout">checkout page</Link>. Payment is taken by PayPal, so
          your card and bank details never reach this site. Prices are in US dollars and are
          charged once, even for placements that run for a full 30 days.
        </p>
        <p>
          Paid placements are always labelled as paid, and paying is never required to be listed
          or reviewed. If an order goes wrong, email us and we will sort it out.
        </p>
      </>
    ),
  },
  {
    id: "availability-and-changes",
    heading: "Availability and changes",
    body: (
      <>
        <p>
          This is a small project run without a support desk, so the directory is offered as-is:
          no uptime promise, and pages, categories and features may change or be retired.
        </p>
        <p>
          These terms may change too. The date at the top of this page shows when they last did,
          and continuing to use the directory after a change means you accept the new version.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <p>
        For anything on this page — a listing you want changed or removed, a takedown request, or a
        question about the rules —{" "}
        {siteLinks.contact ? (
          <a href={siteLinks.contact}>email us</a>
        ) : (
          <Link to="/submit">get in touch</Link>
        )}
        .
      </p>
    ),
  },
];

const PRIVACY: LegalSection[] = [
  {
    id: "what-we-collect",
    heading: "What we collect",
    body: (
      <>
        <p>
          If you never make an account, we collect nothing about you beyond what any web server
          sees to serve a page. If you do make one, an account holds:
        </p>
        <ul>
          <li>your email address, display name, short bio and avatar choice;</li>
          <li>the websites you save, and the votes you cast while signed in;</li>
          <li>your preference switches, such as email updates.</li>
        </ul>
        <p>
          Site submissions carry the details you type about the site — name, URL, launch date,
          description and so on — plus a timestamp. There is no field asking for your name or
          email on that form.
        </p>
      </>
    ),
  },
  {
    id: "where-it-lives",
    heading: "Where it lives",
    body: (
      <p>
        Accounts, saves, votes and submissions are stored in a small Cloudflare Worker with a
        key-value store (see <code>cloudflare/</code> in the repository). Passwords are stored
        hashed, never in plain text. The directory itself is a static site, so pages you only read
        do not touch the database at all.
      </p>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies and browser storage",
    body: (
      <>
        <p>
          Signing in sets one session cookie, which is what keeps you signed in. That is the only
          cookie we set — no advertising cookies, no cross-site tracking pixels.
        </p>
        <p>
          Your browser's local storage holds a few small things: the sites this browser has already
          voted on, vote counts when the vote service cannot be reached, and which nav groups you
          left open. Clearing your browser data clears all of it.
        </p>
      </>
    ),
  },
  {
    id: "signed-out-votes",
    heading: "Votes when you are signed out",
    body: (
      <p>
        You can vote without signing in. Those votes are kept in your browser and used to keep the
        page consistent for you; they are only shared with the vote service when it is configured
        and reachable. Nothing about them identifies you.
      </p>
    ),
  },
  {
    id: "third-parties",
    heading: "Third-party requests",
    body: (
      <>
        <p>
          A few images and screenshots on this site are drawn by other services, which your browser
          requests directly. They see your IP address and the page you came from, under their own
          privacy policies, not ours:
        </p>
        <ul>
          <li>
            <strong>DiceBear</strong> — draws the illustrated avatars.
          </li>
          <li>
            <strong>thum.io</strong> — takes the screenshot used as the backdrop on a site's page.
          </li>
          <li>
            <strong>Google's favicon service</strong> — supplies the small site icons.
          </li>
          <li>
            <strong>Cloudflare</strong> — serves the site and the account/vote service.
          </li>
          <li>
            <strong>Google Analytics</strong> — counts page views and shows us roughly where visitors
            came from, using cookies set for this site and a coarse location derived from your IP
            address. Google describes its handling in the{" "}
            <a href="https://policies.google.com/privacy">Google privacy policy</a>, and offers a{" "}
            <a href="https://tools.google.com/dlpage/gaoptout">browser add-on that opts you out</a>.
          </li>
        </ul>
        <p>We run no advertising network on these pages.</p>
      </>
    ),
  },
  {
    id: "your-choices",
    heading: "Your choices",
    body: (
      <>
        <p>
          From your <Link to="/settings">settings</Link> you can turn email updates off and sign
          out; from your <Link to="/profile">profile</Link> you can change or blank your name, bio
          and avatar. Signing out does not delete your saved sites.
        </p>
        <p>
          To have an account and everything attached to it deleted,{" "}
          {siteLinks.contact ? (
            <a href={siteLinks.contact}>send us a note</a>
          ) : (
            <Link to="/submit">send us a note</Link>
          )}{" "}
          from the address on the account and we will remove it.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: (
      <p>
        If what we collect or where it is stored changes, this page changes with it — the date at
        the top is the version marker. Anything new that needs your consent will be asked for
        before it is switched on.
      </p>
    ),
  },
];

export function Terms() {
  return (
    <LegalPage
      title="Terms of service"
      path="/terms"
      eyebrow="The rules"
      intro={`The short version of how ${siteName} works, what you can count on, and what we expect from a listing or an account.`}
      sections={TERMS}
    />
  );
}

export function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      path="/privacy"
      eyebrow="Your data"
      intro={`What ${siteName} stores, where it lives, and the things it deliberately does not do.`}
      sections={PRIVACY}
    />
  );
}
