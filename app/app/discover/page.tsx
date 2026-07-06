'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { IconStar, IconArrowRight, IconCheck, IconWarning, IconGlobe } from '../components/icons';
import { LeadIntelligenceTabs } from '@/components/lead-intelligence-tabs';
import { LeadDetailModal } from '../components/LeadDetailModal';
import type { PlacesResult } from '../api/places/route';

type SortKey = 'score' | 'rating' | 'reviews' | 'name';
type FilterKey = 'no_website' | 'website' | 'ads' | 'consulting';

interface ScoreResult {
  service_primary: string;
  service_secondary: string;
  website_score: number;
  ads_score: number;
  consulting_score: number;
  opportunity_score: number;
  reasoning: string;
}

const SERVICE: Record<string, { label: string; short: string; color: string }> = {
  website:    { label: 'Website',    short: 'WEB', color: '#3B82F6' },
  ads:        { label: 'Ads',        short: 'ADS', color: '#A855F7' },
  consulting: { label: 'Consulting', short: 'CON', color: '#10B981' },
};

const FILTER_DEFS: Array<{ key: FilterKey; label: string; color: string }> = [
  { key: 'no_website', label: 'No Website',       color: 'var(--rose)' },
  { key: 'website',    label: 'Needs Website',    color: SERVICE.website.color },
  { key: 'ads',        label: 'Needs Ads',        color: SERVICE.ads.color },
  { key: 'consulting', label: 'Needs Consulting', color: SERVICE.consulting.color },
];

