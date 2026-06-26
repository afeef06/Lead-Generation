'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { IconSignOut } from './icons';

type TopbarProps = {
  onSignOut: () => void;
  children?: React.ReactNode;
};

export function Topbar({ onSignOut, children }: TopbarProps) {
  const path = usePathname();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name = (user.user_metadata as { full_name?: string })?.full_name ?? null;
        setDisplayName(name);
        setInputVal(name ?? '');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEditing() {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function saveName() {
    const trimmed = inputVal.trim();
    if (trimmed === (displayName ?? '')) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmed || null },
    });
    if (!error) setDisplayName(trimmed || null);
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') {
      setInputVal(displayName ?? '');
      setEditing(false);
    }
  }

  return (
    <>
      <style>{`
        .topbar-name {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.08em;
          cursor: pointer;
          padding: 3px 0;
          border-bottom: 1px dashed transparent;
          transition: color 0.15s, border-color 0.15s;
          white-space: nowrap;
          user-select: none;
        }
        .topbar-name:hover { color: var(--t1); border-bottom-color: var(--b0); }
        .topbar-name-prompt {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--gold-dim);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.15s;
          white-space: nowrap;
          user-select: none;
        }
        .topbar-name-prompt:hover { opacity: 1; }
        .topbar-name-input {
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--gold-dim);
          color: var(--t0);
          font-size: 10px;
          font-family: var(--font-mono);
          letter-spacing: 0.06em;
          padding: 2px 0;
          outline: none;
          width: 110px;
        }
      `}</style>
      <header className="topbar">
        <span className="topbar-logo">R&amp;R</span>
        <span className="topbar-badge">Intelligence</span>
        <div className="topbar-divider" />

        <nav className="topbar-nav" aria-label="Main navigation">
          <Link href="/" className={`topbar-link${path === '/' ? ' active' : ''}`}>Discovery</Link>
          <Link href="/my-leads" className={`topbar-link${path === '/my-leads' ? ' active' : ''}`}>My Leads</Link>
          <Link href="/find" className={`topbar-link${path === '/find' ? ' active' : ''}`}>Find</Link>
          <Link href="/pipeline" className={`topbar-link${path === '/pipeline' ? ' active' : ''}`}>Pipeline</Link>
          <Link href="/conversion" className={`topbar-link${path === '/conversion' ? ' active' : ''}`}>Conversion</Link>
          <Link href="/costs" className={`topbar-link${path === '/costs' ? ' active' : ''}`}>Costs</Link>
        </nav>

        {children && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>
            {children}
          </div>
        )}

        <div className="topbar-right">
          {editing ? (
            <input
              ref={inputRef}
              className="topbar-name-input"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={handleKeyDown}
              placeholder="Your name"
              disabled={saving}
              aria-label="Set your display name"
            />
          ) : displayName ? (
            <span className="topbar-name" onClick={startEditing} title="Click to edit your name">
              {displayName}
            </span>
          ) : (
            <span className="topbar-name-prompt" onClick={startEditing} title="Set your name so the team knows who found each lead">
              Set name
            </span>
          )}
          <button className="btn-ghost" onClick={onSignOut}>
            <IconSignOut size={12} />
            Sign out
          </button>
        </div>
      </header>
    </>
  );
}
