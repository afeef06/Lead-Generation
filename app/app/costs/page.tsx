'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { LeadIntelligenceTabs } from '@/components/lead-intelligence-tabs';

interface AnthropicCost {
  scoredLeads: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  inputCost: number;
  outputCost: number;
  total: number;
  model: string;
}

interface GoogleCost {
  totalLeads: number;
  estimatedSearches: number;
  textSearchCost: number;
  detailsCost: number;
  total: number;
  creditUsed: number;
  creditRemaining: number;
  creditTotal: number;
}

interface HunterCost {
  hunterLeads: number;
  freeUsed: number;
  freeTotal: number;
  paidCredits: number;
  total: number;
}

interface CostData {
  totals: { anthropic: number; google: number; hunter: number; overall: number };
  anthropic: AnthropicCost;
  google: GoogleCost;
  hunter: HunterCost;
}

function usd(n: number, decimals = 2) {
  return '$' + n.toFixed(decimals);
}

function UsageBar({ used, total, label, color = 'var(--accent-dim)' }: {
  used: number; total: number; label: string; color?: string;
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const remaining = total - used;
  return (
    <div className="ct-usage-row">
      <div className="ct-usage-header">
        <span className="ct-usage-label">{label}</span>
        <span className="ct-usage-remaining" style={{ color: remaining > 0 ? 'var(--green)' : 'var(--rose)' }}>
          {typeof remaining === 'number' && remaining % 1 === 0
            ? `${remaining} remaining`
            : `${usd(remaining)} remaining`}
        </span>
      </div>
      <div className="ct-bar-track">
        <div className="ct-bar-fill" style={{ width: `${pct}%`, background: pct > 80 ? 'var(--rose)' : color }} />
      </div>
      <div className="ct-usage-meta">
        <span>{pct.toFixed(1)}% used</span>
        <span>{typeof used === 'number' && used % 1 === 0 ? `${used} of ${total}` : `${usd(used)} of ${usd(total)}`}</span>
      </div>
    </div>
  );
}

function DetailRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ct-detail-row">
      <span className="ct-detail-label">{label}</span>
      <span className="ct-detail-spacer" />
      <div className="ct-detail-right">
        <span className="ct-detail-value">{value}</span>
        {sub && <span className="ct-detail-sub">{sub}</span>}
      </div>
    </div>
  );
}

