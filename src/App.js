// App.js — Fairway Content Library (single-file, PDFs + Videos)
// Drop into Codesandbox or CRA. Point DATA_URL at your R2-hosted index.json.
// Features: full-text search, facets (type/industries/personas/topics/tags/year/stage),
// relevance & recency sort, pagination, responsive cards, video playback.

import React, { useEffect, useMemo, useState } from "react";

/* =========================
   1) Configuration
========================= */
// Set this to your custom domain once SSL is live
// e.g. https://learning.the.fairway.fairwaydigitalmedia.com/index.json
const DATA_URL = "https://pub-9d76e1d511764457a42a4f9797dbe836.r2.dev/index.json?v=20251119";

// Optional hero image (Fairway golf background)
const HERO_URL =
  "https://framerusercontent.com/images/hJsp2OrtaOC5U4KCLCvlXMRo8E.png?width=2400&height=1200";

// Content item shape expected from DATA_URL
// {
//   id: number|string,
//   slug: string,
//   title: string,
//   summary: string,
//   industries: string[], personas: string[], topics: string[], tags: string[],
//   funnel_stage: "Awareness"|"Consideration"|"Decision"|"Retention",
//   release_date: ISO string, version: number, read_time_min?: number, words?: number,
//   content_type: "whitepaper"|"video"|"slide"|"infographic",
//   file_url: string,            // PDF or MP4 URL
//   cover_url?: string,          // optional image thumbnail/poster
//   duration_sec?: number        // for videos
// }

// Fallback demo data if fetch fails
const SAMPLE = {
  items: [
    {
      id: 1,
      slug: "zero-trust-2025",
      title: "Zero Trust for 2025: Practical Roadmap",
      summary:
        "A pragmatic guide to sequencing identity, device posture, and micro-segmentation for mid-market enterprises.",
      industries: ["Tech", "Finance"],
      personas: ["CISO", "CIO"],
      topics: ["Zero Trust", "Identity", "Micro-segmentation"],
      tags: ["Security", "Architecture"],
      funnel_stage: "Consideration",
      release_date: "2025-10-15",
      version: 2,
      read_time_min: 11,
      words: 2450,
      content_type: "whitepaper",
      file_url: "https://example.com/zero-trust.pdf",
      cover_url: "https://picsum.photos/seed/zt/640/360",
    },
    {
      id: 2,
      slug: "ai-governance-intro",
      title: "AI Governance Explained (Short Video)",
      summary: "A 2-minute explainer on policy, model evals, and provenance.",
      industries: ["Tech"],
      personas: ["CTO", "Head of Data"],
      topics: ["LLM", "Safety", "Provenance"],
      tags: ["AI", "Video"],
      funnel_stage: "Awareness",
      release_date: "2025-08-01",
      version: 1,
      duration_sec: 125,
      content_type: "video",
      file_url: "https://www.w3schools.com/html/mov_bbb.mp4",
      cover_url: "https://picsum.photos/seed/ai/640/360",
    },
    {
      id: 3,
      slug: "developer-intent-blueprint",
      title: "Developer Intent Blueprint",
      summary:
        "How to use public, verifiable signals to prioritize accounts without renting a DMP.",
      industries: ["SaaS", "Tech"],
      personas: ["VP Marketing", "Growth"],
      topics: ["Developer Intent", "ABM", "Data"],
      tags: ["Demand Gen", "Signals"],
      funnel_stage: "Decision",
      release_date: "2025-09-20",
      version: 3,
      read_time_min: 13,
      words: 3100,
      content_type: "whitepaper",
      file_url: "https://example.com/dev-intent.pdf",
      cover_url: "https://picsum.photos/seed/dev/640/360",
    },
  ],
};

/* =========================
   2) Small utilities
========================= */
const fmtDate = (iso) => new Date(iso).toLocaleDateString();
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const secsToMin = (s) => Math.round((s || 0) / 60);

function includesI(haystack, needle) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function fullTextMatch(p, q) {
  if (!q) return true;
  const fields = [
    p.title || "",
    p.summary || "",
    ...(p.topics || []),
    ...(p.tags || []),
    ...(p.personas || []),
    ...(p.industries || []),
  ].join(" \n ");
  return includesI(fields, q);
}

function computeYear(iso) {
  try {
    return String(new Date(iso).getFullYear());
  } catch {
    return "";
  }
}

function tally(arr) {
  const m = {};
  for (const k of arr) m[k] = (m[k] || 0) + 1;
  return m;
}

