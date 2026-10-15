import { useMemo, useState } from "react";
import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { categoryLabel, rankedSites, siteName, siteUrl, type Site } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";

type TraitId = "reader" | "builder" | "explorer" | "archivist" | "listener";

const TRAITS: TraitId[] = ["reader", "builder", "explorer", "archivist", "listener"];

interface Archetype {
  name: string;
  blurb: string;
  glyph: string;
  categories: string[];
}

const ARCHETYPES: Record<TraitId, Archetype> = {
  reader: {
    name: "The Slow Reader",
    blurb:
      "You want one page, one column, and no notifications. You read to the end of things, and you would rather a site be quiet than clever.",
    glyph: "📖",
    categories: ["reading", "books", "notes", "writing"],
  },
  builder: {
    name: "The Tinkerer",
    blurb:
      "You open the inspector before the menu. If a site has an API you will find it, and if it breaks you will fix it in a tab rather than a ticket.",
    glyph: "🔧",
    categories: ["dev", "tools", "linux", "self-hosting", "api", "minimal"],
  },
  explorer: {
    name: "The Cartographer",
    blurb:
      "You follow one link and surface an hour later somewhere unexpected. Maps, sky charts and side quests are your natural habitat.",
    glyph: "🧭",
    categories: ["maps", "travel", "space", "science", "nature"],
  },
  archivist: {
    name: "The Archivist",
    blurb:
      "You keep things. Old web, public-domain books, reference tables — if it might vanish, you have already saved a copy.",
    glyph: "🗄️",
    categories: ["archives", "history", "reference", "datasets", "retro", "books"],
  },
  listener: {
    name: "The Listener",
    blurb:
      "You work with something playing quietly. Radio scanners, wordless mixes, long interviews — a site is better when it makes a sound.",
    glyph: "🎧",
    categories: ["sound", "music", "radio", "podcasts", "video"],
  },
};

interface Option {
  label: string;
  traits: TraitId[];
}

interface Question {
  prompt: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    prompt: "It's 10pm and the flat is quiet. What do you open?",
    options: [
      { label: "An essay I've been saving for exactly this mood.", traits: ["reader"] },
      { label: "The side project I'm halfway through.", traits: ["builder"] },
      { label: "A map of somewhere I haven't been.", traits: ["explorer"] },
      { label: "A radio station from another country.", traits: ["listener"] },
    ],
  },
  {
    prompt: "You find a directory of directories. First instinct?",
    options: [
      { label: "Search it for one perfect link.", traits: ["explorer"] },
      { label: "Save it to read properly later.", traits: ["archivist"] },
      { label: "Right-click → view source.", traits: ["builder"] },
      { label: "Press play on whatever it points at.", traits: ["listener"] },
    ],
  },
  {
    prompt: "Your bookmarks bar, honestly, is…",
    options: [
      { label: "Three links I actually use.", traits: ["reader", "builder"] },
      { label: "A graveyard of half-finished tutorials.", traits: ["builder"] },
      { label: "Every atlas, sky chart and trail map I've met.", traits: ["explorer"] },
      { label: "So long it scrolls sideways.", traits: ["archivist"] },
    ],
  },
  {
    prompt: "Which would you drop everything to try?",
    options: [
      { label: "A text-only version of a site you know.", traits: ["reader"] },
      { label: "An API that returns something ridiculous.", traits: ["builder"] },
      { label: "A live globe of what's overhead right now.", traits: ["explorer"] },
      { label: "A scanner feed from a city you've never visited.", traits: ["listener"] },
    ],
  },
  {
    prompt: "A website asks you to create an account. You…",
    options: [
      { label: "Close the tab.", traits: ["reader"] },
      { label: "Check what it's actually sending.", traits: ["builder"] },
      { label: "Sign up with a throwaway and wander.", traits: ["explorer"] },
      { label: "Look for the version it replaced.", traits: ["archivist"] },
    ],
  },
  {
    prompt: "Last one. Pick a room to spend the afternoon in.",
    options: [
      { label: "A library with one very good chair.", traits: ["reader"] },
      { label: "An archive basement nobody visits.", traits: ["archivist"] },
      { label: "A lookout post with a view.", traits: ["explorer"] },
      { label: "A studio at 2am with the music low.", traits: ["listener"] },
    ],
  },
];

/** The top archetype from a tally, with the runner-up for a bit of colour. */
function readResult(tally: Record<TraitId, number>): {
  winner: TraitId;
  runnerUp: TraitId;
  total: number;
  shares: Array<{ id: TraitId; count: number; percent: number }>;
} {
  const shares = TRAITS.map((id) => ({ id, count: tally[id] }))
    .sort((a, b) => b.count - a.count)
    .map((entry) => {
      const total = TRAITS.reduce((sum, id) => sum + tally[id], 0) || 1;
      return { ...entry, percent: Math.round((entry.count / total) * 100) };
    });
  const total = TRAITS.reduce((sum, id) => sum + tally[id], 0) || 1;
  return {
    winner: shares[0]?.id ?? "reader",
    runnerUp: shares[1]?.id ?? "reader",
    total,
    shares,
  };
}

