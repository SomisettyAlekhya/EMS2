import { ReactNode } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

export default function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-lg w-full card p-10 text-center fade-up relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[var(--danger)] opacity-[0.08] blur-3xl" />
          <div className="relative">
            <div className="text-[0.65rem] font-mono tracking-[0.3em] text-[var(--danger)]">403 · ACCESS DENIED</div>
            <h1 className="font-display text-5xl mt-3">Off-limits.</h1>
            <p className="text-[var(--text-muted)] mt-3 leading-relaxed">
              Your role <span className="pill pill-warm">{user.role}</span> does not have clearance for this area.
              This event has been recorded to the audit log.
            </p>
            <div className="mt-6 font-mono text-[0.7rem] text-[var(--text-dim)] border-t border-[var(--border)] pt-4">
              required · {roles?.join(' or ')}
            </div>
            <Link to="/" className="btn btn-primary mt-6 inline-flex">← Back to overview</Link>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