export default function CostsPage() {
  const [costs, setCosts] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      fetch('/api/costs')
        .then(r => r.json())
        .then(data => { setCosts(data); })
        .catch(() => { setError('Failed to load cost data.'); })
        .finally(() => setLoading(false));
    });
  }, [supabase, router]);

  return (
    <>
      <style>{`
        .ct-main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 48px 40px 80px;
        }

        .ct-hero { margin-bottom: 32px; }
        .ct-hero h1 {
          font-family: var(--font-d);
          font-size: 44px;
          font-weight: 500;
          color: var(--t0);
          line-height: 1.05;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }
        .ct-hero h1 em { color: var(--accent-dim); font-style: italic; }
        .ct-hero p { font-size: 12px; color: var(--t1); line-height: 1.7; letter-spacing: 0.02em; font-family: var(--font-mono); }

        .ct-disclaimer {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: var(--bg2);
          border: 1px solid var(--b0);
          border-left: 3px solid var(--accent-dim);
          padding: 12px 16px;
          margin-bottom: 40px;
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t1);
          line-height: 1.6;
          letter-spacing: 0.02em;
        }
        .ct-disclaimer-icon { color: var(--accent-dim); font-size: 13px; flex-shrink: 0; margin-top: 1px; }

        /* KPI grid — 3 col */
        .ct-kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--b0);
          border: 1px solid var(--b0);
          margin-bottom: 48px;
        }
        .ct-kpi-card {
          background: var(--bg1);
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-top: 2px solid transparent;
        }
        .ct-kpi-card.kpi-anthropic { border-top-color: #FB7185; }
        .ct-kpi-card.kpi-google    { border-top-color: #3B82F6; }
        .ct-kpi-card.kpi-hunter    { border-top-color: #10B981; }
        .ct-kpi-label {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .ct-kpi-value {
          font-family: var(--font-d);
          font-size: 44px;
          font-weight: 500;
          line-height: 1;
          letter-spacing: -0.02em;
          color: var(--t0);
        }
        .ct-kpi-sub {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.04em;
        }
        .ct-kpi-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          background: var(--bg2);
          border: 1px solid var(--b0);
          padding: 2px 8px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 4px;
          align-self: flex-start;
        }

        /* Section header */
        .section-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .section-rule { flex: 1; height: 1px; background: var(--b0); }

        /* Free tier usage bars */
        .ct-usage-wrap { margin-bottom: 48px; display: flex; flex-direction: column; gap: 24px; }
        .ct-usage-row { display: flex; flex-direction: column; gap: 8px; }
        .ct-usage-header { display: flex; align-items: center; justify-content: space-between; }
        .ct-usage-label {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t0);
          letter-spacing: 0.06em;
          font-weight: 500;
        }
        .ct-usage-remaining { font-size: 11px; font-family: var(--font-mono); letter-spacing: 0.04em; }
        .ct-bar-track { height: 3px; background: var(--bg3); overflow: hidden; }
        .ct-bar-fill  { height: 100%; transition: width 0.8s ease; }
        .ct-usage-meta {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.04em;
        }

        /* Detail breakdown */
        .ct-breakdown-wrap { margin-bottom: 48px; display: flex; flex-direction: column; gap: 32px; }
        .ct-breakdown-section {
          background: var(--bg1);
          border: 1px solid var(--b0);
          overflow: hidden;
        }
        .ct-breakdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: var(--bg2);
          border-bottom: 1px solid var(--b0);
        }
        .ct-breakdown-title {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--t0);
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .ct-breakdown-total {
          font-family: var(--font-d);
          font-size: 18px;
          font-weight: 500;
          color: var(--t0);
        }
        .ct-detail-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
          padding: 10px 20px;
          border-bottom: 1px solid var(--b1);
        }
        .ct-detail-row:last-child { border-bottom: none; }
        .ct-detail-label {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t1);
          letter-spacing: 0.03em;
          white-space: nowrap;
        }
        .ct-detail-spacer { flex: 1; border-bottom: 1px dotted var(--b0); margin-bottom: 3px; min-width: 20px; }
        .ct-detail-right { display: flex; flex-direction: column; align-items: flex-end; }
        .ct-detail-value {
          font-size: 12px;
          font-family: var(--font-mono);
          color: var(--t0);
          font-weight: 500;
          letter-spacing: 0.04em;
        }
        .ct-detail-sub {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.03em;
        }

        /* Empty / error states */
        .ct-empty {
          text-align: center;
          padding: 80px 32px;
          font-family: var(--font-d);
          font-size: 24px;
          color: var(--t2);
          font-style: italic;
        }

        /* Skeleton */
        .ct-sk-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: var(--b0); border: 1px solid var(--b0); margin-bottom: 48px; }
        .ct-sk-card { background: var(--bg1); padding: 28px 24px; display: flex; flex-direction: column; gap: 10px; }
      `}</style>

      <LeadIntelligenceTabs />

      <main className="ct-main">
        <div className="ct-hero">
          <h1>API <em>Cost Intelligence</em></h1>
          <p>Estimated spend across all third-party APIs. Figures update automatically as you add leads.</p>
        </div>

        <div className="ct-disclaimer">
          <span className="ct-disclaimer-icon">⚑</span>
          <span>
            These are <strong>estimates</strong> derived from pipeline data — not invoiced amounts.
            Claude Haiku token counts use average prompt lengths. Google Places usage is inferred from leads saved.
            Actual spend may differ based on search patterns and response sizes.
          </span>
        </div>

        {loading && (
          <>
            <div className="ct-sk-grid">
              {[0, 1, 2].map(i => (
                <div key={i} className="ct-sk-card">
                  <div className="sk" style={{ width: 80, height: 9 }} />
                  <div className="sk" style={{ width: 120, height: 40 }} />
                  <div className="sk" style={{ width: 140, height: 11 }} />
                </div>
              ))}
            </div>
            <div className="skeleton-wrap">
              {[0, 1].map(i => (
                <div key={i} className="sk-row">
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="sk" style={{ width: '40%', height: 11 }} />
                    <div className="sk" style={{ width: '100%', height: 3 }} />
                    <div className="sk" style={{ width: '30%', height: 9 }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {error && (
          <div className="error-msg">{error}</div>
        )}

        {!loading && !error && costs && (
          <>
            {/* KPI Summary */}
            <div className="ct-kpi-grid">
              <div className="ct-kpi-card kpi-anthropic">
                <span className="ct-kpi-label">Claude Haiku</span>
                <span className="ct-kpi-value">{usd(costs.totals.anthropic, 4)}</span>
                <span className="ct-kpi-sub">{costs.anthropic.scoredLeads} leads scored</span>
                <span className="ct-kpi-tag">Pay-per-token</span>
              </div>
              <div className="ct-kpi-card kpi-google">
                <span className="ct-kpi-label">Google Places</span>
                <span className="ct-kpi-value">{usd(costs.totals.google)}</span>
                <span className="ct-kpi-sub">~{costs.google.estimatedSearches} searches · {costs.google.totalLeads} detail calls</span>
                <span className="ct-kpi-tag">
                  {usd(costs.google.creditRemaining)} credit left
                </span>
              </div>
              <div className="ct-kpi-card kpi-hunter">
                <span className="ct-kpi-label">Hunter.io</span>
                <span className="ct-kpi-value">{usd(costs.totals.hunter)}</span>
                <span className="ct-kpi-sub">{costs.hunter.hunterLeads} email lookups</span>
                <span className="ct-kpi-tag">
                  {costs.hunter.freeUsed} of {costs.hunter.freeTotal} free used
                </span>
              </div>
            </div>

            {/* Free tier usage */}
            <div className="section-header">
              <span className="section-title">Free Tier Usage</span>
              <div className="section-rule" />
            </div>
            <div className="ct-usage-wrap">
              <UsageBar
                label="Google Places — $200/month credit"
                used={costs.google.creditUsed}
                total={costs.google.creditTotal}
                color="#3B82F6"
              />
              <UsageBar
                label={`Hunter.io — ${costs.hunter.freeTotal} free searches/month`}
                used={costs.hunter.freeUsed}
                total={costs.hunter.freeTotal}
                color="#10B981"
              />
            </div>

            {/* Per-API breakdown */}
            <div className="section-header">
              <span className="section-title">Per-API Breakdown</span>
              <div className="section-rule" />
            </div>
            <div className="ct-breakdown-wrap">

              {/* Anthropic */}
              <div className="ct-breakdown-section">
                <div className="ct-breakdown-header">
                  <span className="ct-breakdown-title">Claude Haiku · {costs.anthropic.model}</span>
                  <span className="ct-breakdown-total">{usd(costs.anthropic.total, 4)}</span>
                </div>
                <DetailRow label="Leads scored" value={`${costs.anthropic.scoredLeads}`} />
                <DetailRow
                  label="Avg input tokens per lead"
                  value={`${costs.anthropic.avgInputTokens} tokens`}
                  sub="system prompt + user message"
                />
                <DetailRow
                  label="Avg output tokens per lead"
                  value={`${costs.anthropic.avgOutputTokens} tokens`}
                  sub="JSON framework score response"
                />
                <DetailRow
                  label="Input cost"
                  value={usd(costs.anthropic.inputCost, 4)}
                  sub="$0.80 / MTok"
                />
                <DetailRow
                  label="Output cost"
                  value={usd(costs.anthropic.outputCost, 4)}
                  sub="$4.00 / MTok"
                />
              </div>

              {/* Google Places */}
              <div className="ct-breakdown-section">
                <div className="ct-breakdown-header">
                  <span className="ct-breakdown-title">Google Places API</span>
                  <span className="ct-breakdown-total">{usd(costs.google.total)}</span>
                </div>
                <DetailRow label="Total leads saved" value={`${costs.google.totalLeads}`} />
                <DetailRow
                  label="Estimated searches"
                  value={`~${costs.google.estimatedSearches}`}
                  sub="≈ 1 search per 12 leads saved"
                />
                <DetailRow
                  label="Text Search calls"
                  value={usd(costs.google.textSearchCost)}
                  sub={`~${costs.google.estimatedSearches} calls × $0.032`}
                />
                <DetailRow
                  label="Place Details calls"
                  value={usd(costs.google.detailsCost)}
                  sub={`${costs.google.totalLeads} calls × $0.017`}
                />
                <DetailRow
                  label="Monthly credit remaining"
                  value={usd(costs.google.creditRemaining)}
                  sub="resets each calendar month"
                />
              </div>

              {/* Hunter */}
              <div className="ct-breakdown-section">
                <div className="ct-breakdown-header">
                  <span className="ct-breakdown-title">Hunter.io</span>
                  <span className="ct-breakdown-total">{usd(costs.hunter.total)}</span>
                </div>
                <DetailRow label="Email lookups via Hunter" value={`${costs.hunter.hunterLeads}`} />
                <DetailRow
                  label="Free credits used"
                  value={`${costs.hunter.freeUsed} of ${costs.hunter.freeTotal}`}
                  sub="resets each month"
                />
                <DetailRow
                  label="Paid credits used"
                  value={`${costs.hunter.paidCredits}`}
                  sub="after free tier exhausted"
                />
                <DetailRow
                  label="Paid cost"
                  value={usd(costs.hunter.total)}
                  sub="$34/500 credits ≈ $0.068/credit"
                />
                {costs.hunter.total === 0 && (
                  <DetailRow
                    label="Status"
                    value="Within free tier"
                    sub="no charges incurred"
                  />
                )}
              </div>

            </div>

            {/* Total */}
            <div className="section-header">
              <span className="section-title">Total Estimated Spend</span>
              <div className="section-rule" />
            </div>
            <div className="ct-breakdown-section" style={{ marginBottom: 0 }}>
              <DetailRow label="Claude Haiku" value={usd(costs.totals.anthropic, 4)} />
              <DetailRow label="Google Places" value={usd(costs.totals.google)} />
              <DetailRow label="Hunter.io" value={usd(costs.totals.hunter)} />
              <div className="ct-detail-row" style={{ borderTop: '1px solid var(--b0)', marginTop: 0 }}>
                <span className="ct-detail-label" style={{ color: 'var(--t0)', fontWeight: 500 }}>Total</span>
                <span className="ct-detail-spacer" />
                <span className="ct-detail-value" style={{ fontSize: 18, color: 'var(--accent-dim)' }}>{usd(costs.totals.overall, 4)}</span>
              </div>
            </div>

            {costs.google.totalLeads === 0 && (
              <div className="ct-empty" style={{ marginTop: 48 }}>
                No leads yet — add some to start tracking costs.
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
