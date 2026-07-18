import { ReactNode, useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Employee } from '../types';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const nav = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [people, setPeople] = useState<Employee[]>([]);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors relative ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`;

  async function doLogout() {
    setSigningOut(true);
    await new Promise(r => setTimeout(r, 700));
    await logout();
    nav('/login');
  }

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (paletteOpen && people.length === 0) {
      api.get('/employees', { params: { pageSize: 500 } })
        .then(r => {
          const data = r.data;
          const list = Array.isArray(data) ? data : (data?.items ?? data?.employees ?? []);
          setPeople(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    }
    if (paletteOpen) { setQ(''); setIdx(0); }
  }, [paletteOpen]);

  const pages = useMemo(() => {
    const list: { label: string; hint: string; to: string; kind: 'page' }[] = [
      { label: 'Overview', hint: 'Dashboard & metrics', to: '/', kind: 'page' },
      { label: 'People', hint: 'Employee directory', to: '/employees', kind: 'page' },
      { label: 'Profile', hint: 'Your details', to: '/profile', kind: 'page' },
    ];
    if (hasRole('Super Admin', 'HR Manager')) list.push({ label: 'Hierarchy', hint: 'Reporting graph', to: '/organization', kind: 'page' });
    return list;
  }, [hasRole]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtPages = pages.filter(p => !s || p.label.toLowerCase().includes(s) || p.hint.toLowerCase().includes(s));
    const filtPeople = people
      .filter(p => !s || [p.name, p.email, p.department, p.designation, p.role, p.employeeCode].some(x => (x || '').toLowerCase().includes(s)))
      .slice(0, 8);
    return [
      ...filtPages.map(p => ({ id: 'pg-' + p.to, label: p.label, hint: p.hint, action: () => { nav(p.to); setPaletteOpen(false); }, kind: 'Page' })),
      ...filtPeople.map(p => ({ id: 'pp-' + p.id, label: p.name, hint: `${p.designation || p.role} · ${p.department || '—'}`, action: () => { nav('/employees?focus=' + p.id); setPaletteOpen(false); }, kind: 'Person' })),
    ];
  }, [q, pages, people, nav]);

  useEffect(() => { setIdx(0); }, [q]);

  function onPaletteKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); results[idx]?.action(); }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--warm)] flex items-center justify-center text-[#06231b] font-display text-lg italic">m</div>
              <div className="font-display text-2xl leading-none">Meridian</div>
            </div>
            <nav className="flex items-center gap-6">
              <NavLink to="/" end className={linkCls}>Overview</NavLink>
              <NavLink to="/employees" className={linkCls}>People</NavLink>
              {hasRole('Super Admin', 'HR Manager') && (
                <NavLink to="/organization" className={linkCls}>Hierarchy</NavLink>
              )}
              <NavLink to="/profile" className={linkCls}>Profile</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setPaletteOpen(true)} className="chip-mono hover:!text-[var(--text)]">
              <span>Jump…</span>
              <span className="font-mono opacity-70">⌘K</span>
            </button>
            <div className="chip-mono hidden md:inline-flex"><span className="dot" /> session · active</div>
            <div className="text-right hidden sm:block">
              <div className="text-[0.65rem] text-[var(--text-dim)] font-mono tracking-widest">SIGNED IN</div>
              <div className="text-sm">{user?.name} <span className="text-[var(--accent)]">· {user?.role}</span></div>
            </div>
            <button onClick={() => setConfirming(true)} className="btn btn-ghost">Sign out</button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-10">{children}</div>
      </main>
      <footer className="border-t border-[var(--border)]">
        <div className="max-w-[1400px] mx-auto px-6 py-5 text-xs text-[var(--text-dim)] flex justify-between">
          <span>Meridian · Employee Management</span>
          <span className="font-mono">bcrypt · jwt · rbac · ⌘K palette · v1.1</span>
        </div>
      </footer>

      {/* Command Palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm px-4" onClick={() => setPaletteOpen(false)}>
          <div className="card w-full max-w-xl overflow-hidden fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <span className="text-[var(--accent)] font-mono">⌘</span>
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={onPaletteKey}
                placeholder="Jump to a page or find anyone…" className="flex-1 bg-transparent outline-none text-sm" />
              <span className="chip-mono">esc</span>
            </div>
            <div className="max-h-[420px] overflow-auto py-2">
              {results.length === 0 && <div className="px-4 py-6 text-sm text-[var(--text-dim)]">No matches. Try a name, department, role…</div>}
              {results.map((r, i) => (
                <button key={r.id} onMouseEnter={() => setIdx(i)} onClick={r.action}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${i === idx ? 'bg-[var(--surface-2)]' : ''}`}>
                  <span className="w-16 text-[0.6rem] font-mono tracking-widest text-[var(--text-dim)] uppercase">{r.kind}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{r.label}</div>
                    <div className="text-[0.7rem] text-[var(--text-dim)] truncate">{r.hint}</div>
                  </div>
                  {i === idx && <span className="chip-mono">↵</span>}
                </button>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-[var(--border)] text-[0.65rem] font-mono text-[var(--text-dim)] flex gap-4">
              <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="card max-w-sm w-full p-8 relative overflow-hidden fade-up">
            {signingOut ? (
              <div className="text-center py-4">
                <div className="mx-auto w-14 h-14 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-5" />
                <div className="font-display text-2xl">Ending session…</div>
                <div className="text-xs text-[var(--text-dim)] font-mono mt-2">clearing token · invalidating cache</div>
              </div>
            ) : (
              <>
                <div className="text-[0.65rem] font-mono tracking-[0.3em] text-[var(--text-dim)]">CONFIRM · SIGN OUT</div>
                <h2 className="font-display text-3xl mt-2">Leaving already?</h2>
                <p className="text-sm text-[var(--text-muted)] mt-2">Your JWT will be discarded from this device. You'll need to sign back in to return.</p>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setConfirming(false)} className="btn btn-ghost flex-1 justify-center">Stay</button>
                  <button onClick={doLogout} className="btn btn-primary flex-1 justify-center">Sign out →</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
