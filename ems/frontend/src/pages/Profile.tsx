import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ phone: '', profileImage: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user) setForm({ phone: user.phone || '', profileImage: user.profileImage || '' });
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      await api.put(`/employees/${user!.id}`, form);
      await refresh();
      setMsg('Profile updated.');
    } catch (e: any) { setErr(e?.response?.data?.error || 'Update failed'); }
  }

  if (!user) return null;
  const initials = user.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--text-dim)]">Profile</div>
        <h1 className="font-display text-5xl mt-2">Your details.</h1>
      </div>

      <div className="card p-8">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--warm)] flex items-center justify-center text-[#06231b] font-display text-2xl">
            {initials}
          </div>
          <div>
            <div className="font-display text-3xl">{user.name}</div>
            <div className="text-sm text-[var(--text-muted)]">{user.designation || user.role} · {user.department || '—'}</div>
          </div>
        </div>

        <div className="divider-hair my-6" />

        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Row label="Employee ID" value={<span className="font-mono">{user.employeeCode}</span>} />
          <Row label="Email" value={user.email} />
          <Row label="Role" value={user.role} />
          <Row label="Status" value={<span className={`pill ${user.status === 'Active' ? 'pill-active' : 'pill-inactive'}`}>{user.status}</span>} />
          <Row label="Joining date" value={user.joiningDate || '—'} />
          <Row label="Phone" value={user.phone || '—'} />
        </dl>
      </div>

      <form onSubmit={save} className="card p-8 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--text-dim)]">Editable</div>
          <h2 className="font-display text-2xl mt-1">Update your contact details</h2>
        </div>
        <label className="block">
          <span className="text-xs text-[var(--text-muted)]">Phone</span>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--text-muted)]">Profile image URL</span>
          <input value={form.profileImage} onChange={e => setForm(f => ({ ...f, profileImage: e.target.value }))} className="input mt-1" />
        </label>
        {msg && <div className="text-[var(--accent)] text-sm">{msg}</div>}
        {err && <div className="text-[var(--danger)] text-sm">{err}</div>}
        <button className="btn btn-primary">Save changes</button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--text-dim)] uppercase tracking-widest">{label}</dt>
      <dd className="mt-1 text-[var(--text)]">{value}</dd>
    </div>
  );
}
