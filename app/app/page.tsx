'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { Topbar } from './components/topbar';
import {
  IconStar, IconArrowRight, IconCheck, IconWarning, IconGlobe,
} from './components/icons';
import type { PlacesResult } from './api/places/route';

type SortKey = 'score' | 'rating' | 'reviews' | 'name';

interface ScoreResult {
  framework: string;
  score: number;
  reasoning: string;
}

const FW: Record<string, { label: string; short: string; color: string }> = {
  brand_positioning:     { label: 'Brand Positioning',     short: 'Brand',       color: '#C4923C' },
  client_acquisition:    { label: 'Client Acquisition',    short: 'Acquisition', color: '#3A8B6A' },
  growth_infrastructure: { label: 'Growth Infrastructure', short: 'Growth',      color: '#7A5CAE' },
  scaling_roadmap:       { label: 'Scaling Roadmap',       short: 'Scaling',     color: '#4A7EC4' },
  venture_development:   { label: 'Venture Development',   short: 'Venture',     color: '#AA5E7C' },
};

const NICHES = [
  'e-commerce brand', 'lifestyle brand', 'media company',
  'professional services', 'fitness studio', 'restaurant',
  'boutique hotel', 'real estate agency', 'marketing agency', 'SaaS startup',
];

function DataQualityBar({ results }: { results: PlacesResult[] }) {
  const withPhone = results.filter(r => r.phone).length;
  const withWebsite = results.filter(r => r.website).length;
  const withRating = results.filter(r => r.rating !== null).length;
  const pct = (n: number) => Math.round((n / results.length) * 100);
  const websitePct = pct(withWebsite);
  const verdict = websitePct >= 70 ? { text: 'Strong signal', ok: true } : websitePct >= 40 ? { text: 'Partial signal', ok: null } : { text: 'Thin data', ok: false };

  return (
    <div className="dq-bar">
      <span className="dq-label">Data quality</span>
      <Meter label="Phone" value={pct(withPhone)} />
      <Meter label="Website" value={websitePct} />
      <Meter label="Rating" value={pct(withRating)} />
      <span className="dq-verdict" style={{ color: verdict.ok === true ? 'var(--green)' : verdict.ok === null ? 'var(--gold)' : 'var(--rose)' }}>
        {verdict.ok === false ? <IconWarning size={12} /> : <IconCheck size={12} />}
        {verdict.text}
      </span>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'var(--green)' : value >= 40 ? 'var(--gold)' : 'var(--rose)';
  return (
    <span className="meter">
      <span className="meter-label">{label}</span>
      <span className="meter-track">
        <span className="meter-fill" style={{ width: `${value}%`, background: color }} />
      </span>
      <span className="meter-pct" style={{ color }}>{value}%</span>
    </span>
  );
}

function FwBadge({ fw, score }: { fw: string; score: number }) {
  const meta = FW[fw];
  if (!meta) return null;
  return (
    <div className="fw-cell">
      <span className="fw-badge" style={{ color: meta.color, background: `${meta.color}18`, borderColor: `${meta.color}35` }}>
        <span className="fw-dot" style={{ background: meta.color }} />
        {meta.short}
      </span>
      <span className="fw-score" style={{ color: meta.color }}>{score.toFixed(1)}</span>
    </div>
  );
}

function ResultRow({
  r, index, score, scoring, saved, saving, onSave, selectMode, selected, onToggle,
}: {
  r: PlacesResult; index: number;
  score?: ScoreResult; scoring: boolean;
  saved: boolean; saving: boolean; onSave: () => void;
  selectMode: boolean; selected: boolean; onToggle: () => void;
}) {
  return (
    <tr
      className={`result-row${selected ? ' row-selected' : ''}`}
      style={{ animationDelay: `${index * 30}ms`, cursor: selectMode ? 'pointer' : 'default' }}
      onClick={selectMode ? onToggle : undefined}
    >
      {selectMode && (
        <td className="td-check">
          <input type="checkbox" checked={selected} onChange={onToggle} onClick={e => e.stopPropagation()} />
        </td>
      )}
      <td className="td-num">{index + 1}</td>
      <td className="td-name">
        <a href={r.maps_url} target="_blank" rel="noreferrer" className="name-link">{r.name}</a>
        <span className="address">{r.address}</span>
      </td>
      <td className="td-fw">
        {score
          ? <FwBadge fw={score.framework} score={score.score} />
          : <span className="scoring-dots">{scoring ? '···' : '—'}</span>}
      </td>
      <td className="td-reasoning">
        {score
          ? <span className="reasoning-text">{score.reasoning}</span>
          : <span className="scoring-dots muted">{scoring ? 'Analysing…' : ''}</span>}
      </td>
      <td className="td-web">
        {r.website
          ? (
            <a href={r.website} target="_blank" rel="noreferrer" className="web-link">
              <IconGlobe size={11} />
              {r.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
            </a>
          )
          : <span className="empty">—</span>}
      </td>
      <td className="td-rating">
        {r.rating !== null
          ? (
            <span className="rating">
              <IconStar size={11} className="icon-gold" />
              {r.rating.toFixed(1)}
              <span className="reviews">({r.user_ratings_total?.toLocaleString()})</span>
            </span>
          )
          : <span className="empty">—</span>}
      </td>
      <td className="td-save">
        {saved
          ? <span className="save-done"><IconCheck size={12} />Saved</span>
          : (
            <button className="btn-save" onClick={onSave} disabled={saving}>
              {saving ? '…' : <><IconArrowRight size={11} />Save</>}
            </button>
          )}
      </td>
    </tr>
  );
}

export default function DiscoveryPage() {
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<PlacesResult[] | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<SortKey>('score');
  const [scores, setScores] = useState<Record<string, ScoreResult>>({});
  const [scoring, setScoring] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const startRef = useRef<number>(0);
  const [elapsed, setElapsed] = useState<number | null>(null);
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

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
    if (!niche.trim() || !city.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);
    setScores({});
    setElapsed(null);
    setNextPageToken(null);
    setSelectMode(false);
    setSelectedIds(new Set());
    startRef.current = Date.now();
    try {
      const res = await fetch(`/api/places?niche=${encodeURIComponent(niche)}&city=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results);
      setQuery(data.query);
      setElapsed(Date.now() - startRef.current);
      setNextPageToken(data.next_page_token ?? null);
      scoreLeads(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleFindMore() {
    if (!nextPageToken) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ pagetoken: nextPageToken, query });
      const res = await fetch(`/api/places?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load more');
      const existingIds = new Set(results?.map(r => r.place_id) ?? []);
      const newResults = (data.results as PlacesResult[]).filter(r => !existingIds.has(r.place_id));
      setResults(prev => [...(prev ?? []), ...newResults]);
      setNextPageToken(data.next_page_token ?? null);
      if (newResults.length > 0) scoreLeads(newResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleSelectMode() {
    setSelectMode(s => !s);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function toggleSelectAll() {
    if (!results) return;
    setSelectedIds(selectedIds.size === results.length ? new Set() : new Set(results.map(r => r.place_id)));
  }

  function removeSelected() {
    setResults(prev => prev?.filter(r => !selectedIds.has(r.place_id)) ?? null);
    setSelectedIds(new Set());
    setSelectMode(false);
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

  const sorted = results ? [...results].sort((a, b) => {
    if (sort === 'score') return (scores[b.place_id]?.score ?? -1) - (scores[a.place_id]?.score ?? -1);
    if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
    if (sort === 'reviews') return (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0);
    return a.name.localeCompare(b.name);
  }) : [];

  return (
    <>
      <style>{`
        /* ── Discovery-specific styles ── */
        .main { max-width: 1280px; margin: 0 auto; padding: 44px 32px 80px; }

        .hero { margin-bottom: 36px; }
        .hero h1 { font-family: var(--font-d); font-size: 40px; font-weight: 500; color: var(--t0); line-height: 1.1; margin-bottom: 10px; letter-spacing: -0.01em; }
        .hero h1 em { color: var(--gold); font-style: normal; }
        .hero p { font-size: 14px; color: var(--t1); max-width: 520px; line-height: 1.65; }

        .search-form { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; align-items: flex-end; }
        .field-wrap { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 200px; }
        .field-wrap label { font-size: 10px; font-family: var(--font-mono); color: var(--t2); letter-spacing: 0.1em; text-transform: uppercase; }
        .field-wrap input {
          background: var(--bg2);
          border: 1px solid var(--b1);
          color: var(--t0);
          font-size: 14px;
          font-family: var(--font-ui);
          padding: 11px 14px;
          border-radius: 7px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-wrap input::placeholder { color: var(--t2); }
        .field-wrap input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(196,146,60,0.1); }
        .search-hint { font-size: 12px; color: var(--t2); margin-bottom: 32px; line-height: 1.6; font-family: var(--font-mono); }

        /* Status row */
        .status-row { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; flex-wrap: wrap; }
        .query-label { font-family: var(--font-mono); font-size: 13px; color: var(--gold); }
        .count-tag { font-size: 12px; color: var(--t2); font-family: var(--font-mono); background: var(--bg3); border: 1px solid var(--b0); padding: 2px 8px; border-radius: 3px; }
        .elapsed { font-size: 11px; color: var(--t2); font-family: var(--font-mono); }
        .sort-row { display: flex; align-items: center; gap: 8px; margin-left: auto; }
        .sort-row label { font-size: 10px; color: var(--t2); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; }
        .sort-row select {
          background: var(--bg2); border: 1px solid var(--b1); color: var(--t0);
          font-size: 12px; font-family: var(--font-mono); padding: 5px 10px;
          border-radius: 4px; outline: none; cursor: pointer;
        }

        /* Data quality bar */
        .dq-bar {
          display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
          background: var(--bg2); border: 1px solid var(--b0);
          border-radius: 7px; padding: 12px 18px; margin-bottom: 22px;
        }
        .dq-label { font-size: 10px; font-family: var(--font-mono); color: var(--t2); text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; }
        .meter { display: flex; align-items: center; gap: 8px; }
        .meter-label { font-size: 11px; color: var(--t1); font-family: var(--font-mono); }
        .meter-track { width: 72px; height: 3px; background: var(--bg3); border-radius: 2px; overflow: hidden; }
        .meter-fill { height: 100%; border-radius: 2px; transition: width 0.7s ease; }
        .meter-pct { font-size: 11px; font-family: var(--font-mono); font-weight: 500; min-width: 32px; }
        .dq-verdict { margin-left: auto; font-size: 11px; font-family: var(--font-mono); display: flex; align-items: center; gap: 5px; white-space: nowrap; }

        /* Table */
        .tbl-wrap { border: 1px solid var(--b0); border-radius: 8px; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        thead { background: var(--bg2); border-bottom: 1px solid var(--b1); }
        thead th { padding: 10px 14px; font-size: 10px; font-family: var(--font-mono); color: var(--t2); text-transform: uppercase; letter-spacing: 0.08em; text-align: left; white-space: nowrap; user-select: none; }
        .result-row { border-bottom: 1px solid var(--b0); background: var(--bg1); animation: rowIn 0.3s ease both; transition: background 0.1s; }
        .result-row:last-child { border-bottom: none; }
        .result-row:hover { background: var(--bg2); }
        td { padding: 11px 14px; vertical-align: middle; }
        .row-selected { background: rgba(196,146,60,0.05) !important; }
        .td-check { width: 36px; padding-right: 0; }
        .td-check input { accent-color: var(--gold); width: 14px; height: 14px; cursor: pointer; }
        .td-num { font-size: 11px; font-family: var(--font-mono); color: var(--t2); width: 32px; }
        .td-name { min-width: 180px; }
        .name-link { font-size: 14px; font-weight: 500; color: var(--t0); text-decoration: none; display: block; margin-bottom: 3px; transition: color 0.12s; cursor: pointer; }
        .name-link:hover { color: var(--gold); }
        .address { font-size: 11px; color: var(--t2); font-family: var(--font-mono); display: block; line-height: 1.4; }
        .td-fw { width: 150px; }
        .td-reasoning { max-width: 280px; }
        .reasoning-text { font-size: 12px; color: var(--t1); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .td-web { font-size: 12px; max-width: 160px; }
        .web-link { color: var(--blue); text-decoration: none; font-size: 11px; font-family: var(--font-mono); word-break: break-all; display: flex; align-items: center; gap: 5px; transition: color 0.12s; cursor: pointer; }
        .web-link:hover { color: var(--t0); }
        .empty { color: var(--t2); font-family: var(--font-mono); font-size: 12px; }
        .td-rating { font-size: 12px; font-family: var(--font-mono); white-space: nowrap; }
        .rating { color: var(--t0); display: flex; align-items: center; gap: 5px; }
        .reviews { color: var(--t2); font-size: 11px; }
        .td-save { white-space: nowrap; }
        .muted { color: var(--t2); }

        /* Select mode */
        .select-all-btn { font-size: 11px; font-family: var(--font-mono); color: var(--t2); background: none; border: none; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
        .select-all-btn:hover { color: var(--t1); }
        .remove-bar {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 16px; background: var(--bg2);
          border-top: 1px solid var(--b1);
        }
        .remove-bar-count { font-size: 12px; font-family: var(--font-mono); color: var(--t1); }
        .remove-bar-count strong { color: var(--gold); font-weight: 500; }

        /* Find more */
        .find-more-row { display: flex; justify-content: center; margin-top: 20px; }
        .find-more-wrap { text-align: center; }
        .find-more-btn {
          background: none; border: 1px solid var(--b1); color: var(--t1);
          font-size: 12px; font-family: var(--font-mono); padding: 9px 28px;
          border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
          transition: color 0.15s, border-color 0.15s;
        }
        .find-more-btn:hover:not(:disabled) { color: var(--t0); border-color: var(--t2); }
        .find-more-btn:disabled { opacity: 0.4; cursor: default; }
        .find-more-note { font-size: 11px; color: var(--t2); font-family: var(--font-mono); margin-top: 7px; }

        /* Empty + error states */
        .empty-state { text-align: center; padding: 80px 32px; }
        .empty-state .headline { font-family: var(--font-d); font-size: 24px; color: var(--t1); margin-bottom: 10px; }
        .empty-state p { font-size: 13px; color: var(--t2); line-height: 1.7; }
      `}</style>

      <Topbar onSignOut={handleSignOut}>
        {scoring && (
          <span className="scoring-indicator">
            <span className="scoring-pulse" />
            AI scoring
          </span>
        )}
        {savedCount > 0 && (
          <span className="pipeline-count">
            <strong>{savedCount}</strong> in pipeline
          </span>
        )}
      </Topbar>

      <div className="main">
        <div className="hero">
          <h1>Lead <em>Discovery</em></h1>
          <p>Search a niche and city. Claude Haiku scores every result against R&amp;R&apos;s 5 frameworks — hit Save to add a lead to your pipeline.</p>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <div className="field-wrap">
            <label htmlFor="niche-input">Niche</label>
            <input
              id="niche-input"
              list="niche-suggestions"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. lifestyle brand"
              required
            />
            <datalist id="niche-suggestions">{NICHES.map(n => <option key={n} value={n} />)}</datalist>
          </div>
          <div className="field-wrap">
            <label htmlFor="city-input">City</label>
            <input
              id="city-input"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Austin, TX"
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading} style={{ alignSelf: 'flex-end' }}>
            {loading ? 'Searching…' : <>Search <IconArrowRight size={14} /></>}
          </button>
        </form>

        <p className="search-hint">Results appear immediately. Framework scores load in ~3s as Claude Haiku analyses each business.</p>

        {error && (
          <div className="error-msg">
            <IconWarning size={14} />
            {error}
          </div>
        )}

        {loading && (
          <div className="skeleton-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="sk-row">
                <div className="sk" style={{ width: 24, height: 12, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div className="sk" style={{ width: '38%', height: 13 }} />
                  <div className="sk" style={{ width: '60%', height: 10 }} />
                </div>
                <div className="sk" style={{ width: 96, height: 24, borderRadius: 4, flexShrink: 0 }} />
                <div className="sk" style={{ width: 200, height: 10, flexShrink: 0 }} />
                <div className="sk" style={{ width: 110, height: 12, flexShrink: 0 }} />
                <div className="sk" style={{ width: 60, height: 26, borderRadius: 4, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}

        {results && !loading && (
          <>
            <div className="status-row">
              <span className="query-label">&ldquo;{query}&rdquo;</span>
              <span className="count-tag">{results.length} results</span>
              {elapsed !== null && <span className="elapsed">{(elapsed / 1000).toFixed(1)}s</span>}
              <button
                className={`btn-ghost${selectMode ? ' active' : ''}`}
                onClick={toggleSelectMode}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
              <div className="sort-row">
                <label>Sort</label>
                <select value={sort} onChange={e => setSort(e.target.value as SortKey)}>
                  <option value="score">AI Score</option>
                  <option value="rating">Rating</option>
                  <option value="reviews">Review count</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>

            <DataQualityBar results={results} />

            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    {selectMode && (
                      <th>
                        <button className="select-all-btn" onClick={toggleSelectAll}>
                          {selectedIds.size === sorted.length ? 'None' : 'All'}
                        </button>
                      </th>
                    )}
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
                  {sorted.map((r, i) => (
                    <ResultRow
                      key={r.place_id}
                      r={r}
                      index={i}
                      score={scores[r.place_id]}
                      scoring={scoring}
                      saved={savedIds.has(r.place_id)}
                      saving={savingId === r.place_id}
                      onSave={() => handleSave(r)}
                      selectMode={selectMode}
                      selected={selectedIds.has(r.place_id)}
                      onToggle={() => toggleSelect(r.place_id)}
                    />
                  ))}
                </tbody>
              </table>
              {selectMode && selectedIds.size > 0 && (
                <div className="remove-bar">
                  <span className="remove-bar-count"><strong>{selectedIds.size}</strong> selected</span>
                  <button className="btn-danger" style={{ marginLeft: 'auto' }} onClick={removeSelected}>
                    <IconWarning size={12} />
                    Remove from results
                  </button>
                </div>
              )}
            </div>

            {nextPageToken && (
              <div className="find-more-row">
                <div className="find-more-wrap">
                  <button className="find-more-btn" onClick={handleFindMore} disabled={loadingMore || scoring}>
                    {loadingMore ? 'Loading more…' : <><IconArrowRight size={12} />Find More</>}
                  </button>
                  <div className="find-more-note">{results.length} results so far · up to 60 total</div>
                </div>
              </div>
            )}
          </>
        )}

        {!results && !loading && !error && (
          <div className="empty-state">
            <div className="headline">Ready to search</div>
            <p>Enter a niche and city above.<br />Results are framework-scored by Claude Haiku in real time.</p>
          </div>
        )}
      </div>
    </>
  );
}
