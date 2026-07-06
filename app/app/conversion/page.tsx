'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import { LeadIntelligenceTabs } from '@/components/lead-intelligence-tabs';
import { IconArrowRight, IconCheck } from '../components/icons';

interface Lead {
  id: string;
  name: string;
  stage: 'discovered' | 'qualified' | 'outreach' | 'closed';
  framework_match: string | null;
  framework_score: number | null;
  created_at: string;
}

const STAGES = ['discovered', 'qualified', 'outreach', 'closed'] as const;
type Stage = typeof STAGES[number];

const STAGE_LABELS: Record<Stage, string> = {
  discovered: 'Discovered',
  qualified:  'Qualified',
  outreach:   'Outreach',
  closed:     'Closed',
};

const STAGE_COLORS: Record<Stage, string> = {
  discovered: '#4A3838',
  qualified:  '#8B0000',
  outreach:   '#A50000',
  closed:     '#10B981',
};

const FW: Record<string, { label: string; short: string; color: string }> = {
  brand_positioning:     { label: 'Brand Positioning',     short: 'Brand',       color: '#A50000' },
  client_acquisition:    { label: 'Client Acquisition',    short: 'Acquisition', color: '#10B981' },
  growth_infrastructure: { label: 'Growth Infrastructure', short: 'Growth',      color: '#7C3AED' },
  scaling_roadmap:       { label: 'Scaling Roadmap',       short: 'Scaling',     color: '#8B0000' },
  venture_development:   { label: 'Venture Development',   short: 'Venture',     color: '#B85450' },
};

function rate(a: number, b: number) {
  if (b === 0) return 0;
  return Math.round((a / b) * 100);
}

