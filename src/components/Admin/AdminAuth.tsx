'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Eye, EyeOff, ArrowRight, ShieldAlert, Bus, ArrowLeft } from 'lucide-react';

const SESSION_KEY = 'oshauto_admin_session_v1';
const SESSION_TTL_HOURS = 8;

const DEFAULT_PASSWORD = 'oshauto2026';

const getAdminPassword = (): string => {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    return process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  }
  return DEFAULT_PASSWORD;
};

const isSessionValid = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data?.at) return false;
    const at = new Date(data.at).getTime();
    const now = Date.now();
    return now - at < SESSION_TTL_HOURS * 3600 * 1000;
  } catch {
    return false;
  }
};

const writeSession = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ at: new Date().toISOString() })
    );
  } catch {}
};

export const logoutAdmin = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {}
};

interface AdminAuthProps {
  children: React.ReactNode;
}

export function AdminAuth({ children }: AdminAuthProps) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    setAuthed(isSessionValid());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (attempts >= 5) {
      setError('Көп жолу туура эмес сыр сөз. Бир аздан кийин кайра аракет кылыңыз.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      if (password === getAdminPassword()) {
        writeSession();
        setAuthed(true);
        setPassword('');
        setAttempts(0);
      } else {
        setAttempts((a) => a + 1);
        setError('Сыр сөз туура эмес. Кайра аракет кылыңыз.');
      }
      setLoading(false);
    }, 400);
  };

  if (authed === null) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text-muted)] text-sm">
        Жүктөлүп жатат...
      </div>
    );
  }

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] relative overflow-hidden">
      {/* фоновые градиенты */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* верхняя навигация */}
      <div className="px-5 sm:px-8 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Башкы бетке
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 pb-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30 mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Админ-панелге кирүү
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Маршрутту башкаруу үчүн сыр сөздү жазыңыз
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 md:p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-xl shadow-2xl"
            style={{ boxShadow: '0 24px 60px var(--shadow-color)' }}
          >
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
              Сыр сөз
            </label>

            <div className="relative flex items-stretch">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                disabled={loading || attempts >= 5}
                className="w-full pl-3.5 pr-12 py-3 text-base rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)] transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!password || loading || attempts >= 5}
              className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Текшерилүүдө...' : 'Кирүү'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

            <div className="mt-5 pt-5 border-t border-[var(--border-color)] flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Bus className="w-4 h-4" />
              </div>
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                <b className="text-[var(--text-primary)]">Көрсөтмө сыр сөз:</b>{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] font-mono text-[var(--text-primary)]">
                  oshauto2026
                </code>
                <div className="mt-1 text-[var(--text-muted)]">
                  Чыныгы долбоордо аны NEXT_PUBLIC_ADMIN_PASSWORD аркылуу өзгөртүңүз.
                </div>
              </div>
            </div>
          </form>

          <div className="text-center mt-4 text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-bold">
            Сессия {SESSION_TTL_HOURS} саат сакталат
          </div>
        </div>
      </div>
    </div>
  );
}
