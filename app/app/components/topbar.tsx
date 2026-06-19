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
      <span className="topbar-badge">Lead Intelligence</span>

      <nav className="topbar-nav">
        <Link href="/" className={`topbar-link${path === '/' ? ' active' : ''}`}>
          Discovery
        </Link>
        <Link href="/pipeline" className={`topbar-link${path === '/pipeline' ? ' active' : ''}`}>
          Pipeline
        </Link>
      </nav>

      {children && <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>{children}</div>}

      <div className="topbar-right">
        <button className="btn-ghost" onClick={onSignOut} style={{ gap: 6 }}>
          <IconSignOut size={13} />
          Sign out
        </button>
      </div>
    </header>
  );
}