/** Four listings from the archetype's categories, ranked, never repeated. */
function picksFor(archetype: Archetype): Site[] {
  const wanted = new Set(archetype.categories);
  const ranked = rankedSites();
  const inTheme = ranked.filter((site) => wanted.has(site.category)).slice(0, 4);
  if (inTheme.length >= 4) return inTheme;
  const seen = new Set(inTheme.map((site) => site.slug));
  return [...inTheme, ...ranked.filter((site) => !seen.has(site.slug))].slice(0, 4);
}

export default function WebsitePersonalityQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<TraitId[][]>([]);

  const done = step >= QUESTIONS.length;
  const tally = useMemo(() => {
    const tally: Record<TraitId, number> = { reader: 0, builder: 0, explorer: 0, archivist: 0, listener: 0 };
    for (const picked of answers) {
      for (const trait of picked) tally[trait] += 1;
    }
    return tally;
  }, [answers]);

  const result = useMemo(() => readResult(tally), [tally]);
  const archetype = ARCHETYPES[result.winner];
  const runnerUp = ARCHETYPES[result.runnerUp];
  const picks = useMemo(() => picksFor(archetype), [archetype]);

  function choose(option: Option) {
    setAnswers((current) => [...current, option.traits]);
    setStep((value) => value + 1);
  }

  function restart() {
    setAnswers([]);
    setStep(0);
  }

  const question = QUESTIONS[step];

  return (
    <>
      <SiteSeo
        title="The Website Personality Quiz"
        description={`Answer six questions and find the kind of websites you actually like, with picks from ${siteName}.`}
        path="/website-personality-quiz"
        keywords={["website personality quiz", "what website are you", "quiz", "discover websites"]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Quiz",
            name: "The Website Personality Quiz",
            url: `${siteUrl}/website-personality-quiz`,
            about: { "@type": "Thing", name: "Websites" },
            inLanguage: "en",
          },
        ]}
      />

      <div className="quiz-page mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <header className="quiz-head">
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">A game</span>
          <h1>The Website Personality Quiz</h1>
          <p>
            Six questions, no wrong answers. At the end you get the kind of website person you are,
            and four listings from the directory to prove it.
          </p>
        </header>

        {!done && question ? (
          <section className="quiz-card" aria-live="polite">
            <div className="quiz-progress">
              <span>
                Question {step + 1} of {QUESTIONS.length}
              </span>
              <span className="quiz-progress-bar" aria-hidden="true">
                <span style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
              </span>
            </div>
            <h2 className="quiz-prompt">{question.prompt}</h2>
            <ul className="quiz-options">
              {question.options.map((option) => (
                <li key={option.label}>
                  <button type="button" className="quiz-option" onClick={() => choose(option)}>
                    {option.label}
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="quiz-result" aria-live="polite">
            <div className="quiz-result-card">
              <span className="quiz-result-glyph" aria-hidden="true">{archetype.glyph}</span>
              <span className="quiz-result-eyebrow">You are</span>
              <h2>{archetype.name}</h2>
              <p>{archetype.blurb}</p>
              <p className="quiz-runner-up">
                Runner-up: <strong>{runnerUp.name}</strong>
              </p>

              <ul className="quiz-shares" aria-label="Your answers, broken down">
                {result.shares.map((share) => (
                  <li key={share.id}>
                    <span className="quiz-share-label">{ARCHETYPES[share.id].name}</span>
                    <span className="quiz-share-bar" aria-hidden="true">
                      <span style={{ width: `${share.percent}%` }} />
                    </span>
                    <span className="quiz-share-value">{share.percent}%</span>
                  </li>
                ))}
              </ul>

              <button type="button" className="btn ghost" onClick={restart}>
                Take it again
              </button>
            </div>

            <div className="quiz-picks">
              <div className="quiz-picks-head">
                <h3>Websites for {archetype.name.replace("The ", "")}</h3>
                <p>Four listings that match how you answered.</p>
              </div>
              <ul className="quiz-pick-grid">
                {picks.map((site) => (
                  <li key={site.id} className="card quiz-pick">
                    <div className="quiz-pick-head">
                      <SiteIcon site={site} size={30} label={false} />
                      <Link to={`/sites/${site.slug}`}>{site.name}</Link>
                    </div>
                    <p>{site.description}</p>
                    <span className="quiz-pick-meta">
                      {categoryLabel(site.category)} · {siteDomain(site.url)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