/* =========================
   3) Hero component
========================= */
function Hero() {
  return (
    <div
      className="fairway-hero"
      role="img"
      aria-label="Rolling golf fairway at sunrise"
      style={{ backgroundImage: `url(${HERO_URL})` }}
    >
      <div className="fairway-hero__overlay" />
      <div className="fairway-hero__content">
        <h1>Fairway Content Library</h1>
        <p>See more. Know sooner. Decide faster.</p>
      </div>
    </div>
  );
}

/* =========================
   4) Main App
========================= */
export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [q, setQ] = useState("");
  const [ctype, setCtype] = useState([]); // content types
  const [industries, setIndustries] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [topics, setTopics] = useState([]);
  const [tags, setTags] = useState([]);
  const [stage, setStage] = useState([]);
  const [year, setYear] = useState([]);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Fetch data once
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        if (DATA_URL) {
          const r = await fetch(DATA_URL, { mode: "cors" });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const json = await r.json();
          const arr = Array.isArray(json) ? json : json.items || [];
          if (!cancelled) setItems(arr);
        } else {
          if (!cancelled) setItems(SAMPLE.items);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setItems(SAMPLE.items);
          setError("Using fallback sample data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived / filtering
  const filtered = useMemo(() => {
    const qTrim = q.trim();
    return items.filter((p) => {
      if (!fullTextMatch(p, qTrim)) return false;
      if (ctype.length && !ctype.includes(p.content_type)) return false;
      if (
        industries.length &&
        !industries.every((v) => (p.industries || []).includes(v))
      )
        return false;
      if (
        personas.length &&
        !personas.every((v) => (p.personas || []).includes(v))
      )
        return false;
      if (topics.length && !topics.every((v) => (p.topics || []).includes(v)))
        return false;
      if (tags.length && !tags.every((v) => (p.tags || []).includes(v)))
        return false;
      if (stage.length && !stage.includes(p.funnel_stage)) return false;
      if (year.length && !year.includes(computeYear(p.release_date)))
        return false;
      return true;
    });
  }, [items, q, ctype, industries, personas, topics, tags, stage, year]);

  const sorted = useMemo(() => {
    const arr = [...filtered];

    switch (sort) {
      case "newest":
        arr.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
        break;
      case "oldest":
        arr.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
        break;
      case "shortest":
        arr.sort(
          (a, b) =>
            (a.read_time_min || 0) - (b.read_time_min || 0) ||
            new Date(b.release_date) - new Date(a.release_date)
        );
        break;
      case "longest":
        arr.sort(
          (a, b) =>
            (b.read_time_min || 0) - (a.read_time_min || 0) ||
            new Date(b.release_date) - new Date(a.release_date)
        );
        break;
      default: {
        // relevance (if q) else newest
        if (q.trim()) {
          const terms = q.trim().toLowerCase().split(/\s+/);
          const score = (p) => {
            const text =
              (p.title || "") +
              "\n" +
              (p.summary || "") +
              "\n" +
              (Array.isArray(p.topics) ? p.topics.join(" ") : "") +
              "\n" +
              (Array.isArray(p.tags) ? p.tags.join(" ") : "") +
              "\n" +
              (Array.isArray(p.personas) ? p.personas.join(" ") : "") +
              "\n" +
              (Array.isArray(p.industries) ? p.industries.join(" ") : "");
            const lower = text.toLowerCase();

            let s = 0;
            for (const w of terms) {
              if (!w) continue;
              if ((p.title || "").toLowerCase().includes(w)) s += 5;
              if ((p.summary || "").toLowerCase().includes(w)) s += 2;
              if (lower.includes(w)) s += 1; // catch tag/topic/persona/industry hits
            }
            const yearsOld =
              (Date.now() - new Date(p.release_date).getTime()) /
              (1000 * 60 * 60 * 24 * 365);
            s += Math.max(0, 2 - yearsOld); // small recency boost
            return s;
          };
          arr.sort((a, b) => score(b) - score(a));
        } else {
          arr.sort(
            (a, b) => new Date(b.release_date) - new Date(a.release_date)
          );
        }
      }
    }

    return arr;
  }, [filtered, sort, q]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = clamp(page, 1, pageCount);
  const pageItems = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );

  // Facets from *current* filtered universe (except the facet itself — simple approach)
  const facets = useMemo(() => {
    const yrs = filtered.map((p) => computeYear(p.release_date));
    const typ = filtered.map((p) => p.content_type || "content");
    const ind = filtered.flatMap((p) => p.industries || []);
    const per = filtered.flatMap((p) => p.personas || []);
    const top = filtered.flatMap((p) => p.topics || []);
    const tag = filtered.flatMap((p) => p.tags || []);
    const stg = filtered.map((p) => p.funnel_stage);
    return {
      type: tally(typ),
      year: tally(yrs),
      industries: tally(ind),
      personas: tally(per),
      topics: tally(top),
      tags: tally(tag),
      stage: tally(stg),
    };
  }, [filtered]);

  // Toggle helpers
  const toggle = (setter, arr, v) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // UI bits
  const Pill = ({ label, count, selected, onClick }) => (
    <button
      onClick={onClick}
      className={"pill " + (selected ? "pill--on" : "")}
    >
      {label} <span className="pill__n">({count})</span>
    </button>
  );

  const Facet = ({ title, map, selected, onToggle }) => (
    <section className="facet">
      <h3>{title}</h3>
      <div className="facet__wrap">
        {Object.entries(map)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([k, n]) => (
            <Pill
              key={k}
              label={k}
              count={n}
              selected={selected.includes(k)}
              onClick={() => onToggle(k)}
            />
          ))}
      </div>
    </section>
  );

  const ActiveChips = () => {
    const chips = [];
    const pushChips = (k, arr) => arr.forEach((v) => chips.push({ k, v }));
    pushChips("type", ctype);
    pushChips("industries", industries);
    pushChips("personas", personas);
    pushChips("topics", topics);
    pushChips("tags", tags);
    pushChips("stage", stage);
    pushChips("year", year);
    if (!chips.length) return null;
    return (
      <div className="chips">
        {chips.map((c) => (
          <button
            key={c.k + "/" + c.v}
            className="chip"
            onClick={() => {
              if (c.k === "type") toggle(setCtype, ctype, c.v);
              else if (c.k === "industries")
                toggle(setIndustries, industries, c.v);
              else if (c.k === "personas") toggle(setPersonas, personas, c.v);
              else if (c.k === "topics") toggle(setTopics, topics, c.v);
              else if (c.k === "tags") toggle(setTags, tags, c.v);
              else if (c.k === "stage") toggle(setStage, stage, c.v);
              else if (c.k === "year") toggle(setYear, year, c.v);
            }}
          >
            {c.k}: {c.v} ×
          </button>
        ))}
      </div>
    );
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [q, ctype, industries, personas, topics, tags, stage, year, pageSize]);

  return (
    <div className="wrap">
      <Hero />

      <header className="hdr">
        <div className="hdr__row">
          <input
            className="input"
            placeholder="Search titles, summaries, topics, tags…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="lbl">
            Sort
            <select
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="shortest">Shortest read</option>
              <option value="longest">Longest read</option>
            </select>
          </label>
          <label className="lbl">
            Page size
            <select
              className="select"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[6, 12, 24, 48].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ActiveChips />
      </header>

      <div className="grid">
        <aside className="rail">
          <Facet
            title="Type"
            map={facets.type || {}}
            selected={ctype}
            onToggle={(v) => toggle(setCtype, ctype, v)}
          />
          <Facet
            title="Industries"
            map={facets.industries || {}}
            selected={industries}
            onToggle={(v) => toggle(setIndustries, industries, v)}
          />
          <Facet
            title="Personas"
            map={facets.personas || {}}
            selected={personas}
            onToggle={(v) => toggle(setPersonas, personas, v)}
          />
          <Facet
            title="Topics"
            map={facets.topics || {}}
            selected={topics}
            onToggle={(v) => toggle(setTopics, topics, v)}
          />
          <Facet
            title="Tags"
            map={facets.tags || {}}
            selected={tags}
            onToggle={(v) => toggle(setTags, tags, v)}
          />
          <Facet
            title="Year"
            map={facets.year || {}}
            selected={year}
            onToggle={(v) => toggle(setYear, year, v)}
          />
          <Facet
            title="Funnel Stage"
            map={facets.stage || {}}
            selected={stage}
            onToggle={(v) => toggle(setStage, stage, v)}
          />
        </aside>

        <main className="main">
          {loading ? (
            <div className="muted">Loading…</div>
          ) : error ? (
            <div className="warn">{error}</div>
          ) : null}
          <div className="muted small">{total} results</div>
          <div className="cards">
            {pageItems.map((p) => (
              <article key={p.id} className="card">
                {/* Media */}
                {p.content_type === "video" ? (
                  <div className="media">
                    <video
                      controls
                      preload="metadata"
                      poster={p.cover_url || undefined}
                      src={p.file_url}
                      width="100%"
                    />
                  </div>
                ) : p.cover_url ? (
                  <div className="media">
                    <img className="cover" src={p.cover_url} alt="cover" />
                  </div>
                ) : null}

                {/* Header */}
                <div className="card__hdr">
                  <h3 className="card__title">{p.title}</h3>
                  <div className="card__meta">
                    {fmtDate(p.release_date)} •{" "}
                    {p.content_type === "video"
                      ? `${secsToMin(p.duration_sec)} min`
                      : `${
                          p.read_time_min || Math.round((p.words || 1200) / 200)
                        } min`}{" "}
                    • v{p.version}
                  </div>
                </div>

                {/* Summary */}
                <p className="card__sum">{p.summary}</p>

                {/* Tags */}
                <div className="tags">
                  <span className="tag tag--kind">{p.content_type}</span>
                  {(p.topics || []).slice(0, 3).map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div className="cta">
                  {p.content_type === "video" ? (
                    <a
                      className="btn"
                      href={p.file_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Video
                    </a>
                  ) : (
                    <a
                      className="btn"
                      href={p.file_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View PDF
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>

          {pageCount > 1 && (
            <div className="pager">
              <button
                className="btn"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                Prev
              </button>
              <span>
                Page {safePage} of {pageCount}
              </span>
              <button
                className="btn"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Styles */}
      <style>{`
        :root{
          --fairway-green:#1B8E4B;
          --ink:#0F1A13;
        }
        *{box-sizing:border-box} body{margin:0}
        .wrap{max-width:1200px;margin:0 auto;padding:16px}

        /* Hero */
        .fairway-hero{
          position: relative;
          min-height: 42vh;
          background-size: cover;
          background-position: center 45%;
          border-radius: 24px;
          overflow: hidden;
          margin: 8px auto 16px;
        }
        .fairway-hero__overlay{
          position:absolute; inset:0;
          background: linear-gradient(180deg, rgba(15,26,19,.35) 0%, rgba(15,26,19,.6) 100%);
          box-shadow: inset 0 -80px 140px rgba(27,142,75,.22);
        }
        .fairway-hero__content{
          position:absolute; inset:0;
          display:flex; flex-direction:column; justify-content:flex-end;
          padding: clamp(16px, 4vw, 40px);
          color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.35);
        }
        .fairway-hero__content h1{
          margin:0 0 6px; font-size: clamp(28px, 4vw, 44px); line-height:1.1;
        }
        .fairway-hero__content p{ margin:0; opacity:.95; }

        /* Header / controls */
        .hdr__row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}
        .input{flex:1;min-width:260px;padding:10px 12px;border:1px solid #ddd;border-radius:8px}
        .lbl{display:flex;align-items:center;gap:6px;font-size:14px;color:#555}
        .select{padding:8px;border:1px solid #ddd;border-radius:8px;background:white}
        .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
        .chip{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:6px 10px;font-size:12px}

        /* Layout */
        .grid{display:grid;grid-template-columns:280px 1fr;gap:16px;margin-top:16px}
        @media(max-width:900px){.grid{grid-template-columns:1fr}}
        .rail{display:flex;flex-direction:column;gap:14px}
        .facet h3{margin:0 0 6px 0;font-size:14px}
        .facet__wrap{display:flex;flex-wrap:wrap;gap:8px}
        .pill{padding:6px 10px;border:1px solid #e5e7eb;border-radius:999px;background:white;font-size:12px}
        .pill--on{background:var(--ink);color:white;border-color:var(--ink)}
        .main{min-height:300px}
        .muted{color:#6b7280}
        .small{font-size:12px;margin:8px 0}

        /* Cards */
        .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:8px}
        @media(max-width:1100px){.cards{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:700px){.cards{grid-template-columns:1fr}}
        .card{
          border:1px solid #e5e7eb;border-radius:16px;padding:14px;overflow:hidden;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(6px);
        }
        .media{margin:-14px -14px 10px -14px}
        .cover{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
        .card__title{margin:0;font-size:16px}
        .card__meta{font-size:12px;color:#6b7280;margin-top:4px}
        .card__sum{font-size:14px;line-height:1.6;margin:10px 0 8px}
        .tags{display:flex;gap:8px;flex-wrap:wrap}
        .tag{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:4px 8px;font-size:11px}
        .tag--kind{background:#eef8f2;border-color:#cde9db}
        .cta{margin-top:10px}
        .btn{padding:8px 12px;border:1px solid #ddd;border-radius:8px;background:white}
        .btn:hover{border-color:var(--fairway-green); color:var(--fairway-green)}
        .pager{display:flex;gap:10px;align-items:center;justify-content:center;margin:16px 0}
        .warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:8px;border-radius:8px;margin:6px 0}
      `}</style>
    </div>
  );
}
