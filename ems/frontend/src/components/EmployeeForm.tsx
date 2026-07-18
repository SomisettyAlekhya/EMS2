import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Employee } from '../types';

interface Props { initial: Employee | null; onClose: () => void; onSaved: () => void; }
const empty = {
  employeeCode:'', name:'', email:'', password:'', phone:'', department:'', designation:'',
  salary:'', joiningDate:'', status:'Active', role:'Employee', managerId:'', profileImage:'',
};

export default function EmployeeForm({ initial, onClose, onSaved }: Props) {
  const { hasRole } = useAuth();
  const [form, setForm] = useState<any>(empty);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/employees', { params: { pageSize: 100 } }).then(r => setManagers(r.data.data));
    if (initial) setForm({ ...empty, ...initial, salary: initial.salary ?? '', managerId: initial.managerId ?? '', password: '' });
    else setForm(empty);
  }, [initial]);

  const change = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function validate(): string | null {
    if (!form.name?.trim()) return 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email required';
    if (!form.employeeCode?.trim()) return 'Employee ID is required';
    if (!initial && !form.password) return 'Password is required for new employees';
    if (form.phone && !/^[+\-()\d\s]{7,20}$/.test(form.phone)) return 'Phone is invalid';
    if (form.salary !== '' && (Number.isNaN(Number(form.salary)) || Number(form.salary) < 0)) return 'Salary must be non-negative';
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(); if (v) { setErr(v); return; }
    setErr(''); setSaving(true);
    try {
      const payload: any = { ...form };
      if (payload.salary === '') delete payload.salary;
      if (payload.managerId === '') payload.managerId = null;
      if (!payload.password) delete payload.password;
      if (initial) await api.put(`/employees/${initial.id}`, payload);
      else await api.post('/employees', payload);
      onSaved();
    } catch (e: any) { setErr(e?.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <form onSubmit={submit} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto card p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--text-dim)]">{initial ? 'Editing' : 'New record'}</div>
            <h2 className="font-display text-3xl mt-1">{initial ? initial.name : 'Add an employee'}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] text-3xl leading-none hover:text-[var(--text)]">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <F label="Employee ID *"><input value={form.employeeCode} onChange={e => change('employeeCode', e.target.value)} className="input" /></F>
          <F label="Name *"><input value={form.name} onChange={e => change('name', e.target.value)} className="input" /></F>
          <F label="Email *"><input type="email" value={form.email} onChange={e => change('email', e.target.value)} className="input" /></F>
          <F label={initial ? 'Password (blank = keep)' : 'Password *'}>
            <input type="password" value={form.password} onChange={e => change('password', e.target.value)} className="input" />
          </F>
          <F label="Phone"><input value={form.phone || ''} onChange={e => change('phone', e.target.value)} className="input" /></F>
          <F label="Department"><input value={form.department || ''} onChange={e => change('department', e.target.value)} className="input" /></F>
          <F label="Designation"><input value={form.designation || ''} onChange={e => change('designation', e.target.value)} className="input" /></F>
          <F label="Salary"><input type="number" min="0" value={form.salary} onChange={e => change('salary', e.target.value)} className="input" /></F>
          <F label="Joining date"><input type="date" value={form.joiningDate || ''} onChange={e => change('joiningDate', e.target.value)} className="input" /></F>
          <F label="Status">
            <select value={form.status} onChange={e => change('status', e.target.value)} className="input"><option>Active</option><option>Inactive</option></select>
          </F>
          <F label="Role">
            <select value={form.role} onChange={e => change('role', e.target.value)} className="input">
              <option>Employee</option><option>HR Manager</option>
              {hasRole('Super Admin') && <option>Super Admin</option>}
            </select>
          </F>
          <F label="Reporting manager">
            <select value={form.managerId ?? ''} onChange={e => change('managerId', e.target.value)} className="input">
              <option value="">— None —</option>
              {managers.filter(m => !initial || m.id !== initial.id).map(m => <option key={m.id} value={m.id}>{m.name} ({m.employeeCode})</option>)}
            </select>
          </F>
          <div className="md:col-span-2">
            <F label="Profile image URL"><input value={form.profileImage || ''} onChange={e => change('profileImage', e.target.value)} className="input" /></F>
          </div>
        </div>

        {err && <div className="text-[var(--danger)] text-sm mt-4">{err}</div>}

        <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-[var(--border)]">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save employee'}</button>
        </div>
      </form>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs text-[var(--text-muted)] mb-1.5">{label}</span>{children}</label>;
}
