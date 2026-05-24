'use client';

import React from 'react';
import Link from 'next/link';
import { Bus, Phone, Mail, MapPin } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-solid)] mt-16">
      <div className="max-w-6xl mx-auto px-5 py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-extrabold text-[var(--text-primary)]">
              OshAuto
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Современный сервис мониторинга городского транспорта Оша.
            Маршруты, остановки, расписание и онлайн-карта в одном месте.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)] mb-1">
            Разделы
          </h4>
          <Link href="/" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Главная
          </Link>
          <Link href="/routes" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Маршруты
          </Link>
          <Link href="/map" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Карта
          </Link>
          <Link href="/admin" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Админ-панель
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)] mb-1">
            Помощь
          </h4>
          <Link href="/#faq" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Частые вопросы
          </Link>
          <Link href="/#feedback" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Обратная связь
          </Link>
          <Link href="/#about" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            О проекте
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)] mb-1">
            Контакты
          </h4>
          <div className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--accent)]" />
            г. Ош, Кыргызстан
          </div>
          <a href="tel:+996770000000" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-start gap-2">
            <Phone className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--accent)]" />
            +996 (770) 00-00-00
          </a>
          <a href="mailto:info@oshauto.kg" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-start gap-2">
            <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--accent)]" />
            info@oshauto.kg
          </a>
        </div>
      </div>

      <div className="border-t border-[var(--border-color)] px-5 py-4 text-center text-[10px] text-[var(--text-muted)] tracking-wider">
        © {new Date().getFullYear()} OshAuto. Сделано для жителей города Ош.
      </div>
    </footer>
  );
}
