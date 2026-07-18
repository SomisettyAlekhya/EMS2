import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Employee } from '../types';
import EmployeeForm from '../components/EmployeeForm';

export default function Employees() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('Super Admin', 'HR Manager');
  const canDelete = hasRole('Super Admin');

  const [rows, setRows] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'joiningDate'>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try {
      const { data } = await api.get('/employees', { params: { search, department, role, status, sortBy, order, page, pageSize } });
      setRows(data.data); setTotal(data.total);
    } catch (e: any) { setErr(e?.response?.data?.error || 'Failed to load'); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, sortBy, order]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [search, department, role, status]);

  async function onDelete(id: number) {
    if (!confirm('Soft-delete this employee (mark as Inactive)?')) return;
    await api.delete(`/employees/${id}`); load();
  }

  function toggleSort(col: 'name' | 'joiningDate') {
    if (sortBy === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setOrder('asc'); }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const initials = (n: string) => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--text-dim)]">Directory</div>
          <h1 className="font-display text-5xl mt-2">People.</h1>
          <p className="text-[var(--text-muted)] mt-2">{total} {total === 1 ? 'record' : 'records'} — searchable, filterable, sortable.</p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">
            <span>+</span> Add employee
          </button>
        )}
      </div>

      <div className="card p-4 grid md:grid-cols-6 gap-3">
        <input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} className="input md:col-span-2" />
        <input placeholder="Department" value={department} onChange={e => setDepartment(e.target.value)} className="input" />
        <select value={role} onChange={e => setRole(e.target.value)} className="input">
          <option value="">All roles</option>
          <option>Super Admin</option><option>HR Manager</option><option>Employee</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input">
          <option value="">All status</option><option>Active</option><option>Inactive</option>
        </select>
        <button onClick={() => { setSearch(''); setDepartment(''); setRole(''); setStatus(''); }} className="btn btn-ghost justify-center">Clear</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[0.7rem] uppercase tracking-widest text-[var(--text-dim)]">
              <th className="text-left font-medium px-6 py-4">Employee</th>
              <th className="text-left font-medium px-6 py-4">Department</th>
              <th className="text-left font-medium px-6 py-4 cursor-pointer" onClick={() => toggleSort('joiningDate')}>
                Joined {sortBy === 'joiningDate' && <span className="text-[var(--accent)]">{order === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="text-left font-medium px-6 py-4">Role</th>
              <th className="text-left font-medium px-6 py-4">Status</th>
              <th className="text-right font-medium px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`${i !== 0 ? 'border-t border-[var(--border)]' : ''} hover:bg-[var(--surface-2)]/40 transition-colors`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs font-medium text-[var(--text-muted)]">
                      {initials(r.name)}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text)]">{r.name}</div>
                      <div className="text-xs text-[var(--text-dim)] font-mono">{r.employeeCode} · {r.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-[var(--text)]">{r.department || '—'}</div>
                  <div className="text-xs text-[var(--text-dim)]">{r.designation || ''}</div>
                </td>
                <td className="px-6 py-4 text-[var(--text-muted)]">{r.joiningDate || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`pill ${r.role === 'Super Admin' ? 'pill-warm' : 'pill-neutral'}`}>{r.role}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`pill ${r.status === 'Active' ? 'pill-active' : 'pill-inactive'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'Active' ? 'bg-[var(--accent)]' : 'bg-[var(--danger)]'}`} />
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  {canEdit && <button onClick={() => { setEditing(r); setShowForm(true); }} className="text-[var(--accent)] hover:underline text-sm">Edit</button>}
                  {canDelete && <button onClick={() => onDelete(r.id)} className="text-[var(--danger)] hover:underline text-sm">Delete</button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-16 text-center text-[var(--text-muted)]">
                <div className="font-display text-2xl">No matches</div>
                <div className="text-sm mt-1">Try clearing filters or adjusting search.</div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-[var(--text-muted)]">Showing <span className="text-[var(--text)]">{rows.length}</span> of {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-ghost disabled:opacity-40">← Prev</button>
          <div className="px-3 py-1 font-mono text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</div>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-ghost disabled:opacity-40">Next →</button>
        </div>
      </div>

      {err && <div className="text-[var(--danger)]">{err}</div>}

      {showForm && (
        <EmployeeForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}
