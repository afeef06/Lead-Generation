'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { LeadIntelligenceTabs } from '@/components/lead-intelligence-tabs';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { IconWarning } from '../components/icons';
import { type Stage } from '../../lib/stages';

interface Lead {
  id: string;
  place_id: string | null;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  stage: Stage;
  framework_match: string | null;
  framework_score: number | null;
  framework_reasoning: string | null;
  service_secondary: string | null;
  website_score: number | null;
  ads_score: number | null;
  consulting_score: number | null;
  rating: number | null;
  review_count: number | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  created_by_email: string | null;
  created_by_name: string | null;
  outreach_attempted: boolean;
  outreach_answered: boolean;
  outreach_channel: 'none' | 'phone' | 'email' | 'text';
  wants_to_move_forward: boolean;
}

type OutreachField = 'outreach_attempted' | 'outreach_answered' | 'outreach_channel' | 'wants_to_move_forward';

const STAGE_COLOR: Record<Stage, string> = {
  discovered: '#4A3838',
  qualified:  '#8B0000',
  outreach:   '#A50000',
  closed:     '#10B981',
};

const STAGE_LABEL: Record<Stage, string> = {
  discovered: 'Discovered',
  qualified:  'Qualified',
  outreach:   'Outreach',
  closed:     'Closed',
};

