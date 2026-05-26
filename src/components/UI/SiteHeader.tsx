'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bus, Settings, Menu, X, Sun, Moon } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface SiteHeaderProps {
  activePath?: 'home' | 'routes' | 'map' | 'contacts' | 'admin';
}

export function SiteHeader({ activePath = 'home' }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useStore();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const link = (key: string, href: string, label: string) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className={`text-sm font-semibold transition-all px-3.5 py-2 rounded-lg ${
        activePath === key
          ? 'text-[var(--text-primary)] bg-[var(--accent-glow)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-all ${
        scrolled
          ? 'bg-[var(--bg-primary)] border-[var(--border-color)] shadow-[0_4px_20px_var(--shadow-color)]'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">
              OshAuto
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest uppercase mt-1">
              Ош транспорту
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {link('home', '/', 'Башкы бет')}
          {link('routes', '/routes', 'Маршруттар')}
          {link('map', '/map', 'Карта')}
          {link('contacts', '/#contacts', 'Байланыш')}
        </nav>

        <div className="flex items-center gap-2">
          {mounted && (
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Жарык тема' : 'Караңгы тема'}
              aria-label="Тема"
              className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            Админ
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] cursor-pointer"
            aria-label="Меню"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--border-color)] px-4 py-3 flex flex-col gap-1 bg-[var(--bg-solid)] animate-fadeIn">
          {link('home', '/', 'Башкы бет')}
          {link('routes', '/routes', 'Маршруттар')}
          {link('map', '/map', 'Карта')}
          {link('contacts', '/#contacts', 'Байланыш')}
          {link('admin', '/admin', 'Админ-панель')}
        </div>
      )}
    </header>
  );
}
