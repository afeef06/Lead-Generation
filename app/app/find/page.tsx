'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { IconArrowRight, IconCheck, IconWarning, IconStar, IconGlobe } from '../components/icons';
import { LeadIntelligenceTabs } from '@/components/lead-intelligence-tabs';
import type { PlacesResult } from '../api/places/route';

interface ScoreResult {
  framework: string;
  score: number;
  reasoning: string;
}

const FW: Record<string, { label: string; short: string; color: string }> = {
  brand_positioning:     { label: 'Brand Positioning',     short: 'Brand',       color: '#d4af37' },
  client_acquisition:    { label: 'Client Acquisition',    short: 'Acquisition', color: '#3A8B6A' },
  growth_infrastructure: { label: 'Growth Infrastructure', short: 'Growth',      color: '#7A5CAE' },
  scaling_roadmap:       { label: 'Scaling Roadmap',       short: 'Scaling',     color: '#4A7EC4' },
  venture_development:   { label: 'Venture Development',   short: 'Venture',     color: '#AA5E7C' },
};

function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) return url;
  } catch { /* invalid URL */ }
  return undefined;
}

function FwBadge({ fw, score }: { fw: string; score: number }) {
  const meta = FW[fw];
  if (!meta) return null;
  return (
    <div className="fw-cell">
      <span
        className="fw-badge"
        style={{ color: meta.color, background: `${meta.color}12`, borderColor: `${meta.color}30` }}
      >
        <span className="fw-dot" style={{ background: meta.color }} />
        {meta.short}
      </span>
      <span className="fw-score" style={{ color: meta.color }}>{score.toFixed(1)}</span>
    </div>
  );
}

