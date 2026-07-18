import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { TreeNode, Employee } from '../types';

// ---------- helpers ----------
function flatten(nodes: TreeNode[], parentId: number | null = null, out: (Employee & { parentId: number | null; depth: number })[] = [], depth = 0) {
  nodes.forEach(n => { out.push({ ...n, parentId, depth }); flatten(n.children, n.id, out, depth + 1); });
  return out;
}
function countAll(nodes: TreeNode[]): number { return nodes.reduce((a, n) => a + 1 + countAll(n.children), 0); }
function maxDepth(nodes: TreeNode[], d = 1): number { return nodes.length ? Math.max(...nodes.map(n => maxDepth(n.children, d + 1))) : d - 1; }
function departments(nodes: TreeNode[], s = new Set<string>()): Set<string> { nodes.forEach(n => { if (n.department) s.add(n.department); departments(n.children, s); }); return s; }
function pathTo(nodes: TreeNode[], id: number, trail: TreeNode[] = []): TreeNode[] | null {
  for (const n of nodes) {
    const t = [...trail, n];
    if (n.id === id) return t;
    const r = pathTo(n.children, id, t);
    if (r) return r;
  }
  return null;
}
function directReports(nodes: TreeNode[], id: number): TreeNode[] | null {
  for (const n of nodes) { if (n.id === id) return n.children; const r = directReports(n.children, id); if (r) return r; }
  return null;
}
function commonManager(nodes: TreeNode[], a: number, b: number): TreeNode | null {
  const pa = pathTo(nodes, a); const pb = pathTo(nodes, b);
  if (!pa || !pb) return null;
  let common: TreeNode | null = null;
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) if (pa[i].id === pb[i].id) common = pa[i]; else break;
  return common;
}
const deptColor = (dept?: string | null) => {
  const palette = ['#34d399', '#d9a54a', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee', '#f87171'];
  if (!dept) return '#8a938f';
  let h = 0; for (const c of dept) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
};
const initialsOf = (n: string) => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

// ---------- Tree view ----------
function TreeNodeRow({ node, depth = 0, onSelect, selectedId, matches }: { node: TreeNode; depth?: number; onSelect: (id: number) => void; selectedId: number | null; matches: Set<number>; }) {
  const [open, setOpen] = useState(true);
  const color = deptColor(node.department);
  const isMatch = matches.has(node.id);
  const isSel = selectedId === node.id;
  return (
    <li className="mt-2 fade-up">
      <div
        onClick={() => onSelect(node.id)}
        className={`inline-flex items-center gap-3 card px-4 py-3 min-w-[320px] card-hover relative cursor-pointer transition-all ${isSel ? 'ring-2 ring-[var(--accent)]' : ''} ${isMatch ? '' : matches.size ? 'opacity-40' : ''}`}
        style={isSel ? { boxShadow: `0 0 0 1px ${color}, 0 10px 40px -20px ${color}` } : {}}
      >
        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ background: color, opacity: 0.85 }} />
        {node.children.length > 0 ? (
          <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }} className="text-[var(--text-muted)] hover:text-[var(--accent)] w-5 h-5 flex items-center justify-center text-xs rounded border border-[var(--border)]">
            {open ? '−' : '+'}
          </button>
        ) : <span className="w-5" />}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[0.72rem] font-medium" style={{ background: 'var(--surface-2)', border: `1px solid ${color}`, color }}>
          {initialsOf(node.name)}
        </div>
        <div className="pr-2">
          <div className="font-medium text-[var(--text)] leading-tight">{node.name}</div>
          <div className="text-xs text-[var(--text-dim)] mt-0.5">{node.designation || node.role} · {node.department || '—'}</div>
        </div>
        <div className="ml-auto pl-4 flex items-center gap-2">
          {node.children.length > 0 && <span className="chip-mono !text-[0.6rem]">{countAll(node.children)} report{countAll(node.children) === 1 ? '' : 's'}</span>}
          <span className={`pill ${node.status === 'Active' ? 'pill-active' : 'pill-inactive'}`}>{node.status}</span>
        </div>
      </div>
      {open && node.children.length > 0 && (
        <ul className="ml-7 mt-1 pl-6 border-l border-dashed border-[var(--border-strong)]">
          {node.children.map(c => <TreeNodeRow key={c.id} node={c} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} matches={matches} />)}
        </ul>
      )}
    </li>
  );
}