export default function ConversionPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      fetch('/api/pipeline')
        .then(r => r.json())
        .then(data => { setLeads(data.leads ?? []); })
        .catch(() => { /* fetch failed — show empty state */ })
        .finally(() => setLoading(false));
    });
  }, [supabase, router]);

  const byStage = STAGES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.stage === s).length;
    return acc;
  }, {} as Record<Stage, number>);

  const total = leads.length;
  const maxStage = Math.max(...Object.values(byStage), 1);

  // Framework breakdown
  const fwCounts: Record<string, { count: number; totalScore: number; closed: number }> = {};
  for (const lead of leads) {
    const fw = lead.framework_match;
    if (!fw) continue;
    if (!fwCounts[fw]) fwCounts[fw] = { count: 0, totalScore: 0, closed: 0 };
    fwCounts[fw].count++;
    if (lead.framework_score) fwCounts[fw].totalScore += lead.framework_score;
    if (lead.stage === 'closed') fwCounts[fw].closed++;
  }
  const fwRows = Object.entries(fwCounts)
    .map(([key, v]) => ({
      key,
      meta: FW[key],
      count: v.count,
      avgScore: v.count > 0 ? v.totalScore / v.count : 0,
      closed: v.closed,
      closeRate: rate(v.closed, v.count),
    }))
    .sort((a, b) => b.count - a.count);

  // Stage-to-stage cumulative conversion steps
  const funnelSteps = [
    { from: 'discovered', to: 'qualified' },
    { from: 'qualified',  to: 'outreach'  },
    { from: 'outreach',   to: 'closed'    },
  ] as const;

  // KPI cards
  const kpis = [
    {
      label: 'Total Leads',
      value: total.toString(),
      sub: 'in pipeline',
      color: 'var(--t0)',
    },
    {
      label: 'Qualified Rate',
      value: `${rate(byStage.qualified + byStage.outreach + byStage.closed, total)}%`,
      sub: `${byStage.qualified + byStage.outreach + byStage.closed} of ${total}`,
      color: '#8B0000',
    },
    {
      label: 'In Outreach',
      value: byStage.outreach.toString(),
      sub: `${rate(byStage.outreach, total)}% of pipeline`,
      color: '#A50000',
    },
    {
      label: 'Closed Won',
      value: byStage.closed.toString(),
      sub: `${rate(byStage.closed, total)}% close rate`,
      color: '#10B981',
    },
  ];

  return (
    <>
      <style>{`
        .cv-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 48px 40px 80px;
        }

        /* Hero */
        .cv-hero { margin-bottom: 48px; }
        .cv-hero h1 {
          font-family: var(--font-d);
          font-size: 44px;
          font-weight: 500;
          color: var(--t0);
          line-height: 1.05;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }
        .cv-hero h1 em { color: var(--accent-dim); font-style: italic; }
        .cv-hero p {
          font-size: 12px;
          color: var(--t1);
          font-family: var(--font-mono);
          line-height: 1.7;
          letter-spacing: 0.02em;
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
        }
        .section-rule {
          flex: 1;
          height: 1px;
          background: var(--b0);
        }

        /* KPI grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--b0);
          border: 1px solid var(--b0);
          margin-bottom: 48px;
        }
        .kpi-card {
          background: var(--bg1);
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .kpi-label {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .kpi-value {
          font-family: var(--font-d);
          font-size: 48px;
          font-weight: 500;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .kpi-sub {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.04em;
        }

        /* Funnel */
        .funnel-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--b0);
          border: 1px solid var(--b0);
          margin-bottom: 48px;
        }
        .funnel-col {
          background: var(--bg1);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .funnel-stage-label {
          font-size: 9px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .funnel-dot {
          width: 6px;
          height: 6px;
          flex-shrink: 0;
        }
        .funnel-count {
          font-family: var(--font-d);
          font-size: 36px;
          font-weight: 500;
          line-height: 1;
          letter-spacing: -0.02em;
          color: var(--t0);
        }
        .funnel-bar-track {
          height: 2px;
          background: var(--bg3);
          position: relative;
          overflow: visible;
        }
        .funnel-bar-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          transition: width 0.8s ease;
        }
        .funnel-pct {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.06em;
        }

        /* Framework table */
        .fw-table-wrap {
          border: 1px solid var(--b0);
          overflow: hidden;
          margin-bottom: 48px;
        }
        .fw-table { width: 100%; border-collapse: collapse; }
        .fw-table thead { background: var(--bg2); border-bottom: 1px solid var(--b0); }
        .fw-table thead th {
          padding: 9px 16px;
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          text-align: left;
          white-space: nowrap;
        }
        .fw-table tbody tr {
          border-bottom: 1px solid var(--b1);
          background: var(--bg1);
          transition: background 0.1s;
        }
        .fw-table tbody tr:last-child { border-bottom: none; }
        .fw-table tbody tr:hover { background: var(--bg2); }
        .fw-table td { padding: 12px 16px; vertical-align: middle; }

        .fw-name-cell { display: flex; align-items: center; gap: 10px; }
        .fw-color-bar { width: 2px; height: 28px; flex-shrink: 0; }
        .fw-name {
          font-size: 12px;
          font-family: var(--font-mono);
          color: var(--t0);
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .score-track {
          width: 100%;
          max-width: 120px;
          height: 2px;
          background: var(--bg3);
          position: relative;
          overflow: hidden;
        }
        .score-fill { position: absolute; top: 0; left: 0; height: 100%; }

        .fw-table .num-cell {
          font-size: 13px;
          font-family: var(--font-mono);
          font-weight: 500;
          text-align: right;
        }
        .close-rate-cell { display: flex; align-items: center; gap: 8px; }
        .close-rate-val {
          font-size: 13px;
          font-family: var(--font-mono);
          font-weight: 500;
          min-width: 36px;
        }
        .close-track {
          flex: 1;
          height: 2px;
          background: var(--bg3);
          overflow: hidden;
        }
        .close-fill { height: 100%; background: var(--green); }

        /* Empty */
        .cv-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 50vh;
          gap: 14px;
          text-align: center;
        }
        .cv-empty .headline {
          font-family: var(--font-d);
          font-size: 32px;
          color: var(--t1);
          font-style: italic;
        }
        .cv-empty p {
          font-size: 12px;
          color: var(--t2);
          font-family: var(--font-mono);
          letter-spacing: 0.04em;
          line-height: 1.7;
        }
        .cv-empty a { color: var(--accent-dim); text-decoration: none; }
        .cv-empty a:hover { text-decoration: underline; }

        .cv-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 50vh;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--t2);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
      `}</style>

      <LeadIntelligenceTabs />

      {loading ? (
        <div className="cv-loading">Loading…</div>
      ) : (
        <main className="cv-main">
          <div className="cv-hero">
            <h1><em>Conversion</em> Tracker</h1>
            <p>Stage-by-stage pipeline performance and framework-level conversion intelligence.</p>
          </div>

          {total === 0 ? (
            <div className="cv-empty">
              <div className="headline">No data yet</div>
              <p>
                Discover and save leads from the{' '}
                <Link href="/">Discovery</Link> page<br />
                to start tracking conversion performance.
              </p>
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="section-header">
                <span className="section-title">Key Metrics</span>
                <div className="section-rule" />
              </div>
              <div className="kpi-grid">
                {kpis.map(k => (
                  <div key={k.label} className="kpi-card">
                    <span className="kpi-label">{k.label}</span>
                    <span className="kpi-value" style={{ color: k.color }}>{k.value}</span>
                    <span className="kpi-sub">{k.sub}</span>
                  </div>
                ))}
              </div>

              {/* Funnel */}
              <div className="section-header">
                <span className="section-title">Pipeline Funnel</span>
                <div className="section-rule" />
              </div>
              <div className="funnel-grid">
                {STAGES.map(stage => {
                  const count = byStage[stage];
                  const pct = rate(count, maxStage);
                  return (
                    <div key={stage} className="funnel-col">
                      <div className="funnel-stage-label" style={{ color: STAGE_COLORS[stage] }}>
                        <div className="funnel-dot" style={{ background: STAGE_COLORS[stage] }} />
                        {STAGE_LABELS[stage]}
                      </div>
                      <div className="funnel-count">{count}</div>
                      <div className="funnel-bar-track">
                        <div
                          className="funnel-bar-fill"
                          style={{ width: `${pct}%`, background: STAGE_COLORS[stage] }}
                        />
                      </div>
                      <div className="funnel-pct">{rate(count, total)}% of pipeline</div>
                    </div>
                  );
                })}
              </div>

              {/* Framework Table */}
              {fwRows.length > 0 && (
                <>
                  <div className="section-header">
                    <span className="section-title">Framework Performance</span>
                    <div className="section-rule" />
                  </div>
                  <div className="fw-table-wrap">
                    <table className="fw-table">
                      <thead>
                        <tr>
                          <th>Framework</th>
                          <th>Leads</th>
                          <th style={{ minWidth: 140 }}>Avg Score</th>
                          <th>Closed</th>
                          <th style={{ minWidth: 200 }}>Close Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fwRows.map(row => (
                          <tr key={row.key}>
                            <td>
                              <div className="fw-name-cell">
                                <div className="fw-color-bar" style={{ background: row.meta?.color ?? '#99907c' }} />
                                <span className="fw-name">{row.meta?.label ?? row.key}</span>
                              </div>
                            </td>
                            <td className="num-cell" style={{ color: 'var(--t0)' }}>{row.count}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="score-track">
                                  <div
                                    className="score-fill"
                                    style={{ width: `${(row.avgScore / 10) * 100}%`, background: row.meta?.color ?? '#99907c' }}
                                  />
                                </div>
                                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: row.meta?.color ?? 'var(--t2)', fontWeight: 500 }}>
                                  {row.avgScore.toFixed(1)}
                                </span>
                              </div>
                            </td>
                            <td className="num-cell" style={{ color: 'var(--green)' }}>
                              {row.closed > 0 ? <><IconCheck size={10} /> {row.closed}</> : <span style={{ color: 'var(--t2)' }}>0</span>}
                            </td>
                            <td>
                              <div className="close-rate-cell">
                                <span className="close-rate-val" style={{ color: row.closeRate > 0 ? 'var(--green)' : 'var(--t2)' }}>
                                  {row.closeRate}%
                                </span>
                                <div className="close-track">
                                  <div className="close-fill" style={{ width: `${row.closeRate}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Conversion paths */}
                  <div className="section-header">
                    <span className="section-title">Stage Conversion</span>
                    <div className="section-rule" />
                  </div>
                  <div style={{ display: 'flex', gap: 1, background: 'var(--b0)', border: '1px solid var(--b0)' }}>
                    {funnelSteps.map(({ from, to }) => {
                      const fromCount = byStage[from] + (from === 'discovered' ? byStage.qualified + byStage.outreach + byStage.closed : from === 'qualified' ? byStage.outreach + byStage.closed : byStage.closed);
                      const toCount   = byStage[to]   + (to   === 'qualified'  ? byStage.outreach + byStage.closed : to === 'outreach' ? byStage.closed : 0);
                      const r = rate(toCount, fromCount);
                      return (
                        <div key={`${from}-${to}`} style={{ flex: 1, background: 'var(--bg1)', padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--t2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            <span style={{ color: STAGE_COLORS[from] }}>{STAGE_LABELS[from]}</span>
                            <IconArrowRight size={10} />
                            <span style={{ color: STAGE_COLORS[to] }}>{STAGE_LABELS[to]}</span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-d)', fontSize: 40, fontWeight: 500, color: r >= 50 ? 'var(--green)' : r >= 25 ? 'var(--accent-dim)' : 'var(--t1)', lineHeight: 1, marginBottom: 8 }}>
                            {r}%
                          </div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--t2)', letterSpacing: '0.04em' }}>
                            {toCount} of {fromCount} leads advanced
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      )}
    </>
  );
}
