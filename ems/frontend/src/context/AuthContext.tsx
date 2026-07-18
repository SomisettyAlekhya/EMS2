import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api/client';
import type { Employee, Role } from '../types';

interface AuthCtx {
  user: Employee | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(() => {
    const raw = localStorage.getItem('ems_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ems_token'));

  useEffect(() => {
    if (token && !user) refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('ems_token', data.token);
    localStorage.setItem('ems_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    setToken(null);
    setUser(null);
  }

  async function refresh() {
    const { data } = await api.get('/auth/me');
    setUser(data);
    localStorage.setItem('ems_user', JSON.stringify(data));
  }

  function hasRole(...roles: Role[]) {
    return user ? roles.includes(user.role) : false;
  }

  return <Ctx.Provider value={{ user, token, login, logout, hasRole, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
