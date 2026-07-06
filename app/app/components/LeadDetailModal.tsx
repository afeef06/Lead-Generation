'use client';

import { useEffect } from 'react';
import { IconGlobe, IconPhone, IconStar, IconCheck } from './icons';

const SERVICE: Record<string, { label: string; short: string; color: string }> = {
  website:    { label: 'Website',    short: 'WEB', color: '#3B82F6' },
  ads:        { label: 'Ads',        short: 'ADS', color: '#A855F7' },
  consulting: { label: 'Consulting', short: 'CON', color: '#10B981' },
};

export interface LeadDetailData {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  user_ratings_total?: number | null;
  review_count?: number | null;
  framework_match: string | null;
  website_score: number | null;
  ads_score: number | null;
  consulting_score: number | null;
  framework_reasoning: string | null;
  place_id?: string | null;
  maps_url?: string | null;
}

interface Props {
  lead: LeadDetailData;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
}

function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const p = new URL(url);
    if (['http:', 'https:'].includes(p.protocol)) return url;
  } catch { /* invalid */ }
  return undefined;
}

export function LeadDetailModal({ lead, onClose, onSave, saving, saved }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const reviewCount = lead.user_ratings_total ?? lead.review_count ?? null;

  const subScores: Array<{ key: string; val: number }> | null =
    lead.website_score != null || lead.ads_score != null || lead.consulting_score != null
      ? [
          { key: 'website',    val: lead.website_score    ?? 0 },
          { key: 'ads',        val: lead.ads_score        ?? 0 },
          { key: 'consulting', val: lead.consulting_score ?? 0 },
        ].sort((a, b) => b.val - a.val)
      : null;

  const mapsHref = lead.maps_url
    ?? (lead.place_id ? `https://www.google.com/maps/place/?q=place_id:${lead.place_id}` : undefined);

  return (
    <>
      <style>{`
        .ldm-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(10,8,5,0.72);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: ldmFadeIn 0.18s ease both;
        }
        @keyframes ldmFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ldmSlideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }

        .ldm-panel {
          background: var(--bg1);
          border: 1px solid var(--b0);
          border-top: 1px solid rgba(59,130,246,0.25);
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          animation: ldmSlideUp 0.22s ease both;
        }

        .ldm-header {
          padding: 20px 22px 16px;
          border-bottom: 1px solid var(--b0);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .ldm-title-wrap { display: flex; flex-direction: column; gap: 5px; flex: 1; }
        .ldm-name {
          font-family: var(--font-d);
          font-size: 22px;
          font-weight: 500;
          color: var(--t0);
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .ldm-name a { color: inherit; text-decoration: none; transition: color 0.12s; }
        .ldm-name a:hover { color: var(--accent-dim); }
        .ldm-address {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.03em;
        }
        .ldm-close {
          background: none;
          border: 1px solid var(--b0);
          color: var(--t2);
          font-size: 16px;
          line-height: 1;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.15s, border-color 0.15s;
          font-family: var(--font-mono);
        }
        .ldm-close:hover { color: var(--t0); border-color: var(--t1); }

        .ldm-meta {
          padding: 14px 22px;
          border-bottom: 1px solid var(--b0);
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: center;
        }
        .ldm-meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t1);
          letter-spacing: 0.02em;
        }
        .ldm-meta-item a { color: var(--blue); text-decoration: none; transition: color 0.12s; }
        .ldm-meta-item a:hover { color: var(--t0); }
        .ldm-reviews { color: var(--t2); }
        .ldm-rating-val { color: var(--accent-dim); font-weight: 500; }

        .ldm-section {
          padding: 16px 22px;
          border-bottom: 1px solid var(--b0);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ldm-section-label {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .ldm-svc-row {
          display: flex;
          align-items: center;
          gap: 10px;
          transition: opacity 0.15s;
        }
        .ldm-svc-label {
          font-size: 9px;
          font-family: var(--font-mono);
          letter-spacing: 0.1em;
          width: 28px;
          flex-shrink: 0;
        }
        .ldm-svc-track {
          flex: 1;
          height: 3px;
          background: var(--bg3);
          overflow: hidden;
        }
        .ldm-svc-fill { height: 100%; transition: width 0.7s ease; }
        .ldm-svc-score {
          font-size: 12px;
          font-family: var(--font-mono);
          font-weight: 500;
          width: 28px;
          text-align: right;
          flex-shrink: 0;
        }
        .ldm-svc-badge {
          font-size: 8px;
          font-family: var(--font-mono);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 1px 6px;
          border: 1px solid;
          flex-shrink: 0;
        }

        .ldm-reasoning {
          font-size: 13px;
          color: var(--t0);
          line-height: 1.75;
          font-family: var(--font-mono);
          letter-spacing: 0.015em;
        }

        .ldm-footer {
          padding: 14px 22px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }
        .ldm-save-done {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--green);
          display: flex;
          align-items: center;
          gap: 5px;
          letter-spacing: 0.06em;
        }
      `}</style>

      <div className="ldm-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Details for ${lead.name}`}>
        <div className="ldm-panel" onClick={e => e.stopPropagation()}>

          <div className="ldm-header">
            <div className="ldm-title-wrap">
              <div className="ldm-name">
                {mapsHref
                  ? <a href={mapsHref} target="_blank" rel="noreferrer noopener">{lead.name}</a>
                  : lead.name}
              </div>
              {lead.address && <div className="ldm-address">{lead.address}</div>}
            </div>
            <button className="ldm-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          {(lead.phone || lead.website || lead.rating != null) && (
            <div className="ldm-meta">
              {lead.phone && (
                <span className="ldm-meta-item">
                  <IconPhone size={11} />
                  {lead.phone}
                </span>
              )}
              {safeUrl(lead.website) && (
                <span className="ldm-meta-item">
                  <IconGlobe size={11} />
                  <a href={safeUrl(lead.website)} target="_blank" rel="noreferrer noopener">
                    {lead.website!.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                  </a>
                </span>
              )}
              {lead.rating != null && (
                <span className="ldm-meta-item">
                  <IconStar size={11} className="icon-accent" />
                  <span className="ldm-rating-val">{lead.rating.toFixed(1)}</span>
                  {reviewCount != null && (
                    <span className="ldm-reviews">({reviewCount.toLocaleString()} reviews)</span>
                  )}
                </span>
              )}
            </div>
          )}

          {subScores && (
            <div className="ldm-section">
              <span className="ldm-section-label">Service Gaps</span>
              {subScores.map(({ key, val }) => {
                const s = SERVICE[key];
                const isPrimary = key === lead.framework_match;
                return (
                  <div key={key} className="ldm-svc-row" style={{ opacity: isPrimary ? 1 : 0.55 }}>
                    <span className="ldm-svc-label" style={{ color: isPrimary ? s.color : 'var(--t2)' }}>{s.short}</span>
                    <span className="ldm-svc-track">
                      <span className="ldm-svc-fill" style={{ width: `${val * 10}%`, background: s.color }} />
                    </span>
                    <span className="ldm-svc-score" style={{ color: isPrimary ? s.color : 'var(--t2)' }}>{val.toFixed(1)}</span>
                    {isPrimary && (
                      <span className="ldm-svc-badge" style={{ color: s.color, borderColor: `${s.color}40` }}>
                        Lead offer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {lead.framework_reasoning && (
            <div className="ldm-section">
              <span className="ldm-section-label">AI Reasoning</span>
              <p className="ldm-reasoning">{lead.framework_reasoning}</p>
            </div>
          )}

          <div className="ldm-footer">
            {onSave && (
              saved
                ? <span className="ldm-save-done"><IconCheck size={11} />Saved to pipeline</span>
                : (
                  <button className="btn-primary" onClick={onSave} disabled={saving}>
                    {saving ? '…' : 'Save to pipeline'}
                  </button>
                )
            )}
            <button className="btn-ghost" onClick={onClose}>Close</button>
          </div>

        </div>
      </div>
    </>
  );
}