const SVC_COLOR: Record<string, string> = {
  website: '#A50000', ads: '#7C3AED', consulting: '#10B981',
};
const SVC_SHORT: Record<string, string> = {
  website: 'WEB', ads: 'ADS', consulting: 'CON',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function OutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [patchError, setPatchError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const loadLeads = useCallback(async () => {
    const res = await fetch('/api/pipeline');
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Failed to load leads');
      return;
    }
    const d = await res.json();
    setLeads(d.leads ?? []);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      await loadLeads();
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when user navigates back to this tab (catches newly saved leads)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') loadLeads();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadLeads]);

  async function patch(lead: Lead, field: OutreachField, value: boolean | string) {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, [field]: value } : l));
    setPatchingId(lead.id);
    setPatchError('');
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const d = await res.json();
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, [field]: lead[field] } : l));
        setPatchError(d.error ?? 'Save failed');
      }
    } catch {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, [field]: lead[field] } : l));
      setPatchError('Save failed');
    } finally {
      setPatchingId(null);
    }
  }

  const contacted = leads.filter(l => l.outreach_attempted).length;
  const responded = leads.filter(l => l.outreach_answered).length;
  const moving    = leads.filter(l => l.wants_to_move_forward).length;

  return (
    <>
      <style>{`
        .ot-main { max-width: 1400px; margin: 0 auto; padding: 48px 40px 80px; }

        .ot-header { display: flex; align-items: baseline; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
        .ot-header h1 {
          font-family: var(--font-d); font-size: 36px; font-weight: 500;
          color: var(--t0); line-height: 1; letter-spacing: -0.01em;
        }
        .ot-header h1 em { color: var(--accent-dim); font-style: italic; }
        .ot-refresh-btn {
          font-size: 9px; font-family: var(--font-mono); color: var(--t2);
          text-transform: uppercase; letter-spacing: 0.1em;
          background: none; border: 1px solid var(--b0); padding: 4px 10px;
          cursor: pointer; transition: color 0.15s, border-color 0.15s;
        }
        .ot-refresh-btn:hover { color: var(--t0); border-color: var(--t2); }
        .ot-refresh-time {
          font-size: 9px; font-family: var(--font-mono); color: var(--t2);
          letter-spacing: 0.06em; align-self: center;
        }

        .ot-stats {
          display: flex; gap: 0; margin-bottom: 24px;
          border: 1px solid var(--b0); overflow: hidden;
        }
        .ot-stat {
          flex: 1; padding: 14px 20px; border-right: 1px solid var(--b0);
          background: var(--bg1);
        }
        .ot-stat:last-child { border-right: none; }
        .ot-stat-val {
          font-family: var(--font-d); font-size: 28px; font-weight: 500;
          color: var(--t0); line-height: 1; display: block; margin-bottom: 4px;
        }
        .ot-stat-val.accent { color: var(--accent-dim); }
        .ot-stat-lbl {
          font-size: 9px; font-family: var(--font-mono); color: var(--t2);
          text-transform: uppercase; letter-spacing: 0.12em;
        }

        .ot-wrap { border: 1px solid var(--b0); overflow-x: auto; }
        .ot-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .ot-table thead { background: var(--bg2); border-bottom: 1px solid var(--b0); }
        .ot-table thead th {
          padding: 8px 12px; font-size: 9px; font-family: var(--font-mono);
          color: var(--t2); text-align: left; text-transform: uppercase;
          letter-spacing: 0.12em; white-space: nowrap; font-weight: 500;
        }
        .ot-table thead th.th-c { text-align: center; }
        .ot-row { border-bottom: 1px solid var(--b1); transition: background 0.1s; }
        .ot-row:last-child { border-bottom: none; }
        .ot-row:hover { background: rgba(255,255,255,0.02); }
        .ot-row.saving { opacity: 0.6; pointer-events: none; }
        .ot-table td { padding: 9px 12px; vertical-align: middle; }

        .td-num { width: 32px; font-size: 10px; color: var(--t2); font-family: var(--font-mono); }
        .td-name { min-width: 170px; max-width: 230px; }
        .lead-btn {
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: var(--font-mono); font-size: 12px; color: var(--t0);
          text-align: left; text-decoration: underline; text-underline-offset: 2px;
          text-decoration-color: var(--b0); transition: color 0.15s;
        }
        .lead-btn:hover { color: var(--accent-dim); text-decoration-color: var(--accent-dim); }
        .lead-addr { font-size: 9px; color: var(--t2); margin-top: 2px; line-height: 1.4; }

        .td-svc { width: 76px; }
        .svc-tag { font-size: 9px; font-family: var(--font-mono); font-weight: 500; letter-spacing: 0.1em; }
        .svc-num { font-size: 9px; color: var(--t2); margin-left: 3px; }

        .td-stage { width: 96px; }
        .stage-dot { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-family: var(--font-mono); letter-spacing: 0.05em; }
        .stage-pip { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

        .td-date { width: 80px; font-size: 10px; font-family: var(--font-mono); color: var(--t2); letter-spacing: 0.04em; white-space: nowrap; }

        .td-c { width: 76px; text-align: center; }
        .ot-cb {
          appearance: none; -webkit-appearance: none;
          width: 15px; height: 15px; cursor: pointer;
          border: 1px solid var(--b0); background: var(--bg2);
          display: inline-block; vertical-align: middle; position: relative;
          transition: border-color 0.12s, background 0.12s;
        }
        .ot-cb:hover { border-color: var(--t2); }
        .ot-cb:checked { background: var(--green); border-color: var(--green); }
        .ot-cb:checked::after {
          content: ''; position: absolute; left: 4px; top: 1px;
          width: 4px; height: 8px; border: 1.5px solid #fff;
          border-top: none; border-left: none; transform: rotate(45deg);
        }
        .ot-cb.fwd:checked { background: var(--accent-dim); border-color: var(--accent-dim); }

        .td-ch { width: 90px; }
        .ch-select {
          background: transparent; border: none;
          border-bottom: 1px solid var(--b0); color: var(--t1);
          font-size: 10px; font-family: var(--font-mono); letter-spacing: 0.06em;
          padding: 2px 2px; cursor: pointer; outline: none;
          transition: border-color 0.15s, color 0.15s;
        }
        .ch-select:hover { border-bottom-color: var(--t2); color: var(--t0); }
        .ch-select:focus { border-bottom-color: var(--accent-dim); color: var(--t0); }

        .ot-patch-err {
          font-size: 10px; font-family: var(--font-mono); color: var(--error);
          margin-bottom: 14px; display: flex; align-items: center; gap: 6px;
        }
        .ot-empty {
          text-align: center; padding: 64px 20px; font-size: 12px;
          color: var(--t2); font-family: var(--font-mono); letter-spacing: 0.04em;
        }
        .ot-empty a { color: var(--accent-dim); text-decoration: none; }
        .ot-empty a:hover { text-decoration: underline; }
      `}</style>

      <LeadIntelligenceTabs />

      <main className="ot-main">
        <div className="ot-header">
          <h1>Outreach <em>Tracker</em></h1>
          <button className="ot-refresh-btn" onClick={loadLeads}>↻ Refresh</button>
          <span className="ot-refresh-time">
            Updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>

        <div className="ot-stats">
          <div className="ot-stat">
            <span className="ot-stat-val">{leads.length}</span>
            <span className="ot-stat-lbl">Total Leads</span>
          </div>
          <div className="ot-stat">
            <span className="ot-stat-val">{contacted}</span>
            <span className="ot-stat-lbl">Contacted</span>
          </div>
          <div className="ot-stat">
            <span className="ot-stat-val">{responded}</span>
            <span className="ot-stat-lbl">Responded</span>
          </div>
          <div className="ot-stat">
            <span className={`ot-stat-val${moving > 0 ? ' accent' : ''}`}>{moving}</span>
            <span className="ot-stat-lbl">Moving Forward</span>
          </div>
        </div>

        {patchError && (
          <div className="ot-patch-err">
            <IconWarning size={11} /> {patchError}
          </div>
        )}

        {loading ? (
          <div className="ot-empty">Loading…</div>
        ) : error ? (
          <div className="ot-empty">{error}</div>
        ) : leads.length === 0 ? (
          <div className="ot-empty">
            No leads yet. <a href="/">Discover leads</a> and save them to the pipeline first.
          </div>
        ) : (
          <div className="ot-wrap">
            <table className="ot-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Business</th>
                  <th>Service</th>
                  <th>Stage</th>
                  <th>Added</th>
                  <th className="th-c">Contacted</th>
                  <th className="th-c">Responded</th>
                  <th>Channel</th>
                  <th className="th-c">Moving Forward</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.id} className={`ot-row${patchingId === lead.id ? ' saving' : ''}`}>
                    <td className="td-num">{i + 1}</td>
                    <td className="td-name">
                      <button className="lead-btn" onClick={() => setModalLead(lead)}>
                        {lead.name}
                      </button>
                      {lead.address && (
                        <div className="lead-addr">
                          {lead.address.split(',').slice(0, 2).join(',')}
                        </div>
                      )}
                    </td>
                    <td className="td-svc">
                      {lead.framework_match ? (
                        <>
                          <span className="svc-tag" style={{ color: SVC_COLOR[lead.framework_match] ?? 'var(--t2)' }}>
                            {SVC_SHORT[lead.framework_match] ?? lead.framework_match.toUpperCase()}
                          </span>
                          {lead.framework_score != null && (
                            <span className="svc-num">{lead.framework_score.toFixed(1)}</span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--t2)', fontSize: 10 }}>—</span>
                      )}
                    </td>
                    <td className="td-stage">
                      <span className="stage-dot">
                        <span className="stage-pip" style={{ background: STAGE_COLOR[lead.stage] }} />
                        {STAGE_LABEL[lead.stage]}
                      </span>
                    </td>
                    <td className="td-date" title={new Date(lead.created_at).toLocaleString()}>
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="td-c">
                      <input
                        type="checkbox"
                        className="ot-cb"
                        checked={lead.outreach_attempted}
                        onChange={() => patch(lead, 'outreach_attempted', !lead.outreach_attempted)}
                        aria-label={`Contacted ${lead.name}`}
                      />
                    </td>
                    <td className="td-c">
                      <input
                        type="checkbox"
                        className="ot-cb"
                        checked={lead.outreach_answered}
                        onChange={() => patch(lead, 'outreach_answered', !lead.outreach_answered)}
                        aria-label={`${lead.name} responded`}
                      />
                    </td>
                    <td className="td-ch">
                      <select
                        className="ch-select"
                        value={lead.outreach_channel}
                        onChange={e => patch(lead, 'outreach_channel', e.target.value)}
                        aria-label={`Channel for ${lead.name}`}
                      >
                        <option value="none">--</option>
                        <option value="phone">Phone</option>
                        <option value="email">Email</option>
                        <option value="text">Text</option>
                      </select>
                    </td>
                    <td className="td-c">
                      <input
                        type="checkbox"
                        className="ot-cb fwd"
                        checked={lead.wants_to_move_forward}
                        onChange={() => patch(lead, 'wants_to_move_forward', !lead.wants_to_move_forward)}
                        aria-label={`${lead.name} moving forward`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modalLead && (
        <LeadDetailModal
          lead={{
            name: modalLead.name,
            address: modalLead.address,
            phone: modalLead.phone,
            website: modalLead.website,
            rating: modalLead.rating,
            review_count: modalLead.review_count,
            framework_match: modalLead.framework_match,
            website_score: modalLead.website_score,
            ads_score: modalLead.ads_score,
            consulting_score: modalLead.consulting_score,
            framework_reasoning: modalLead.framework_reasoning,
            place_id: modalLead.place_id,
            maps_url: modalLead.place_id
              ? `https://www.google.com/maps/place/?q=place_id:${modalLead.place_id}`
              : null,
          }}
          onClose={() => setModalLead(null)}
        />
      )}
    </>
  );
}
