'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { IconArrowRight, IconEye, IconEyeOff } from '../components/icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
        .login-wrap {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background: var(--bg0);
        }
        .login-card {
          width: 100%;
          max-width: 380px;
          background: var(--bg1);
          border: 1px solid var(--b1);
          border-radius: 12px;
          padding: 44px 40px 40px;
        }
        .login-wordmark {
          font-family: var(--font-d);
          font-size: 32px;
          font-weight: 500;
          color: var(--gold);
          line-height: 1;
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }
        .login-sub {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 40px;
        }
        .login-divider {
          height: 1px;
          background: var(--b0);
          margin-bottom: 28px;
        }
        .login-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 18px;
        }
        .login-label {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .login-input-wrap {
          position: relative;
        }
        .login-input {
          width: 100%;
          background: var(--bg2);
          border: 1px solid var(--b1);
          color: var(--t0);
          font-size: 14px;
          font-family: var(--font-ui);
          padding: 11px 14px;
          border-radius: 7px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .login-input::placeholder { color: var(--t2); }
        .login-input:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(196,146,60,0.1);
        }
        .login-input.has-toggle { padding-right: 42px; }
        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--t2);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 2px;
          transition: color 0.15s;
        }
        .pw-toggle:hover { color: var(--t1); }
        .login-btn {
          width: 100%;
          margin-top: 8px;
          background: var(--gold);
          color: #080A11;
          border: none;
          padding: 12px 22px;
          border-radius: 7px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: var(--font-ui);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, opacity 0.15s;
        }
        .login-btn:hover:not(:disabled) { background: var(--gold-l); }
        .login-btn:disabled { opacity: 0.5; cursor: default; }
        .login-error {
          margin-top: 16px;
          background: rgba(170,94,124,0.08);
          border: 1px solid rgba(170,94,124,0.3);
          color: var(--rose);
          padding: 11px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-family: var(--font-mono);
          line-height: 1.5;
        }
        .login-footer {
          margin-top: 28px;
          font-size: 11px;
          color: var(--t2);
          font-family: var(--font-mono);
          text-align: center;
          line-height: 1.6;
        }
      `}</style>

      <div className="login-wrap">
        <div className="login-card">
          <div className="login-wordmark">R&amp;R</div>
          <div className="login-sub">Lead Intelligence — Internal</div>
          <div className="login-divider" />

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label className="login-label" htmlFor="email">Email</label>
              <div className="login-input-wrap">
                <input
                  id="email"
                  className="login-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@rnrcollective.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <input
                  id="password"
                  className={`login-input has-toggle`}
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : <>Sign in <IconArrowRight size={15} /></>}
            </button>

            {error && <div className="login-error">{error}</div>}
          </form>

          <div className="login-footer">
            Internal access only — contact R&amp;R to request access.
          </div>
        </div>
      </div>
    </>
  );
}
