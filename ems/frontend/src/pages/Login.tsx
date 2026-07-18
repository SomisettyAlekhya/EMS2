import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@ems.local');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try { await login(email, password); nav('/'); }
    catch (e: any) { setErr(e?.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  }

  function quickFill(u: string, p: string) { setEmail(u); setPassword(p); }

  // Password strength (visual only)
  const strength = Math.min(4, Math.floor(password.length / 3) + (/\d/.test(password) ? 1 : 0));

  return (
    <div className="min-h-screen grid md:grid-cols-[1.1fr_1fr]">
      {/* Left — cinematic brand + security mesh */}
      <div className="hidden md:flex flex-col justify-between p-12 border-r border-[var(--border)] relative overflow-hidden">
        {/* Constellation mesh backdrop */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.35]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#d9a54a" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1={`${(i * 73) % 100}%`} y1="0" x2={`${(i * 41 + 20) % 100}%`} y2="100%"
              stroke="url(#lg)" strokeWidth="0.6" className="mesh-line" />
          ))}
          {Array.from({ length: 22 }).map((_, i) => (
            <circle key={i} cx={`${(i * 37) % 100}%`} cy={`${(i * 53) % 100}%`} r="1.4" fill="#34d399" opacity="0.5" />
          ))}
        </svg>

        {/* Ambient gradient blobs */}
        <div className="absolute top-1/4 -right-32 w-[28rem] h-[28rem] rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl drift" />
        <div className="absolute bottom-0 left-1/4 w-[26rem] h-[26rem] rounded-full bg-[var(--warm)] opacity-[0.06] blur-3xl drift" style={{ animationDelay: '2s' }} />

        <div className="flex items-center gap-2 relative z-10">
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--warm)] flex items-center justify-center text-[#06231b] font-display text-xl italic pulse-ring">m</div>
          <div>
            <div className="font-display text-2xl leading-none">Meridian</div>
            <div className="text-[0.65rem] font-mono text-[var(--text-dim)] tracking-widest">EMPLOYEE · MANAGEMENT · SYSTEM</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md fade-up">
          <div className="chip-mono mb-6"><span className="dot" /> secure session · rbac enforced</div>
          <div className="font-display text-6xl leading-[0.95] mb-6 headline-glow">
            The <em className="text-[var(--accent)]">quiet</em> operating system for your people.
          </div>
          <p className="text-[var(--text-muted)] leading-relaxed">
            One place for roles, reporting lines, and the small changes that keep a team moving —
            without the sprawl of a heavier HRIS.
          </p>
        </div>

        {/* Security stack proof panel */}
        <div className="relative z-10 grid grid-cols-2 gap-2 max-w-md fade-up" style={{ animationDelay: '.15s' }}>
          {[
            ['bcrypt', '10 salted rounds', '🔐'],
            ['JWT · HS256', '24h expiry', '🎟'],
            ['RBAC', '3 role tiers', '⚖'],
            ['Audit log', 'every mutation', '📓'],
          ].map(([t, s, ic]) => (
            <div key={t} className="card px-3 py-2.5 flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">{ic}</span>
              <div>
                <div className="text-xs text-[var(--text)] font-medium">{t}</div>
                <div className="text-[0.65rem] text-[var(--text-dim)] font-mono">{s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-8 relative">
        <form onSubmit={submit} className="w-full max-w-md space-y-6 relative z-10 fade-up">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-[0.65rem] uppercase tracking-[0.3em] text-[var(--text-dim)] font-mono">01 · sign in</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <h1 className="font-display text-5xl">Welcome back.</h1>
            <p className="text-sm text-[var(--text-muted)] mt-2">Your session is scoped to your role. Nothing more, nothing less.</p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                <span>Email</span>
                <span className="chip-mono !py-0 !px-1.5 !text-[0.6rem]">required</span>
              </span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input mt-1" autoComplete="email" />
            </label>
            <label className="block">
              <span className="text-xs text-[var(--text-muted)] flex items-center justify-between">
                <span>Password</span>
                <button type="button" onClick={() => setShowPass(s => !s)} className="text-[0.65rem] font-mono text-[var(--text-dim)] hover:text-[var(--accent)] transition">
                  {showPass ? 'hide' : 'show'}
                </button>
              </span>
              <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="input mt-1" autoComplete="current-password" />
              {/* Strength meter */}
              <div className="flex gap-1 mt-2">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
                ))}
              </div>
              <div className="text-[0.65rem] font-mono text-[var(--text-dim)] mt-1">
                sent over TLS · hashed with bcrypt · never stored in plain text
              </div>
            </label>
          </div>

          {err && (
            <div className="text-sm text-[var(--danger)] border border-[var(--danger)]/40 bg-[var(--danger)]/5 rounded-lg px-3 py-2">
              ⚠ {err}
            </div>
          )}

          <button disabled={loading} className="btn btn-primary w-full justify-center relative overflow-hidden">
            {loading && <span className="absolute inset-0 shimmer" />}
            <span className="relative">{loading ? 'Verifying credentials…' : 'Sign in →'}</span>
          </button>

          <div className="card p-4 text-xs space-y-2">
            <div className="text-[var(--text-muted)] uppercase tracking-widest text-[0.65rem] flex items-center justify-between">
              <span>Demo accounts</span>
              <span className="font-mono text-[var(--text-dim)]">click to fill</span>
            </div>
            {[
              { label: 'Super Admin', u: 'admin@ems.local', p: 'admin123', tone: 'var(--accent)' },
              { label: 'HR Manager', u: 'hr@ems.local', p: 'hr123', tone: 'var(--warm)' },
              { label: 'Employee', u: 'employee@ems.local', p: 'employee123', tone: 'var(--text-muted)' },
            ].map(d => (
              <button type="button" key={d.u} onClick={() => quickFill(d.u, d.p)}
                className="w-full flex justify-between items-center py-1.5 px-2 rounded-md hover:bg-[var(--surface-2)] transition-colors group">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.tone }} />
                  <span className="text-[var(--text)]">{d.label}</span>
                </span>
                <span className="font-mono text-[var(--text-dim)] group-hover:text-[var(--text-muted)]">{d.u}</span>
              </button>
            ))}
          </div>

          <div className="text-center text-[0.65rem] font-mono text-[var(--text-dim)] tracking-wider">
            🛡  protected route · unauthorized access is logged
          </div>
        </form>
      </div>
    </div>
  );
}
