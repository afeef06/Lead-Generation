'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconSignOut } from './icons';

type TopbarProps = {
  onSignOut: () => void;
  children?: React.ReactNode;
};

export function Topbar({ onSignOut, children }: TopbarProps) {
  const path = usePathname();

  return (
    <header className="topbar">
      <span className="topbar-logo">R&amp;R</span>
      <span className="topbar-badge">Intelligence</span>
      <div className="topbar-divider" />

      <nav className="topbar-nav" aria-label="Main navigation">
        <Link href="/" className={`topbar-link${path === '/' ? ' active' : ''}`}>
          Discovery
        </Link>
        <Link href="/pipeline" className={`topbar-link${path === '/pipeline' ? ' active' : ''}`}>
          Pipeline
        </Link>
        <Link href="/conversion" className={`topbar-link${path === '/conversion' ? ' active' : ''}`}>
          Conversion
        </Link>
      </nav>

      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>
          {children}
        </div>
      )}

      <div className="topbar-right">
        <button className="btn-ghost" onClick={onSignOut}>
          <IconSignOut size={12} />
          Sign out
        </button>
      </div>
    </header>
  );
}
