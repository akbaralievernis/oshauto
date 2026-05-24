'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bus, Settings, Menu, X } from 'lucide-react';

interface SiteHeaderProps {
  activePath?: 'home' | 'routes' | 'map' | 'contacts' | 'admin';
}

export function SiteHeader({ activePath = 'home' }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  const link = (key: string, href: string, label: string) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className={`text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
        activePath === key
          ? 'text-[var(--text-primary)] bg-[rgba(59,130,246,0.1)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[rgba(13,13,18,0.75)] border-b border-[var(--border-color)]">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold leading-none tracking-tight text-[var(--text-primary)]">
              OshAuto
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest uppercase">
              Транспорт Оша
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {link('home', '/', 'Главная')}
          {link('routes', '/routes', 'Маршруты')}
          {link('map', '/map', 'Карта')}
          {link('contacts', '/#contacts', 'Контакты')}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all"
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
        <div className="md:hidden border-t border-[var(--border-color)] px-3 py-2 flex flex-col gap-1 bg-[var(--bg-solid)]">
          {link('home', '/', 'Главная')}
          {link('routes', '/routes', 'Маршруты')}
          {link('map', '/map', 'Карта')}
          {link('contacts', '/#contacts', 'Контакты')}
          {link('admin', '/admin', 'Админ-панель')}
        </div>
      )}
    </header>
  );
}