function FilterPills({
  results, scores, activeFilters, onToggle,
}: {
  results: PlacesResult[];
  scores: Record<string, ScoreResult>;
  activeFilters: Set<FilterKey>;
  onToggle: (key: FilterKey) => void;
}) {
  return (
    <div className="filter-row">
      {FILTER_DEFS.map(({ key, label, color }) => {
        const count = results.filter(r => {
          if (key === 'no_website') return !r.website;
          return scores[r.place_id]?.service_primary === key;
        }).length;
        const active = activeFilters.has(key);
        return (
          <button
            key={key}
            className={`filter-pill${active ? ' active' : ''}`}
            style={active ? { borderColor: color, color } : undefined}
            onClick={() => onToggle(key)}
          >
            {label}
            <span className="filter-pill-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) return url;
  } catch { /* invalid URL */ }
  return undefined;
}

const NICHES = [
  'HVAC contractor', 'plumber', 'electrician', 'roofing contractor',
  'general contractor', 'landscaping company', 'pest control',
  'law firm', 'CPA accountant', 'financial advisor', 'insurance agency',
  'real estate team', 'dental office', 'med spa', 'chiropractor',
  'physical therapy', 'veterinary clinic', 'interior designer',
];

function DataQualityBar({ results }: { results: PlacesResult[] }) {
  const withPhone   = results.filter(r => r.phone).length;
  const withWebsite = results.filter(r => r.website).length;
  const withRating  = results.filter(r => r.rating !== null).length;
  const pct = (n: number) => Math.round((n / results.length) * 100);
  const websitePct = pct(withWebsite);
  const verdict = websitePct >= 70
    ? { text: 'Strong signal',  ok: true  }
    : websitePct >= 40
    ? { text: 'Partial signal', ok: null  }
    : { text: 'Thin data',      ok: false };

  return (
    <div className="dq-bar">
      <span className="dq-label">Data quality</span>
      <Meter label="Phone"   value={pct(withPhone)} />
      <Meter label="Website" value={websitePct} />
      <Meter label="Rating"  value={pct(withRating)} />
      <span
        className="dq-verdict"
        style={{ color: verdict.ok === true ? 'var(--green)' : verdict.ok === null ? 'var(--accent-dim)' : 'var(--rose)' }}
      >
        {verdict.ok === false ? <IconWarning size={11} /> : <IconCheck size={11} />}
        {verdict.text}
      </span>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'var(--green)' : value >= 40 ? 'var(--accent-dim)' : 'var(--rose)';
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

function ServiceGap({ score }: { score: ScoreResult }) {
  const rows: Array<{ key: string; val: number }> = [
    { key: 'website',    val: score.website_score },
    { key: 'ads',        val: score.ads_score },
    { key: 'consulting', val: score.consulting_score },
  ].sort((a, b) => b.val - a.val);

  return (
    <div className="svc-gap">
      {rows.map(({ key, val }) => {
        const s = SERVICE[key];
        const isPrimary = key === score.service_primary;
        return (
          <div key={key} className="svc-row" style={{ opacity: isPrimary ? 1 : 0.55 }}>
            <span className="svc-label" style={{ color: isPrimary ? s.color : 'var(--t2)' }}>{s.short}</span>
            <span className="svc-track">
              <span className="svc-fill" style={{ width: `${val * 10}%`, background: s.color, opacity: isPrimary ? 1 : 0.6 }} />
            </span>
            <span className="svc-score" style={{ color: isPrimary ? s.color : 'var(--t2)' }}>{val.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ResultRow({
  r, index, score, scoring, saved, saving, onSave, onViewDetails, selectMode, selected, onToggle,
}: {
  r: PlacesResult; index: number;
  score?: ScoreResult; scoring: boolean;
  saved: boolean; saving: boolean; onSave: () => void; onViewDetails: () => void;
  selectMode: boolean; selected: boolean; onToggle: () => void;
}) {
  return (
    <tr
      className={`result-row${selected ? ' row-selected' : ''}`}
      style={{ animationDelay: `${index * 25}ms`, cursor: selectMode ? 'pointer' : 'default' }}
      onClick={selectMode ? onToggle : undefined}
    >
      {selectMode && (
        <td className="td-check">
          <input type="checkbox" checked={selected} onChange={onToggle} onClick={e => e.stopPropagation()} />
        </td>
      )}
      <td className="td-num">{index + 1}</td>
      <td className="td-name">
        <a href={r.maps_url} target="_blank" rel="noreferrer noopener" className="name-link">{r.name}</a>
        <span className="address">{r.address}</span>
      </td>
      <td className="td-fw">
        {score
          ? <ServiceGap score={score} />
          : <span className="scoring-dots">{scoring ? '···' : '—'}</span>}
      </td>
      <td className="td-reasoning">
        {score ? (
          <div className="reasoning-cell">
            <span className="reasoning-text">{score.reasoning}</span>
            <button className="reasoning-more" onClick={e => { e.stopPropagation(); onViewDetails(); }}>
              Details →
            </button>
          </div>
        ) : (
          <span className="scoring-dots muted">{scoring ? 'Analysing…' : ''}</span>
        )}
      </td>
      <td className="td-web">
        {safeUrl(r.website)
          ? (
            <a href={safeUrl(r.website)} target="_blank" rel="noreferrer noopener" className="web-link">
              <IconGlobe size={11} />
              {r.website!.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
            </a>
          )
          : <span className="empty">—</span>}
      </td>
      <td className="td-rating">
        {r.rating !== null
          ? (
            <span className="rating">
              <IconStar size={11} className="icon-accent" />
              {r.rating.toFixed(1)}
              <span className="reviews">({r.user_ratings_total?.toLocaleString()})</span>
            </span>
          )
          : <span className="empty">—</span>}
      </td>
      <td className="td-save">
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

export default function DiscoveryPage() {
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<PlacesResult[] | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<SortKey>('score');
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [scores, setScores] = useState<Record<string, ScoreResult>>({});
  const [scoring, setScoring] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [saveError, setSaveError] = useState('');
  const [modalLead, setModalLead] = useState<{ r: PlacesResult; score?: ScoreResult } | null>(null);
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
    setActiveFilters(new Set());
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

  function toggleFilter(key: FilterKey) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }

  function toggleSelectAll() {
    if (!results) return;
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(r => r.place_id)));
  }

  function removeSelected() {
    setResults(prev => prev?.filter(r => !selectedIds.has(r.place_id)) ?? null);
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  async function handleSave(r: PlacesResult) {
    const score = scores[r.place_id];
    setSavingId(r.place_id);
    setSaveError('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...r,
          framework_match: score?.service_primary ?? null,
          opportunity_score: score?.opportunity_score ?? null,
          framework_reasoning: score?.reasoning ?? null,
          service_secondary: score?.service_secondary ?? null,
          website_score: score?.website_score ?? null,
          ads_score: score?.ads_score ?? null,
          consulting_score: score?.consulting_score ?? null,
        }),
      });
      const data = await res.json();
      if (res.ok || res.status === 409) {
        setSavedIds(prev => new Set([...prev, r.place_id]));
        if (res.ok) setSavedCount(c => c + 1);
      } else {
        setSaveError(data?.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  const sorted = results ? [...results].sort((a, b) => {
    if (sort === 'score')   return (scores[b.place_id]?.opportunity_score ?? -1) - (scores[a.place_id]?.opportunity_score ?? -1);
    if (sort === 'rating')  return (b.rating ?? 0) - (a.rating ?? 0);
    if (sort === 'reviews') return (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0);
    return a.name.localeCompare(b.name);
  }) : [];

  const filtered = activeFilters.size === 0 ? sorted : sorted.filter(r => {
    const score = scores[r.place_id];
    for (const f of activeFilters) {
      if (f === 'no_website' && !r.website) return true;
      if (score?.service_primary === f) return true;
    }
    return false;
  });

  return (
    <>
      <style>{`
        .main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 48px 40px 80px;
        }

        .hero { margin-bottom: 40px; }
        .hero h1 {
          font-family: var(--font-d);
          font-size: 44px;
          font-weight: 500;
          color: var(--t0);
          line-height: 1.05;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }
        .hero h1 em { color: var(--accent-dim); font-style: italic; }
        .hero p { font-size: 12px; color: var(--t1); max-width: 520px; line-height: 1.7; letter-spacing: 0.02em; }
        .hero-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }

        .search-form {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .field-wrap { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
        .field-wrap label {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .field-wrap input {
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
        .field-wrap input::placeholder { color: var(--t2); }
        .field-wrap input:focus { border-bottom-color: var(--accent-dim); }
        .search-hint {
          font-size: 11px;
          color: var(--t2);
          margin-bottom: 36px;
          line-height: 1.6;
          font-family: var(--font-mono);
          letter-spacing: 0.03em;
        }

        .status-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .query-label {
          font-family: var(--font-d);
          font-size: 17px;
          font-weight: 500;
          color: var(--accent-dim);
          font-style: italic;
        }
        .count-tag {
          font-size: 10px;
          color: var(--t2);
          font-family: var(--font-mono);
          background: var(--bg2);
          border: 1px solid var(--b0);
          padding: 2px 9px;
          letter-spacing: 0.08em;
        }
        .elapsed {
          font-size: 10px;
          color: var(--t2);
          font-family: var(--font-mono);
          letter-spacing: 0.06em;
        }
        .sort-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }
        .sort-row label {
          font-size: 9px;
          color: var(--t2);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .sort-row select {
          background: var(--bg2);
          border: 1px solid var(--b0);
          color: var(--t0);
          font-size: 11px;
          font-family: var(--font-mono);
          padding: 5px 10px;
          outline: none;
          cursor: pointer;
          letter-spacing: 0.04em;
        }

        .filter-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px;
          background: var(--bg1);
          border: 1px solid var(--b0);
          color: var(--t2);
          font-size: 10px;
          font-family: var(--font-mono);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .filter-pill:hover { border-color: var(--t2); color: var(--t0); }
        .filter-pill.active { background: rgba(255,255,255,0.04); }
        .filter-pill-count {
          font-size: 9px;
          opacity: 0.65;
          background: var(--bg2);
          padding: 1px 5px;
          border-radius: 2px;
        }
        .filter-active-bar {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t2);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 14px;
          letter-spacing: 0.04em;
        }
        .filter-active-bar strong { color: var(--t0); }
        .filter-clear-btn {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
          padding: 0;
        }
        .filter-clear-btn:hover { color: var(--t0); }

        .dq-bar {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          background: var(--bg1);
          border: 1px solid var(--b0);
          border-top: 1px solid rgba(59,130,246,0.2);
          padding: 12px 20px;
          margin-bottom: 20px;
        }
        .dq-label {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          white-space: nowrap;
        }
        .meter { display: flex; align-items: center; gap: 8px; }
        .meter-label { font-size: 10px; color: var(--t2); font-family: var(--font-mono); letter-spacing: 0.04em; }
        .meter-track { width: 72px; height: 2px; background: var(--bg3); overflow: hidden; }
        .meter-fill  { height: 100%; transition: width 0.8s ease; }
        .meter-pct   { font-size: 10px; font-family: var(--font-mono); font-weight: 500; min-width: 30px; }
        .dq-verdict  {
          margin-left: auto;
          font-size: 10px;
          font-family: var(--font-mono);
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .tbl-wrap { border: 1px solid var(--b0); overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        thead { background: var(--bg2); border-bottom: 1px solid var(--b0); }
        thead th {
          padding: 9px 14px;
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          text-align: left;
          white-space: nowrap;
          user-select: none;
        }
        .result-row {
          border-bottom: 1px solid var(--b1);
          background: var(--bg1);
          animation: rowIn 0.28s ease both;
          transition: background 0.1s;
        }
        .result-row:last-child { border-bottom: none; }
        .result-row:hover { background: var(--bg2); }
        td { padding: 10px 14px; vertical-align: middle; }
        .row-selected { background: rgba(59,130,246,0.04) !important; }

        .td-check { width: 36px; padding-right: 0; }
        .td-check input { accent-color: var(--accent-dim); width: 13px; height: 13px; cursor: pointer; }
        .td-num { font-size: 10px; font-family: var(--font-mono); color: var(--t2); width: 30px; }
        .td-name { min-width: 180px; }
        .name-link {
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
        .name-link:hover { color: var(--accent-dim); }
        .address { font-size: 10px; color: var(--t2); font-family: var(--font-mono); display: block; line-height: 1.4; }

        .td-fw { width: 180px; }
        .svc-gap { display: flex; flex-direction: column; gap: 4px; }
        .svc-row { display: flex; align-items: center; gap: 6px; transition: opacity 0.15s; }
        .svc-label { font-size: 8px; font-family: var(--font-mono); letter-spacing: 0.1em; width: 28px; flex-shrink: 0; }
        .svc-track { flex: 1; height: 2px; background: var(--bg3); overflow: hidden; }
        .svc-fill  { height: 100%; transition: width 0.6s ease; }
        .svc-score { font-size: 9px; font-family: var(--font-mono); width: 24px; text-align: right; flex-shrink: 0; letter-spacing: 0.02em; }
        .td-reasoning { max-width: 280px; }
        .reasoning-cell { display: flex; flex-direction: column; gap: 4px; }
        .reasoning-text {
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
        .reasoning-more {
          background: none;
          border: none;
          color: var(--accent-dim);
          font-size: 10px;
          font-family: var(--font-mono);
          padding: 0;
          cursor: pointer;
          text-align: left;
          letter-spacing: 0.04em;
          opacity: 0.7;
          transition: opacity 0.15s;
        }
        .reasoning-more:hover { opacity: 1; }
        .td-web { font-size: 11px; max-width: 160px; }
        .web-link {
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
        .web-link:hover { color: var(--t0); }
        .empty { color: var(--t2); font-family: var(--font-mono); font-size: 11px; }

        .td-rating { font-size: 11px; font-family: var(--font-mono); white-space: nowrap; }
        .rating { color: var(--t0); display: flex; align-items: center; gap: 5px; }
        .reviews { color: var(--t2); font-size: 10px; }
        .td-save { white-space: nowrap; }
        .muted { color: var(--t2); }

        .select-all-btn {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--t2);
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
          letter-spacing: 0.06em;
        }
        .select-all-btn:hover { color: var(--t1); }
        .remove-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: var(--bg2);
          border-top: 1px solid var(--b0);
        }
        .remove-bar-count { font-size: 11px; font-family: var(--font-mono); color: var(--t1); }
        .remove-bar-count strong { color: var(--accent-dim); font-weight: 500; }

        .find-more-row { display: flex; justify-content: center; margin-top: 24px; }
        .find-more-wrap { text-align: center; }
        .find-more-btn {
          background: none;
          border: 1px solid var(--b0);
          color: var(--t1);
          font-size: 11px;
          font-family: var(--font-mono);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 10px 32px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: color 0.15s, border-color 0.15s;
        }
        .find-more-btn:hover:not(:disabled) { color: var(--t0); border-color: var(--t2); }
        .find-more-btn:disabled { opacity: 0.4; cursor: default; }
        .find-more-note {
          font-size: 10px;
          color: var(--t2);
          font-family: var(--font-mono);
          margin-top: 8px;
          letter-spacing: 0.04em;
        }

        .empty-state { text-align: center; padding: 80px 32px; }
        .empty-state .headline {
          font-family: var(--font-d);
          font-size: 28px;
          color: var(--t1);
          margin-bottom: 12px;
          font-style: italic;
        }
        .empty-state p { font-size: 12px; color: var(--t2); line-height: 1.8; font-family: var(--font-mono); }
      `}</style>

      <LeadIntelligenceTabs />
      <main className="main">
        <div className="hero">
          <div className="hero-meta">
            <h1 style={{ margin: 0 }}>Lead <em>Discovery</em></h1>
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
          <p>Search a niche and city. Claude Haiku scores every result across three service gaps — Website, Ads, and Consulting — so you know exactly what to pitch before you pick up the phone.</p>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <div className="field-wrap">
            <label htmlFor="niche-input">Niche</label>
            <input
              id="niche-input"
              list="niche-suggestions"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. HVAC contractor"
              required
            />
            <datalist id="niche-suggestions">
              {NICHES.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div className="field-wrap">
            <label htmlFor="city-input">City</label>
            <input
              id="city-input"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Dallas, TX"
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading} style={{ alignSelf: 'flex-end' }}>
            {loading ? 'Searching…' : <>Search <IconArrowRight size={12} /></>}
          </button>
        </form>

        <p className="search-hint">Results appear immediately. Gap scores load in ~3s — WEB / ADS / CON, sorted by biggest opportunity.</p>

        {error && (
          <div className="error-msg">
            <IconWarning size={13} />
            {error}
          </div>
        )}

        {saveError && (
          <div className="error-msg" style={{ marginTop: 12 }}>
            <IconWarning size={13} />
            Save failed: {saveError}
          </div>
        )}

        {loading && (
          <div className="skeleton-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
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

            <FilterPills
              results={results}
              scores={scores}
              activeFilters={activeFilters}
              onToggle={toggleFilter}
            />

            {activeFilters.size > 0 && (
              <div className="filter-active-bar">
                Showing <strong>{filtered.length}</strong> of {results.length}
                <button className="filter-clear-btn" onClick={() => setActiveFilters(new Set())}>
                  Clear filters
                </button>
              </div>
            )}

            <DataQualityBar results={results} />

            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    {selectMode && (
                      <th>
                        <button className="select-all-btn" onClick={toggleSelectAll}>
                          {selectedIds.size === filtered.length ? 'None' : 'All'}
                        </button>
                      </th>
                    )}
                    <th>#</th>
                    <th>Business</th>
                    <th>Service Gap</th>
                    <th>AI Reasoning</th>
                    <th>Website</th>
                    <th>Rating</th>
                    <th>Pipeline</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <ResultRow
                      key={r.place_id}
                      r={r}
                      index={i}
                      score={scores[r.place_id]}
                      scoring={scoring}
                      saved={savedIds.has(r.place_id)}
                      saving={savingId === r.place_id}
                      onSave={() => handleSave(r)}
                      onViewDetails={() => setModalLead({ r, score: scores[r.place_id] })}
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
                    <IconWarning size={11} />
                    Remove
                  </button>
                </div>
              )}
            </div>

            {nextPageToken && (
              <div className="find-more-row">
                <div className="find-more-wrap">
                  <button className="find-more-btn" onClick={handleFindMore} disabled={loadingMore || scoring}>
                    {loadingMore ? 'Loading more…' : <><IconArrowRight size={11} />Find More</>}
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
            <p>Enter a niche and city above.<br />Results are scored by Claude Haiku in real time.</p>
          </div>
        )}
      </main>

      {modalLead && (
        <LeadDetailModal
          lead={{
            name: modalLead.r.name,
            address: modalLead.r.address,
            phone: modalLead.r.phone,
            website: modalLead.r.website,
            rating: modalLead.r.rating,
            user_ratings_total: modalLead.r.user_ratings_total,
            framework_match: modalLead.score?.service_primary ?? null,
            website_score: modalLead.score?.website_score ?? null,
            ads_score: modalLead.score?.ads_score ?? null,
            consulting_score: modalLead.score?.consulting_score ?? null,
            framework_reasoning: modalLead.score?.reasoning ?? null,
            maps_url: modalLead.r.maps_url,
          }}
          onClose={() => setModalLead(null)}
          onSave={savedIds.has(modalLead.r.place_id) ? undefined : () => {
            handleSave(modalLead.r);
            setModalLead(null);
          }}
          saved={savedIds.has(modalLead.r.place_id)}
          saving={savingId === modalLead.r.place_id}
        />
      )}
    </>
  );
}