// ---------- Constellation (radial) view ----------
function Constellation({ tree, onSelect, selectedId, matches }: { tree: TreeNode[]; onSelect: (id: number) => void; selectedId: number | null; matches: Set<number>; }) {
  const size = 720;
  const cx = size / 2, cy = size / 2;
  const depth = Math.max(1, maxDepth(tree));
  const ringStep = Math.min(140, (size / 2 - 60) / depth);

  type Placed = { node: TreeNode; x: number; y: number; parent?: Placed };
  const placed: Placed[] = [];
  const edges: { a: Placed; b: Placed }[] = [];

  // root(s) at center; if multiple roots, arrange them around center
  const roots = tree;
  roots.forEach((r, i) => {
    const a = (i / roots.length) * Math.PI * 2 - Math.PI / 2;
    const rad = roots.length === 1 ? 0 : 60;
    placed.push({ node: r, x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
  });

  function layout(parent: Placed, arcStart: number, arcEnd: number, ring: number) {
    const kids = parent.node.children;
    if (!kids.length) return;
    kids.forEach((k, i) => {
      const t = kids.length === 1 ? (arcStart + arcEnd) / 2 : arcStart + (i / (kids.length - 1)) * (arcEnd - arcStart);
      const r = ring * ringStep + 60;
      const x = cx + Math.cos(t) * r;
      const y = cy + Math.sin(t) * r;
      const p: Placed = { node: k, x, y, parent };
      placed.push(p);
      edges.push({ a: parent, b: p });
      // sub-arc
      const span = (arcEnd - arcStart) / Math.max(1, kids.length);
      layout(p, t - span / 2, t + span / 2, ring + 1);
    });
  }

  roots.forEach((_r, i) => {
    const arc = (Math.PI * 2) / roots.length;
    const start = i * arc - Math.PI / 2 - arc / 2;
    layout(placed[i], start, start + arc, 1);
  });

  const dim = matches.size > 0;

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute top-4 left-4 chip-mono z-10"><span className="dot" /> constellation view · click to inspect</div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={size / 2 - 20} fill="url(#core)" />
        {/* orbit rings */}
        {Array.from({ length: depth }).map((_, i) => (
          <circle key={i} cx={cx} cy={cy} r={(i + 1) * ringStep + 30} fill="none" stroke="#232c2f" strokeDasharray="2 6" />
        ))}
        {/* edges */}
        {edges.map((e, i) => {
          const active = selectedId != null && (pathHasEdge(e, selectedId, placed));
          return <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
            stroke={active ? '#34d399' : '#2f3a3e'} strokeWidth={active ? 1.6 : 0.8} opacity={active ? 1 : (dim ? 0.15 : 0.6)} />;
        })}
        {/* nodes */}
        {placed.map(p => {
          const c = deptColor(p.node.department);
          const isSel = selectedId === p.node.id;
          const isMatch = matches.has(p.node.id);
          const alpha = matches.size ? (isMatch ? 1 : 0.18) : 1;
          const r = isSel ? 16 : (p.parent ? 10 : 18);
          return (
            <g key={p.node.id} onClick={() => onSelect(p.node.id)} style={{ cursor: 'pointer', opacity: alpha }}>
              {isSel && <circle cx={p.x} cy={p.y} r={r + 8} fill="none" stroke={c} strokeOpacity="0.5" />}
              <circle cx={p.x} cy={p.y} r={r} fill="#12181a" stroke={c} strokeWidth={isSel ? 2 : 1.2} />
              <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fill={c}>{initialsOf(p.node.name)}</text>
              <text x={p.x} y={p.y + r + 12} textAnchor="middle" fontSize="9" fill="#8a938f">{p.node.name.split(' ')[0]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
function pathHasEdge(e: { a: { node: TreeNode }; b: { node: TreeNode } }, selectedId: number, placed: { node: TreeNode; parent?: any }[]): boolean {
  // Walk up from selected node; mark edges on chain
  const map = new Map(placed.map(p => [p.node.id, p]));
  let cur = map.get(selectedId);
  while (cur?.parent) {
    if (cur.parent.node.id === e.a.node.id && cur.node.id === e.b.node.id) return true;
    cur = cur.parent;
  }
  return false;
}

// ---------- Departments view ----------
function Departments({ tree, onSelect, selectedId, matches }: { tree: TreeNode[]; onSelect: (id: number) => void; selectedId: number | null; matches: Set<number>; }) {
  const flat = flatten(tree);
  const groups = new Map<string, typeof flat>();
  flat.forEach(e => { const k = e.department || 'Unassigned'; if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(e); });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...groups.entries()].sort((a, b) => b[1].length - a[1].length).map(([dept, people]) => {
        const c = deptColor(dept);
        return (
          <div key={dept} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                <div className="font-display text-xl">{dept}</div>
              </div>
              <div className="chip-mono">{people.length} · {people.filter(p => p.status === 'Active').length} active</div>
            </div>
            <div className="space-y-1.5">
              {people.map(p => {
                const isSel = selectedId === p.id;
                const dim = matches.size && !matches.has(p.id);
                return (
                  <button key={p.id} onClick={() => onSelect(p.id)}
                    className={`w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg transition ${isSel ? 'bg-[var(--surface-2)] ring-1 ring-[var(--accent)]' : 'hover:bg-[var(--surface-2)]'} ${dim ? 'opacity-30' : ''}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.65rem]" style={{ border: `1px solid ${c}`, color: c }}>{initialsOf(p.name)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{p.name}</div>
                      <div className="text-[0.7rem] text-[var(--text-dim)] truncate">{p.designation || p.role}</div>
                    </div>
                    <span className={`pill ${p.status === 'Active' ? 'pill-active' : 'pill-inactive'} !text-[0.6rem]`}>{p.status[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Detail rail ----------
function DetailRail({ tree, id, onClear, onSelect }: { tree: TreeNode[]; id: number; onClear: () => void; onSelect: (id: number) => void; }) {
  const chain = pathTo(tree, id) || [];
  const self = chain[chain.length - 1];
  const reports = directReports(tree, id) || [];
  if (!self) return null;
  const c = deptColor(self.department);
  const totalUnder = countAll(reports);

  return (
    <aside className="card p-5 sticky top-24 fade-up">
      <div className="flex items-start justify-between">
        <div className="chip-mono"><span className="dot" /> inspecting</div>
        <button onClick={onClear} className="text-[var(--text-dim)] hover:text-[var(--text)] text-xs">clear ×</button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium" style={{ border: `1px solid ${c}`, color: c }}>{initialsOf(self.name)}</div>
        <div>
          <div className="font-display text-2xl leading-tight">{self.name}</div>
          <div className="text-xs text-[var(--text-dim)]">{self.designation || self.role} · <span style={{ color: c }}>{self.department || '—'}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-5">
        <Stat label="Depth" v={chain.length} />
        <Stat label="Direct" v={reports.length} />
        <Stat label="Under" v={totalUnder} />
      </div>

      <div className="mt-5">
        <div className="text-[0.65rem] font-mono tracking-widest text-[var(--text-dim)] uppercase mb-2">Chain of command</div>
        <ol className="space-y-1">
          {chain.map((n, i) => (
            <li key={n.id}>
              <button onClick={() => onSelect(n.id)} className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[var(--surface-2)] ${n.id === id ? 'bg-[var(--surface-2)] text-[var(--accent)]' : ''}`}>
                <span className="font-mono text-[0.65rem] text-[var(--text-dim)]">{String(i + 1).padStart(2, '0')}</span>
                <span className="truncate">{n.name}</span>
                <span className="ml-auto text-[0.65rem] text-[var(--text-dim)]">{n.designation || n.role}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {reports.length > 0 && (
        <div className="mt-5">
          <div className="text-[0.65rem] font-mono tracking-widest text-[var(--text-dim)] uppercase mb-2">Direct reports · {reports.length}</div>
          <div className="flex flex-wrap gap-1.5">
            {reports.map(r => (
              <button key={r.id} onClick={() => onSelect(r.id)} className="chip-mono hover:!text-[var(--text)]">
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
function Stat({ label, v }: { label: string; v: number }) {
  return <div className="rounded-lg bg-[var(--surface-2)] border border-[var(--border)] p-2">
    <div className="text-[0.6rem] font-mono tracking-widest text-[var(--text-dim)] uppercase">{label}</div>
    <div className="font-display text-2xl mt-0.5">{v}</div>
  </div>;
}

// ---------- Common Manager finder ----------
function PathFinder({ tree }: { tree: TreeNode[] }) {
  const flat = useMemo(() => flatten(tree), [tree]);
  const [a, setA] = useState<number | ''>('');
  const [b, setB] = useState<number | ''>('');
  const result = (a && b && a !== b) ? commonManager(tree, +a, +b) : null;
  const chainA = a ? pathTo(tree, +a) : null;
  const chainB = b ? pathTo(tree, +b) : null;
  const distance = (chainA && chainB && result) ?
    (chainA.length - 1 - chainA.findIndex(n => n.id === result.id)) + (chainB.length - 1 - chainB.findIndex(n => n.id === result.id)) : null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[0.65rem] font-mono tracking-widest text-[var(--text-dim)] uppercase">Path finder</div>
          <div className="font-display text-xl mt-0.5">Common manager · shortest bridge</div>
        </div>
        <span className="chip-mono">lowest common ancestor</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select className="input" value={a} onChange={e => setA(e.target.value ? +e.target.value : '')}>
          <option value="">Person A</option>
          {flat.map(p => <option key={p.id} value={p.id}>{p.name} · {p.designation || p.role}</option>)}
        </select>
        <select className="input" value={b} onChange={e => setB(e.target.value ? +e.target.value : '')}>
          <option value="">Person B</option>
          {flat.map(p => <option key={p.id} value={p.id}>{p.name} · {p.designation || p.role}</option>)}
        </select>
      </div>
      {result && (
        <div className="mt-4 p-4 rounded-lg border border-dashed border-[var(--accent)] bg-[var(--accent-soft)]">
          <div className="text-xs text-[var(--text-muted)]">Shared manager</div>
          <div className="font-display text-2xl text-[var(--accent)]">{result.name}</div>
          <div className="text-xs text-[var(--text-dim)] mt-1">{result.designation || result.role} · {result.department || '—'} · escalation distance <span className="font-mono text-[var(--text)]">{distance}</span> hops</div>
        </div>
      )}
      {a && b && a === b && <div className="text-xs text-[var(--text-dim)] mt-3">Pick two different people.</div>}
    </div>
  );
}

// ---------- main page ----------
export default function Organization() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [err, setErr] = useState('');
  const [view, setView] = useState<'constellation' | 'tree' | 'departments'>('constellation');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => { api.get('/organization/tree').then(r => setTree(r.data)).catch(e => setErr(e?.response?.data?.error || 'Failed to load')); }, []);

  const flat = useMemo(() => flatten(tree), [tree]);
  const stats = useMemo(() => {
    const withReports = flat.filter(p => flat.some(o => o.parentId === p.id));
    const spans = withReports.map(p => flat.filter(o => o.parentId === p.id).length);
    const avgSpan = spans.length ? (spans.reduce((a, b) => a + b, 0) / spans.length) : 0;
    const largest = spans.length ? Math.max(...spans) : 0;
    return {
      total: countAll(tree),
      depth: maxDepth(tree),
      depts: departments(tree).size,
      managers: withReports.length,
      avgSpan: Math.round(avgSpan * 10) / 10,
      largest,
    };
  }, [tree, flat]);

  const matches = useMemo(() => {
    if (!q.trim()) return new Set<number>();
    const s = q.toLowerCase();
    const hits = new Set<number>();
    flat.forEach(p => {
      if ([p.name, p.email, p.department, p.designation, p.role, p.employeeCode].some(x => (x || '').toLowerCase().includes(s))) {
        const chain = pathTo(tree, p.id) || [];
        chain.forEach(n => hits.add(n.id));
      }
    });
    return hits;
  }, [q, flat, tree]);

  function exportJSON() {
    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'meridian-hierarchy.json'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      {/* Head */}
      <div className="relative card overflow-hidden p-10">
        <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="og" x1="0" x2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#d9a54a" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={i} x1={`${i * 10}%`} y1="0" x2={`${(i * 18 + 5) % 100}%`} y2="100%" stroke="url(#og)" strokeWidth="0.5" className="mesh-line" />
          ))}
          {Array.from({ length: 26 }).map((_, i) => (
            <circle key={i} cx={`${(i * 43) % 100}%`} cy={`${(i * 29) % 100}%`} r={i % 5 === 0 ? 2.2 : 1.2} fill={i % 3 === 0 ? '#d9a54a' : '#34d399'} opacity={0.55} />
          ))}
        </svg>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[var(--accent)] opacity-[0.08] blur-3xl drift" />

        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="chip-mono mb-4"><span className="dot" /> live directory · reporting graph</div>
            <div className="text-xs uppercase tracking-[0.3em] text-[var(--text-dim)] font-mono">Hierarchy · 02 — cartography of authority</div>
            <h1 className="font-display text-6xl mt-2 headline-glow">
              A map of <em className="text-[var(--accent)]">who reports</em>
              <br />to whom, drawn honestly.
            </h1>
            <p className="text-[var(--text-muted)] mt-3 max-w-lg">
              Three ways to read the same truth — orbits, ladders, or guilds.
              Search anyone; the chain lights up. Click a node to inspect their line of command and the trail below them.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 md:min-w-[360px]">
            {[
              ['People', stats.total],
              ['Depth', stats.depth],
              ['Depts', stats.depts],
              ['Managers', stats.managers],
              ['Avg span', stats.avgSpan],
              ['Largest', stats.largest],
            ].map(([l, v]) => (
              <div key={l as string} className="card !bg-[var(--surface-2)] p-3">
                <div className="text-[0.6rem] font-mono tracking-widest text-[var(--text-dim)] uppercase">{l}</div>
                <div className="font-display text-2xl mt-1">{v as number}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {err && <div className="text-[var(--danger)]">{err}</div>}

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="inline-flex rounded-xl border border-[var(--border)] p-1 bg-[var(--surface)]">
          {(['constellation', 'tree', 'departments'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-lg text-sm capitalize transition ${view === v ? 'bg-[var(--surface-2)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>{v}</button>
          ))}
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, dept, role, code…" className="input md:max-w-sm" />
        <div className="chip-mono">{matches.size ? `${matches.size} in path` : `${stats.total} total`}</div>
        <div className="md:ml-auto flex gap-2">
          <button onClick={exportJSON} className="btn btn-ghost">Export JSON</button>
        </div>
      </div>

      {/* Body: view + rail */}
      <div className={`grid gap-6 ${selectedId ? 'lg:grid-cols-[1fr_360px]' : 'grid-cols-1'}`}>
        <div className="min-w-0">
          {view === 'constellation' && <Constellation tree={tree} onSelect={setSelectedId} selectedId={selectedId} matches={matches} />}
          {view === 'tree' && <ul>{tree.map(t => <TreeNodeRow key={t.id} node={t} onSelect={setSelectedId} selectedId={selectedId} matches={matches} />)}</ul>}
          {view === 'departments' && <Departments tree={tree} onSelect={setSelectedId} selectedId={selectedId} matches={matches} />}
        </div>
        {selectedId && <DetailRail tree={tree} id={selectedId} onClear={() => setSelectedId(null)} onSelect={setSelectedId} />}
      </div>

      {/* Path finder */}
      <PathFinder tree={tree} />
    </div>
  );
}
