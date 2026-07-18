import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Cell as _c } from 'recharts';
import { useAuth } from '../context/AuthContext';

interface Stats {
  total: number; active: number; inactive: number; departments: number;
  perDepartment: { department: string; count: number }[];
  perRole: { role: string; count: number }[];
}

const PIE_COLORS = ['#34d399', '#d9a54a', '#818cf8', '#f472b6', '#60a5fa', '#f87171'];

export default function Dashboard() {
  const { hasRole, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!hasRole('Super Admin', 'HR Manager')) return;
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(e => setErr(e?.response?.data?.error || 'Failed to load stats'));
  }, [hasRole]);

  if (!hasRole('Super Admin', 'HR Manager')) {
    return (
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-[var(--text-dim)]">Welcome</div>
        <h1 className="font-display text-5xl mt-2">Hello, {user?.name?.split(' ')[0]}.</h1>
        <p className="text-[var(--text-muted)] mt-3 leading-relaxed">
          Head to <span className="text-[var(--accent)]">Profile</span> to review and update your personal information.
        </p>
      </div>
    );
  }

  if (err) return <div className="text-[var(--danger)]">{err}</div>;
  if (!stats) return <div className="text-[var(--text-muted)]">Loading…</div>;

  const cards = [
    { label: 'Total headcount', value: stats.total, hint: 'across all statuses', accent: 'text-[var(--text)]' },
    { label: 'Active', value: stats.active, hint: 'currently employed', accent: 'text-[var(--accent)]' },
    { label: 'Inactive', value: stats.inactive, hint: 'off-boarded / paused', accent: 'text-[var(--danger)]' },
    { label: 'Departments', value: stats.departments, hint: 'distinct teams', accent: 'text-[var(--warm)]' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--text-dim)]">Overview</div>
        <h1 className="font-display text-5xl mt-2">Your team at a glance.</h1>
        <p className="text-[var(--text-muted)] mt-2 max-w-xl">
          A live view of headcount, distribution, and reporting structure.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card p-6 card-hover transition-colors">
            <div className="text-xs uppercase tracking-widest text-[var(--text-dim)]">{c.label}</div>
            <div className={`font-display text-6xl mt-3 ${c.accent}`}>{c.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-2">{c.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="card p-6 lg:col-span-3">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <div className="text-xs uppercase tracking-widest text-[var(--text-dim)]">Distribution</div>
              <h2 className="font-display text-2xl mt-1">Headcount by department</h2>
            </div>
            <span className="text-xs font-mono text-[var(--text-dim)]">n = {stats.total}</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={stats.perDepartment} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <XAxis dataKey="department" stroke="#5f6a67" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#5f6a67" tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(52,211,153,0.06)' }} contentStyle={{ background: '#12181a', border: '1px solid #232c2f', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="text-xs uppercase tracking-widest text-[var(--text-dim)]">Composition</div>
          <h2 className="font-display text-2xl mt-1 mb-4">By role</h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.perRole} dataKey="count" nameKey="role" innerRadius={55} outerRadius={90} paddingAngle={4} stroke="none">
                  {stats.perRole.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" formatter={(v) => <span style={{color:'#8a938f', fontSize:12}}>{v}</span>} />
                <Tooltip contentStyle={{ background: '#12181a', border: '1px solid #232c2f', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
