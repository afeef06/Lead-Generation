'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import { LeadIntelligenceTabs } from '@/components/lead-intelligence-tabs';
import {
  IconArrowRight, IconCheck, IconMail, IconCopy, IconTrash,
  IconGlobe, IconPhone,
} from '../components/icons';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { STAGES, type Stage } from '../../lib/stages';

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
}

interface Member {
  id: string;
  email: string;
  name: string | null;
}

function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) return url;
  } catch { /* invalid URL */ }
  return undefined;
}

const STAGE_META: Record<Stage, { label: string; color: string }> = {
  discovered: { label: 'Discovered', color: '#4d4635' },
  qualified:  { label: 'Qualified',  color: '#4A7EC4' },
  outreach:   { label: 'Outreach',   color: '#d4af37' },
  closed:     { label: 'Closed',     color: '#3A8B6A' },
};

const SERVICE: Record<string, { label: string; short: string; color: string }> = {
  website:    { label: 'Website',    short: 'WEB', color: '#4A7EC4' },
  ads:        { label: 'Ads',        short: 'ADS', color: '#d4af37' },
  consulting: { label: 'Consulting', short: 'CON', color: '#3A8B6A' },
};

function EmailField({ lead, onFound }: { lead: Lead; onFound: (id: string, email: string) => void }) {
  const [enriching, setEnriching] = useState(false);
  const [source, setSource] = useState<'hunter' | 'inferred' | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleEnrich() {
    if (!lead.website) return;
    setEnriching(true);
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, website: lead.website }),
      });
      if (res.ok) {
        const data = await res.json();
        setSource(data.source);
        onFound(lead.id, data.email);
      }
    } finally {
      setEnriching(false);
    }
  }

  function handleCopy() {
    if (!lead.email) return;
    navigator.clipboard.writeText(lead.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (lead.email) {
    return (
      <div className="email-row">
        <button className="email-val" onClick={handleCopy} title="Click to copy">
          <IconMail size={10} />
          {lead.email}
        </button>
        {source && <span className={`email-src ${source}`}>{source}</span>}
        {copied && <span className="email-copied"><IconCheck size={10} />Copied</span>}
        {!copied && <IconCopy size={10} className="icon-muted" />}
      </div>
    );
  }

  if (!lead.website) return null;

  return (
    <button className="enrich-btn" onClick={handleEnrich} disabled={enriching}>
      <IconMail size={10} />
      {enriching ? 'Finding email…' : 'Find email'}
    </button>
  );
}

function NoteField({ lead, onSave }: { lead: Lead; onSave: (id: string, notes: string) => Promise<void> }) {
  const [value, setValue] = useState(lead.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleBlur() {
    if (value === (lead.notes ?? '')) return;
    setSaving(true);
    await onSave(lead.id, value);
    setSaving(false);
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="note-wrap">
      <textarea
        className="note-input"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add a note…"
        rows={2}
      />
      {(saving || saved) && (
        <span className="note-status">
          {saving ? '…' : <><IconCheck size={9} />Saved</>}
        </span>
      )}
    </div>
  );
}

function Card({
  lead, onAdvance, onSaveNote, onUpdate, onViewDetails, selectMode, selected, onToggle, currentUserId,
}: {
  lead: Lead;
  onAdvance: (lead: Lead) => void;
  onSaveNote: (id: string, notes: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onViewDetails: (lead: Lead) => void;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
  currentUserId: string | null;
}) {
  const primarySvc = lead.framework_match ? SERVICE[lead.framework_match] : null;
  const stageIdx = STAGES.indexOf(lead.stage);
  const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;
  const isMe = lead.created_by === currentUserId;

  const subScores: Array<{ key: string; val: number }> | null =
    lead.website_score != null || lead.ads_score != null || lead.consulting_score != null
      ? [
          { key: 'website',    val: lead.website_score    ?? 0 },
          { key: 'ads',        val: lead.ads_score        ?? 0 },
          { key: 'consulting', val: lead.consulting_score ?? 0 },
        ].sort((a, b) => b.val - a.val)
      : null;

  return (
    <div
      className={`card${selected ? ' card-selected' : ''}`}
      style={{ borderTop: `1px solid ${primarySvc?.color ?? 'var(--b0)'}` }}
      onClick={selectMode ? onToggle : undefined}
    >
      {selectMode && (
        <div className="card-check">
          <input type="checkbox" checked={selected} onChange={onToggle} onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="card-top">
        <a
          href={lead.place_id ? `https://www.google.com/maps/place/?q=place_id:${lead.place_id}` : undefined}
          target="_blank"
          rel="noreferrer noopener"
          className="card-name"
        >
          {lead.name}
        </a>
        {lead.address && (
          <span className="card-addr">{lead.address.split(',').slice(-3).join(',').trim()}</span>
        )}
      </div>

      {(lead.created_by_name || lead.created_by_email) && (
        <span className={`card-contributor${isMe ? ' card-contributor-me' : ''}`}>
          {isMe ? 'Me' : (lead.created_by_name ?? lead.created_by_email?.split('@')[0])}
        </span>
      )}

      {primarySvc && (
        <span className="svc-primary-badge" style={{ color: primarySvc.color, background: `${primarySvc.color}12`, borderColor: `${primarySvc.color}28` }}>
          <span className="svc-dot" style={{ background: primarySvc.color }} />
          {primarySvc.label}
        </span>
      )}

      {subScores && (
        <div className="svc-gap-card">
          {subScores.map(({ key, val }) => {
            const s = SERVICE[key];
            const isPrimary = key === lead.framework_match;
            return (
              <div key={key} className="svc-row-card" style={{ opacity: isPrimary ? 1 : 0.5 }}>
                <span className="svc-label-card" style={{ color: isPrimary ? s.color : 'var(--t2)' }}>{s.short}</span>
                <span className="svc-track-card">
                  <span className="svc-fill-card" style={{ width: `${val * 10}%`, background: s.color }} />
                </span>
                <span className="svc-score-card" style={{ color: isPrimary ? s.color : 'var(--t2)' }}>{val.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      )}

      {lead.framework_reasoning && (
        <p className="card-reasoning">{lead.framework_reasoning}</p>
      )}

      <div className="card-links">
        {safeUrl(lead.website) && (
          <a href={safeUrl(lead.website)} target="_blank" rel="noreferrer noopener" className="card-link">
            <IconGlobe size={10} />
            {lead.website!.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
          </a>
        )}
        {lead.phone && (
          <span className="card-phone">
            <IconPhone size={10} />
            {lead.phone}
          </span>
        )}
      </div>

      <EmailField lead={lead} onFound={(id, email) => onUpdate(id, { email })} />
      <NoteField lead={lead} onSave={onSaveNote} />

      <div className="card-actions">
        <button className="details-btn" onClick={() => onViewDetails(lead)}>Details</button>
        {nextStage ? (
          <button className="advance-btn advance-btn-inline" onClick={() => onAdvance(lead)}>
            <IconArrowRight size={10} />
            {STAGE_META[nextStage].label}
          </button>
        ) : (
          <span className="closed-tag">
            <IconCheck size={9} />
            Closed
          </span>
        )}
      </div>
    </div>
  );
}

function Column({
  stage, leads, onAdvance, onSaveNote, onUpdate, onViewDetails, selectMode, selectedIds, onToggle, currentUserId,
}: {
  stage: Stage;
  leads: Lead[];
  onAdvance: (lead: Lead) => void;
  onSaveNote: (id: string, notes: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onViewDetails: (lead: Lead) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  currentUserId: string | null;
}) {
  const meta = STAGE_META[stage];
  return (
    <div className="column">
      <div className="col-header">
        <span className="col-indicator" style={{ background: meta.color }} />
        <span className="col-name">{meta.label}</span>
        <span className="col-count">{leads.length}</span>
      </div>
      <div className="cards">
        {leads.length === 0 && <div className="col-empty">No leads</div>}
        {leads.map(lead => (
          <Card
            key={lead.id}
            lead={lead}
            onAdvance={onAdvance}
            onSaveNote={onSaveNote}
            onUpdate={onUpdate}
            onViewDetails={onViewDetails}
            selectMode={selectMode}
            selected={selectedIds.has(lead.id)}
            onToggle={() => onToggle(lead.id)}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filterBy, setFilterBy] = useState<string | null>(null);
  const [rescoring, setRescoring] = useState(false);
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const loadLeads = useCallback(async () => {
    const res = await fetch('/api/pipeline');
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads);
    }
    setLoading(false);
  }, []);

  const loadMembers = useCallback(async () => {
    const res = await fetch('/api/members');
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members ?? []);
      setCurrentUserId(data.currentUserId ?? null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login');
      else {
        loadLeads();
        loadMembers();
      }
    });
  }, [supabase, router, loadLeads, loadMembers]);

  async function handleRescore() {
    setRescoring(true);
    try {
      await fetch('/api/rescore', { method: 'POST' });
      await loadLeads();
    } finally {
      setRescoring(false);
    }
  }

  async function advanceLead(lead: Lead) {
    const idx = STAGES.indexOf(lead.stage);
    if (idx >= STAGES.length - 1) return;
    const nextStage = STAGES[idx + 1];
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: nextStage } : l));
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: nextStage }),
    });
  }

  async function saveNote(id: string, notes: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, notes } : l));
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
  }

  function updateLead(id: string, updates: Partial<Lead>) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
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

  async function deleteSelected() {
    if (!window.confirm(`Delete ${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    const ids = [...selectedIds];
    await Promise.all(ids.map(id => fetch(`/api/leads/${id}`, { method: 'DELETE' })));
    setLeads(prev => prev.filter(l => !selectedIds.has(l.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
    setDeleting(false);
  }

  const displayedLeads = filterBy ? leads.filter(l => l.created_by === filterBy) : leads;

  const byStage = STAGES.reduce((acc, s) => {
    acc[s] = displayedLeads.filter(l => l.stage === s);
    return acc;
  }, {} as Record<Stage, Lead[]>);

  const total = leads.length;

  return (
    <>
      <style>{`
        .board {
          padding: 24px 40px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          min-height: calc(100vh - 52px);
          align-items: start;
        }

        .column {
          background: var(--bg1);
          border: 1px solid var(--b0);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .col-header {
          padding: 11px 14px;
          border-bottom: 1px solid var(--b0);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .col-indicator {
          width: 3px;
          height: 14px;
          flex-shrink: 0;
        }
        .col-name {
          font-size: 10px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 500;
          color: var(--t1);
          flex: 1;
        }
        .col-count {
          font-size: 10px;
          font-family: var(--font-mono);
          background: var(--bg3);
          border: 1px solid var(--b0);
          padding: 1px 7px;
          color: var(--t2);
          letter-spacing: 0.04em;
        }
        .cards {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 60px;
        }
        .col-empty {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t2);
          text-align: center;
          padding: 32px 8px;
          letter-spacing: 0.04em;
        }

        /* Card — gold top-border per Stitch spec */
        .card {
          background: var(--bg2);
          border: 1px solid var(--b0);
          border-top: 1px solid; /* color set inline per framework */
          padding: 12px 13px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: cardIn 0.22s ease both;
          transition: background 0.1s;
          cursor: default;
        }
        .card:hover { background: var(--bg3); }
        .card-selected { background: rgba(212,175,55,0.04) !important; outline: 1px solid rgba(212,175,55,0.25); }
        .card-check { display: flex; justify-content: flex-end; margin-bottom: -2px; }
        .card-check input { accent-color: var(--gold-dim); width: 12px; height: 12px; cursor: pointer; }

        .card-top { display: flex; flex-direction: column; gap: 3px; }
        .card-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--t0);
          text-decoration: none;
          line-height: 1.35;
          transition: color 0.12s;
          font-family: var(--font-mono);
          letter-spacing: 0.01em;
        }
        .card-name:hover { color: var(--gold-dim); }
        .card-addr {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          line-height: 1.4;
          letter-spacing: 0.04em;
        }
        .card-reasoning {
          font-size: 10px;
          color: var(--t1);
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-family: var(--font-mono);
          letter-spacing: 0.01em;
        }

        .card-links { display: flex; flex-direction: column; gap: 4px; }
        .card-link {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--blue);
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: color 0.12s;
          letter-spacing: 0.02em;
        }
        .card-link:hover { color: var(--t0); }
        .card-phone {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--t2);
          display: flex;
          align-items: center;
          gap: 5px;
          letter-spacing: 0.02em;
        }

        /* Note */
        .note-wrap { position: relative; }
        .note-input {
          width: 100%;
          background: var(--bg3);
          border: none;
          border-bottom: 1px solid var(--b0);
          color: var(--t1);
          font-size: 10px;
          font-family: var(--font-mono);
          padding: 7px 8px;
          resize: none;
          outline: none;
          transition: border-color 0.15s, color 0.15s;
          line-height: 1.55;
          letter-spacing: 0.02em;
        }
        .note-input::placeholder { color: var(--t2); }
        .note-input:focus { border-bottom-color: var(--b0); color: var(--t0); }
        .note-status {
          position: absolute;
          bottom: 6px;
          right: 7px;
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--green);
          display: flex;
          align-items: center;
          gap: 3px;
          pointer-events: none;
          letter-spacing: 0.04em;
        }

        /* Email */
        .email-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .email-val {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--green);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: color 0.12s;
          letter-spacing: 0.02em;
        }
        .email-val:hover { color: var(--t0); }
        .email-src {
          font-size: 8px;
          font-family: var(--font-mono);
          padding: 1px 5px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .email-src.hunter  { background: rgba(58,139,106,0.12); color: var(--green); border: 1px solid rgba(58,139,106,0.28); }
        .email-src.inferred { background: var(--bg3); color: var(--t2); border: 1px solid var(--b0); }
        .email-copied {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--green);
          display: flex;
          align-items: center;
          gap: 3px;
          letter-spacing: 0.04em;
        }
        .enrich-btn {
          background: none;
          border: 1px dashed var(--b0);
          color: var(--t2);
          font-size: 10px;
          font-family: var(--font-mono);
          padding: 5px 10px;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: color 0.15s, border-color 0.15s, border-style 0.15s;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .enrich-btn:hover:not(:disabled) { color: var(--t1); border-color: var(--t2); border-style: solid; }
        .enrich-btn:disabled { opacity: 0.5; cursor: default; }

        /* Card actions row */
        .card-actions { display: flex; gap: 6px; align-items: stretch; }
        .details-btn {
          background: none;
          border: 1px solid var(--b0);
          color: var(--t2);
          font-size: 10px;
          font-family: var(--font-mono);
          padding: 6px 10px;
          cursor: pointer;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          flex-shrink: 0;
          transition: color 0.15s, border-color 0.15s;
        }
        .details-btn:hover { color: var(--gold-dim); border-color: rgba(212,175,55,0.4); }

        /* Advance / closed */
        .advance-btn {
          width: 100%;
          background: none;
          border: 1px solid var(--b0);
          color: var(--t2);
          font-size: 10px;
          font-family: var(--font-mono);
          padding: 7px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .advance-btn:hover { color: var(--t0); border-color: var(--t1); background: var(--bg3); }
        .advance-btn-inline { flex: 1; padding: 6px 7px; }
        .closed-tag {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--green);
          text-align: center;
          padding: 4px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        /* Delete bar */
        .delete-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--bg2);
          border: 1px solid var(--b0);
          border-top: 1px solid rgba(212,175,55,0.2);
          padding: 12px 20px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.6);
          z-index: 50;
          white-space: nowrap;
        }
        .delete-bar-count {
          font-size: 12px;
          font-family: var(--font-mono);
          color: var(--t1);
          letter-spacing: 0.04em;
        }
        .delete-bar-count strong { color: var(--gold-dim); font-weight: 500; }

        /* Loading / empty */
        .pl-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 50vh;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--t2);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .empty-board {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          gap: 14px;
        }
        .empty-board .headline {
          font-family: var(--font-d);
          font-size: 32px;
          color: var(--t1);
          font-style: italic;
        }
        .empty-board p { font-size: 12px; color: var(--t2); font-family: var(--font-mono); letter-spacing: 0.04em; }
        .empty-board a { color: var(--gold-dim); text-decoration: none; }
        .empty-board a:hover { text-decoration: underline; }

        /* Filter bar */
        .filter-bar {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 40px; border-bottom: 1px solid var(--b0);
          background: var(--bg0); flex-wrap: wrap;
        }
        .filter-label {
          font-size: 9px; font-family: var(--font-mono); color: var(--t2);
          letter-spacing: 0.14em; text-transform: uppercase; margin-right: 4px;
          flex-shrink: 0;
        }
        .filter-chip {
          background: var(--bg2); border: 1px solid var(--b0);
          color: var(--t2); font-size: 10px; font-family: var(--font-mono);
          padding: 4px 12px; cursor: pointer; letter-spacing: 0.06em;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
        }
        .filter-chip:hover { color: var(--t1); border-color: var(--t2); }
        .filter-chip.active { color: var(--gold-dim); border-color: rgba(212,175,55,0.45); background: rgba(212,175,55,0.06); }
        .filter-chip.is-me.active { color: var(--green); border-color: rgba(58,139,106,0.45); background: rgba(58,139,106,0.06); }

        /* Service primary badge */
        .svc-primary-badge {
          font-size: 9px; font-family: var(--font-mono); letter-spacing: 0.1em;
          text-transform: uppercase; border: 1px solid;
          padding: 2px 8px; align-self: flex-start;
          display: flex; align-items: center; gap: 5px;
        }
        .svc-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

        /* Three sub-score bars */
        .svc-gap-card { display: flex; flex-direction: column; gap: 4px; }
        .svc-row-card { display: flex; align-items: center; gap: 6px; transition: opacity 0.15s; }
        .svc-label-card { font-size: 8px; font-family: var(--font-mono); letter-spacing: 0.1em; width: 26px; flex-shrink: 0; }
        .svc-track-card { flex: 1; height: 2px; background: var(--bg3); overflow: hidden; }
        .svc-fill-card  { height: 100%; transition: width 0.7s ease; }
        .svc-score-card { font-size: 9px; font-family: var(--font-mono); width: 22px; text-align: right; flex-shrink: 0; }

        /* Teammate badge on card */
        .card-contributor {
          font-size: 9px; font-family: var(--font-mono); color: var(--t2);
          letter-spacing: 0.08em; text-transform: uppercase;
          background: var(--bg3); border: 1px solid var(--b1);
          padding: 1px 6px; align-self: flex-start;
        }
        .card-contributor-me { color: var(--green); background: rgba(58,139,106,0.07); border-color: rgba(58,139,106,0.22); }
      `}</style>

      <LeadIntelligenceTabs />

      {loading ? (
        <div className="pl-loading">Loading pipeline…</div>
      ) : total === 0 ? (
        <div className="empty-board">
          <div className="headline">Pipeline is empty</div>
          <p>Save leads from <Link href="/">Discovery</Link> to start tracking them here.</p>
        </div>
      ) : (
        <>
          {members.length > 1 && (
            <div className="filter-bar">
              <span className="filter-label">View</span>
              <button
                className={`filter-chip${filterBy === null ? ' active' : ''}`}
                onClick={() => setFilterBy(null)}
              >
                All ({leads.length})
              </button>
              {members.map(m => (
                <button
                  key={m.id}
                  className={`filter-chip${filterBy === m.id ? ' active' : ''}${m.id === currentUserId ? ' is-me' : ''}`}
                  onClick={() => setFilterBy(filterBy === m.id ? null : m.id)}
                >
                  {m.id === currentUserId ? 'Me' : (m.name ?? m.email.split('@')[0])}
                  {' '}({leads.filter(l => l.created_by === m.id).length})
                </button>
              ))}
            </div>
          )}
          {selectMode && selectedIds.size > 0 && (
            <div className="delete-bar">
              <span className="delete-bar-count">
                <strong>{selectedIds.size}</strong> lead{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <button className="btn-danger" onClick={deleteSelected} disabled={deleting}>
                <IconTrash size={11} />
                {deleting ? 'Deleting…' : 'Delete selected'}
              </button>
            </div>
          )}
          <div className="board">
            {STAGES.map(stage => (
              <Column
                key={stage}
                stage={stage}
                leads={byStage[stage]}
                onAdvance={advanceLead}
                onSaveNote={saveNote}
                onUpdate={updateLead}
                onViewDetails={setModalLead}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggle={toggleSelect}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </>
      )}

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
          }}
          onClose={() => setModalLead(null)}
        />
      )}
    </>
  );
}
