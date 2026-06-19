'use client';

import { useState } from 'react';
import { IconArrowRight, IconCheck, IconWarning } from './icons';
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

type SearchModalProps = {
  onClose: () => void;
  onSaved: () => void;
};

export function SearchModal({ onClose, onSaved }: SearchModalProps) {
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<PlacesResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scores, setScores] = useState<Record<string, ScoreResult>>({});
  const [scoring, setScoring] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

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
    try {
      const res = await fetch(`/api/places?niche=${encodeURIComponent(niche)}&city=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results);
      scoreLeads(data.results);
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
        if (res.ok) onSaved();
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <style>{`
        .sm-backdrop {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(22, 19, 11, 0.88);
          backdrop-filter: blur(8px);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 48px 24px; overflow-y: auto;
        }
        .sm-panel {
          background: var(--bg1);
          border: 1px solid var(--b0);
          border-top: 1px solid rgba(212,175,55,0.3);
          width: 100%; max-width: 860px;
          padding: 32px 36px;
          position: relative; flex-shrink: 0;
        }
        .sm-header {
          display: flex; align-items: baseline;
          justify-content: space-between; margin-bottom: 24px;
        }
        .sm-title {
          font-family: var(--font-d); font-size: 28px;
          font-weight: 500; color: var(--t0); font-style: italic;
        }
        .sm-close {
          background: none; border: 1px solid var(--b0);
          color: var(--t2); font-size: 10px; font-family: var(--font-mono);
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; padding: 6px 14px;
          transition: color 0.15s, border-color 0.15s;
        }
        .sm-close:hover { color: var(--t1); border-color: var(--t2); }
        .sm-form {
          display: flex; gap: 12px; margin-bottom: 20px; align-items: flex-end;
        }
        .sm-field { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .sm-field label {
          font-size: 9px; font-family: var(--font-mono);
          color: var(--t2); letter-spacing: 0.15em; text-transform: uppercase;
        }
        .sm-field input {
          background: var(--bg2); border: none;
          border-bottom: 1px solid var(--b0);
          color: var(--t0); font-size: 14px; font-family: var(--font-mono);
          padding: 10px 0; outline: none; transition: border-color 0.2s;
          letter-spacing: 0.02em;
        }
        .sm-field input::placeholder { color: var(--t2); }
        .sm-field input:focus { border-bottom-color: var(--gold-dim); }
        .sm-scoring {
          display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
        }
        .sm-scoring-text {
          font-size: 10px; font-family: var(--font-mono); color: var(--t2);
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .sm-results { border: 1px solid var(--b0); overflow: hidden; }
        .sm-result-row {
          display: flex; align-items: center; gap: 14px;
          padding: 10px 14px; border-bottom: 1px solid var(--b1);
          background: var(--bg1); transition: background 0.1s;
        }
        .sm-result-row:last-child { border-bottom: none; }
        .sm-result-row:hover { background: var(--bg2); }
        .sm-num { font-size: 10px; font-family: var(--font-mono); color: var(--t2); width: 22px; flex-shrink: 0; }
        .sm-name {
          font-size: 12px; font-family: var(--font-mono); font-weight: 500;
          color: var(--t0); flex: 1; min-width: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sm-fw { flex-shrink: 0; display: flex; align-items: center; gap: 8px; }
        .sm-score {
          font-size: 13px; font-family: var(--font-mono); font-weight: 500;
          flex-shrink: 0; min-width: 28px; text-align: right;
        }
        .sm-placeholder { font-size: 11px; font-family: var(--font-mono); color: var(--t2); flex-shrink: 0; }
      `}</style>

      <div
        className="sm-backdrop"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="sm-panel">
          <div className="sm-header">
            <span className="sm-title">Add Leads</span>
            <button className="sm-close" onClick={onClose}>✕ Close</button>
          </div>

          <form className="sm-form" onSubmit={handleSearch}>
            <div className="sm-field">
              <label htmlFor="sm-niche">Niche</label>
              <input
                id="sm-niche"
                value={niche}
                onChange={e => setNiche(e.target.value)}
                placeholder="e.g. lifestyle brand"
                required
              />
            </div>
            <div className="sm-field">
              <label htmlFor="sm-city">City</label>
              <input
                id="sm-city"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Austin, TX"
                required
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ alignSelf: 'flex-end' }}>
              {loading ? 'Searching…' : <>Search <IconArrowRight size={12} /></>}
            </button>
          </form>

          {error && (
            <div className="error-msg">
              <IconWarning size={13} />
              {error}
            </div>
          )}

          {scoring && (
            <div className="sm-scoring">
              <span className="scoring-pulse" />
              <span className="sm-scoring-text">AI scoring</span>
            </div>
          )}

          {results && (
            <div className="sm-results">
              {results.map((r, i) => {
                const score = scores[r.place_id];
                const fw = score ? FW[score.framework] : null;
                const saved = savedIds.has(r.place_id);
                const saving = savingId === r.place_id;
                return (
                  <div key={r.place_id} className="sm-result-row">
                    <span className="sm-num">{i + 1}</span>
                    <span className="sm-name" title={r.name}>{r.name}</span>
                    <div className="sm-fw">
                      {fw ? (
                        <>
                          <span
                            className="fw-badge"
                            style={{ color: fw.color, background: `${fw.color}12`, borderColor: `${fw.color}30` }}
                          >
                            <span className="fw-dot" style={{ background: fw.color }} />
                            {fw.short}
                          </span>
                          <span className="sm-score" style={{ color: fw.color }}>{score!.score.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="sm-placeholder">{scoring ? '···' : '—'}</span>
                      )}
                    </div>
                    {saved
                      ? <span className="save-done"><IconCheck size={11} />Saved</span>
                      : (
                        <button className="btn-save" onClick={() => handleSave(r)} disabled={saving}>
                          {saving ? '…' : <><IconArrowRight size={10} />Save</>}
                        </button>
                      )}
                  </div>
                );
              })}
            </div>
          )}

          {!results && !loading && !error && (
            <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t2)', letterSpacing: '0.06em' }}>
              Enter a niche and city to search Google Maps for leads.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