function ResultRow({
  r, index, score, scoring, saved, saving, onSave,
}: {
  r: PlacesResult; index: number;
  score?: ScoreResult; scoring: boolean;
  saved: boolean; saving: boolean; onSave: () => void;
}) {
  return (
    <tr className="bf-result-row" style={{ animationDelay: `${index * 25}ms` }}>
      <td className="bf-td-num">{index + 1}</td>
      <td className="bf-td-name">
        <a href={r.maps_url} target="_blank" rel="noreferrer noopener" className="bf-name-link">{r.name}</a>
        <span className="bf-address">{r.address}</span>
      </td>
      <td className="bf-td-fw">
        {score
          ? <FwBadge fw={score.framework} score={score.score} />
          : <span className="scoring-dots">{scoring ? '···' : '—'}</span>}
      </td>
      <td className="bf-td-reasoning">
        {score
          ? <span className="bf-reasoning-text">{score.reasoning}</span>
          : <span className="scoring-dots muted">{scoring ? 'Analysing…' : ''}</span>}
      </td>
      <td className="bf-td-web">
        {safeUrl(r.website)
          ? (
            <a href={safeUrl(r.website)} target="_blank" rel="noreferrer noopener" className="bf-web-link">
              <IconGlobe size={11} />
              {r.website!.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
            </a>
          )
          : <span className="bf-empty">—</span>}
      </td>
      <td className="bf-td-rating">
        {r.rating !== null
          ? (
            <span className="bf-rating">
              <IconStar size={11} className="icon-gold" />
              {r.rating.toFixed(1)}
              <span className="bf-reviews">({r.user_ratings_total?.toLocaleString()})</span>
            </span>
          )
          : <span className="bf-empty">—</span>}
      </td>
      <td className="bf-td-save">
        {saved
          ? <span className="save-done"><IconCheck size={11} />Saved</span>
          : (
            <button className="btn-save" onClick={onSave} disabled={saving}>
              {saving ? '…' : <><IconArrowRight size={10} />Save</>}
            </button>
          )}
      </td>
    </tr>
  );
}

export default function BusinessFinderPage() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<PlacesResult[] | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scores, setScores] = useState<Record<string, ScoreResult>>({});
  const [scoring, setScoring] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  const loadSavedIds = useCallback(async () => {
    const res = await fetch('/api/leads');
    if (res.ok) {
      const data = await res.json();
      const ids = new Set<string>(data.place_ids);
      setSavedIds(ids);
      setSavedCount(ids.size);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login');
      else loadSavedIds();
    });
  }, [supabase, router, loadSavedIds]);

  async function scoreLeads(leads: PlacesResult[]) {
    setScoring(true);
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }),
      });
      if (res.ok) {
        const data = await res.json();
        setScores(prev => ({ ...prev, ...(data.scores ?? {}) }));
      }
    } finally {
      setScoring(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);
    setScores({});
    try {
      const params = new URLSearchParams({ name: name.trim() });
      if (city.trim()) params.set('city', city.trim());
      const res = await fetch(`/api/places?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results);
      setQuery(data.query);
      if (data.results.length > 0) scoreLeads(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(r: PlacesResult) {
    const score = scores[r.place_id];
    setSavingId(r.place_id);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...r,
          framework_match: score?.framework ?? null,
          framework_score: score?.score ?? null,
          framework_reasoning: score?.reasoning ?? null,
        }),
      });
      if (res.ok || res.status === 409) {
        setSavedIds(prev => new Set([...prev, r.place_id]));
        if (res.ok) setSavedCount(c => c + 1);
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <style>{`
        .bf-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 48px 40px 80px;
        }

        .bf-hero { margin-bottom: 40px; }
        .bf-hero h1 {
          font-family: var(--font-d);
          font-size: 44px;
          font-weight: 500;
          color: var(--t0);
          line-height: 1.05;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }
        .bf-hero h1 em { color: var(--gold-dim); font-style: italic; }
        .bf-hero p { font-size: 12px; color: var(--t1); max-width: 520px; line-height: 1.7; letter-spacing: 0.02em; }

        .bf-form {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .bf-field { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
        .bf-field label {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .bf-field input {
          background: var(--bg1);
          border: none;
          border-bottom: 1px solid var(--b0);
          color: var(--t0);
          font-size: 14px;
          font-family: var(--font-mono);
          padding: 10px 0;
          outline: none;
          transition: border-color 0.2s;
          letter-spacing: 0.02em;
        }
        .bf-field input::placeholder { color: var(--t2); }
        .bf-field input:focus { border-bottom-color: var(--gold-dim); }
        .bf-optional {
          font-size: 9px;
          color: var(--t2);
          font-family: var(--font-mono);
          letter-spacing: 0.08em;
          font-style: italic;
        }
        .bf-hint {
          font-size: 11px;
          color: var(--t2);
          margin-bottom: 36px;
          line-height: 1.6;
          font-family: var(--font-mono);
          letter-spacing: 0.03em;
        }

        .bf-status-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .bf-query-label {
          font-family: var(--font-d);
          font-size: 17px;
          font-weight: 500;
          color: var(--gold-dim);
          font-style: italic;
        }
        .bf-count-tag {
          font-size: 10px;
          color: var(--t2);
          font-family: var(--font-mono);
          background: var(--bg2);
          border: 1px solid var(--b0);
          padding: 2px 9px;
          letter-spacing: 0.08em;
        }

        .bf-tbl-wrap { border: 1px solid var(--b0); overflow: hidden; }
        .bf-table { width: 100%; border-collapse: collapse; }
        .bf-thead { background: var(--bg2); border-bottom: 1px solid var(--b0); }
        .bf-thead th {
          padding: 9px 14px;
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          text-align: left;
          white-space: nowrap;
        }
        .bf-result-row {
          border-bottom: 1px solid var(--b1);
          background: var(--bg1);
          animation: rowIn 0.28s ease both;
          transition: background 0.1s;
        }
        .bf-result-row:last-child { border-bottom: none; }
        .bf-result-row:hover { background: var(--bg2); }
        .bf-result-row td { padding: 10px 14px; vertical-align: middle; }

        .bf-td-num { font-size: 10px; font-family: var(--font-mono); color: var(--t2); width: 30px; }
        .bf-td-name { min-width: 180px; }
        .bf-name-link {
          font-size: 13px;
          font-weight: 500;
          color: var(--t0);
          text-decoration: none;
          display: block;
          margin-bottom: 3px;
          transition: color 0.12s;
          font-family: var(--font-mono);
          letter-spacing: 0.01em;
        }
        .bf-name-link:hover { color: var(--gold-dim); }
        .bf-address { font-size: 10px; color: var(--t2); font-family: var(--font-mono); display: block; line-height: 1.4; }
        .bf-td-fw { width: 160px; }
        .bf-td-reasoning { max-width: 280px; }
        .bf-reasoning-text {
          font-size: 11px;
          color: var(--t1);
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-family: var(--font-mono);
          letter-spacing: 0.01em;
        }
        .bf-td-web { font-size: 11px; max-width: 160px; }
        .bf-web-link {
          color: var(--blue);
          text-decoration: none;
          font-size: 10px;
          font-family: var(--font-mono);
          word-break: break-all;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: color 0.12s;
          letter-spacing: 0.02em;
        }
        .bf-web-link:hover { color: var(--t0); }
        .bf-empty { color: var(--t2); font-family: var(--font-mono); font-size: 11px; }
        .bf-td-rating { font-size: 11px; font-family: var(--font-mono); white-space: nowrap; }
        .bf-rating { color: var(--t0); display: flex; align-items: center; gap: 5px; }
        .bf-reviews { color: var(--t2); font-size: 10px; }
        .bf-td-save { white-space: nowrap; }

        .bf-empty-state { text-align: center; padding: 80px 32px; }
        .bf-empty-state .bf-headline {
          font-family: var(--font-d);
          font-size: 28px;
          color: var(--t1);
          margin-bottom: 12px;
          font-style: italic;
        }
        .bf-empty-state p { font-size: 12px; color: var(--t2); line-height: 1.8; font-family: var(--font-mono); }
      `}</style>

      <LeadIntelligenceTabs />
      <main className="bf-main">
        <div className="bf-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ margin: 0 }}>Business <em>Finder</em></h1>
            {scoring && (
              <span className="scoring-indicator">
                <span className="scoring-pulse" />
                AI scoring
              </span>
            )}
            {savedCount > 0 && (
              <span className="pipeline-count">
                <strong>{savedCount}</strong>&nbsp;in pipeline
              </span>
            )}
          </div>
          <p>Search a business by name to find it on Google Maps. Add an optional location to narrow results. Leads are AI-scored and ready to save to your pipeline.</p>
        </div>

        <form className="bf-form" onSubmit={handleSearch}>
          <div className="bf-field">
            <label htmlFor="bf-name">Business name</label>
            <input
              id="bf-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Fitness Studio"
              required
            />
          </div>
          <div className="bf-field">
            <label htmlFor="bf-city">
              Location <span className="bf-optional">— optional</span>
            </label>
            <input
              id="bf-city"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Austin, TX"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading} style={{ alignSelf: 'flex-end' }}>
            {loading ? 'Searching…' : <>Search <IconArrowRight size={12} /></>}
          </button>
        </form>

        <p className="bf-hint">Results appear immediately. Framework scores load in ~3s as Claude Haiku analyses each business.</p>

        {error && (
          <div className="error-msg">
            <IconWarning size={13} />
            {error}
          </div>
        )}

        {loading && (
          <div className="skeleton-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="sk-row">
                <div className="sk" style={{ width: 22, height: 11, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div className="sk" style={{ width: '36%', height: 12 }} />
                  <div className="sk" style={{ width: '58%', height: 9 }} />
                </div>
                <div className="sk" style={{ width: 90, height: 22, flexShrink: 0 }} />
                <div className="sk" style={{ width: 190, height: 9, flexShrink: 0 }} />
                <div className="sk" style={{ width: 100, height: 11, flexShrink: 0 }} />
                <div className="sk" style={{ width: 56, height: 24, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}

        {results && !loading && (
          <>
            <div className="bf-status-row">
              <span className="bf-query-label">&ldquo;{query}&rdquo;</span>
              <span className="bf-count-tag">{results.length} results</span>
            </div>

            {results.length > 0 ? (
              <div className="bf-tbl-wrap">
                <table className="bf-table">
                  <thead className="bf-thead">
                    <tr>
                      <th>#</th>
                      <th>Business</th>
                      <th>Framework · Score</th>
                      <th>AI Reasoning</th>
                      <th>Website</th>
                      <th>Rating</th>
                      <th>Pipeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <ResultRow
                        key={r.place_id}
                        r={r}
                        index={i}
                        score={scores[r.place_id]}
                        scoring={scoring}
                        saved={savedIds.has(r.place_id)}
                        saving={savingId === r.place_id}
                        onSave={() => handleSave(r)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bf-empty-state">
                <div className="bf-headline">No results found</div>
                <p>Try a different spelling or add a city to narrow the search.</p>
              </div>
            )}
          </>
        )}

        {!results && !loading && !error && (
          <div className="bf-empty-state">
            <div className="bf-headline">Find a business</div>
            <p>Enter a business name above.<br />Add an optional location to get geographically relevant results.</p>
          </div>
        )}
      </main>
    </>
  );
}
