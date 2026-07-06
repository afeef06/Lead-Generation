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
        .login-bg {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: var(--bg0);
          position: relative;
          overflow: hidden;
        }
        /* Subtle grid texture */
        .login-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(165,0,0,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(165,0,0,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }
        /* Warm glow behind card */
        .login-bg::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 560px;
          height: 560px;
          background: radial-gradient(circle, rgba(165,0,0,0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: rgba(10, 6, 6, 0.8);
          border: 1px solid rgba(165,0,0,0.15);
          border-top: 1px solid rgba(165,0,0,0.3);
          backdrop-filter: blur(24px);
          padding: 52px 48px 44px;
        }
        .login-eyebrow {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--accent-dim);
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .login-eyebrow::before {
          content: '';
          width: 18px;
          height: 1px;
          background: var(--accent-dim);
          flex-shrink: 0;
        }
        .login-wordmark {
          font-family: var(--font-d);
          font-size: 48px;
          font-weight: 500;
          color: var(--t0);
          line-height: 1;
          margin-bottom: 8px;
          letter-spacing: -0.01em;
        }
        .login-wordmark em {
          color: var(--accent-dim);
          font-style: italic;
        }
        .login-sub {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.06em;
          margin-bottom: 40px;
          line-height: 1.6;
        }
        .login-divider {
          height: 1px;
          background: linear-gradient(90deg, rgba(165,0,0,0.35) 0%, rgba(165,0,0,0.04) 100%);
          margin-bottom: 36px;
        }
        .login-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }
        .login-label {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--t2);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .login-input-wrap { position: relative; }
        .login-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--b0);
          color: var(--t0);
          font-size: 14px;
          font-family: var(--font-mono);
          padding: 10px 0;
          outline: none;
          transition: border-color 0.2s;
          letter-spacing: 0.02em;
        }
        .login-input::placeholder { color: var(--t2); }
        .login-input:focus { border-bottom-color: var(--accent-dim); }
        .login-input.has-toggle { padding-right: 32px; }
        .pw-toggle {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--t2);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.15s;
        }
        .pw-toggle:hover { color: var(--t1); }
        .login-btn {
          width: 100%;
          margin-top: 8px;
          background: var(--accent-dim);
          color: var(--on-accent);
          border: none;
          padding: 15px 24px;
          font-size: 11px;
          font-weight: 500;
          font-family: var(--font-mono);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.15s;
        }
        .login-btn:hover:not(:disabled) { background: var(--accent-glow); }
        .login-btn:disabled { opacity: 0.45; cursor: default; }
        .login-error {
          margin-top: 16px;
          background: rgba(248,113,113,0.05);
          border-left: 2px solid rgba(248,113,113,0.45);
          color: var(--error);
          padding: 10px 14px;
          font-size: 11px;
          font-family: var(--font-mono);
          line-height: 1.6;
          letter-spacing: 0.03em;
        }
        .login-footer {
          margin-top: 36px;
          padding-top: 20px;
          border-top: 1px solid var(--b1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .login-footer-text {
          font-size: 9px;
          color: var(--t2);
          font-family: var(--font-mono);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .login-version {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--b0);
          letter-spacing: 0.06em;
        }
      `}</style>

      <div className="login-bg">
        <div className="login-card">
          <div className="login-eyebrow">Internal Access Portal</div>
          <div className="login-wordmark">R&amp;R <em>Intelligence</em></div>
          <div className="login-sub">Lead Intelligence Platform — R&amp;R Collective</div>
          <div className="login-divider" />

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label className="login-label" htmlFor="email">Email Address</label>
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
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                </button>
              </div>
            </div>

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'Authenticating…' : <>Authenticate <IconArrowRight size={12} /></>}
            </button>

            {error && <div className="login-error">{error}</div>}
          </form>

          <div className="login-footer">
            <span className="login-footer-text">Internal access only</span>
            <span className="login-version">v1.0</span>
          </div>
        </div>
      </div>
    </>
  );
}
