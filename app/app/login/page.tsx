'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg0: #080A11; --bg1: #0C0F1A; --bg2: #111520;
          --t0: #EDE8DC; --t1: #9A9590; --t2: #4A4D62;
          --gold: #C4923C; --gold-l: #D4A24A;
          --b0: #161929; --b1: #1E2135; --rose: #AA5E7C;
          --font-d: 'Cormorant Garamond', Georgia, serif;
          --font-ui: 'DM Sans', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }
        html, body { background: var(--bg0); color: var(--t0); font-family: var(--font-ui); min-height: 100vh; }
        .wrap {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 32px;
        }
        .card {
          width: 100%; max-width: 380px;
          background: var(--bg1); border: 1px solid var(--b1);
          border-radius: 10px; padding: 40px 36px;
        }
        .logo { font-family: var(--font-d); font-size: 28px; font-weight: 500; color: var(--gold); margin-bottom: 4px; }
        .sub { font-size: 12px; font-family: var(--font-mono); color: var(--t2); margin-bottom: 36px; letter-spacing: 0.08em; text-transform: uppercase; }
        .field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; }
        .field label { font-size: 11px; font-family: var(--font-mono); color: var(--t2); letter-spacing: 0.08em; text-transform: uppercase; }
        .field input {
          background: var(--bg2); border: 1px solid var(--b1); color: var(--t0);
          font-size: 14px; font-family: var(--font-ui); padding: 10px 14px;
          border-radius: 6px; outline: none; transition: border-color 0.15s;
        }
        .field input::placeholder { color: var(--t2); }
        .field input:focus { border-color: var(--gold); }
        .btn {
          width: 100%; margin-top: 8px; background: var(--gold); color: #080A11;
          border: none; padding: 11px; border-radius: 6px; font-size: 14px;
          font-weight: 500; cursor: pointer; transition: background 0.15s; font-family: var(--font-ui);
        }
        .btn:hover { background: var(--gold-l); }
        .btn:disabled { opacity: 0.5; cursor: default; }
        .error { margin-top: 14px; background: rgba(170,94,124,0.1); border: 1px solid rgba(170,94,124,0.3); color: var(--rose); padding: 10px 14px; border-radius: 6px; font-size: 12px; font-family: var(--font-mono); }
        .hint { margin-top: 24px; font-size: 11px; color: var(--t2); font-family: var(--font-mono); line-height: 1.6; text-align: center; }
      `}</style>

      <div className="wrap">
        <div className="card">
          <div className="logo">R&amp;R</div>
          <div className="sub">Lead Intelligence — Internal</div>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@rnrcollective.com"
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
            {error && <div className="error">{error}</div>}
          </form>
          <div className="hint">Internal access only. Contact R&amp;R to request access.</div>
        </div>
      </div>
    </>
  );
}
