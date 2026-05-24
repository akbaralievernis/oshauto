'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, MapPin, Bus, Filter } from 'lucide-react';
import { Route } from '@/lib/supabase';
import { getAllRoutes, getStopsForRoute } from '@/lib/customRoutes';
import { SiteHeader } from '@/components/UI/SiteHeader';
import { SiteFooter } from '@/components/UI/SiteFooter';

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    const update = () => setRoutes(getAllRoutes());
    update();
    window.addEventListener('oshauto:routes-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('oshauto:routes-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return routes;
    const q = query.trim().toLowerCase();
    return routes.filter(
      (r) =>
        r.route_short_name.toLowerCase().includes(q) ||
        r.route_long_name.toLowerCase().includes(q) ||
        (r.route_desc || '').toLowerCase().includes(q)
    );
  }, [routes, query]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <SiteHeader activePath="routes" />

      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-10 md:py-14">
        <div className="flex flex-col gap-3 mb-8 max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Городские маршруты
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Маршруты автобусов Оша
          </h1>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">
            Полный список действующих маршрутов с остановками и направлением движения.
          </p>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-md shadow-xl mb-6">
          <Search className="w-5 h-5 ml-3 text-[var(--text-muted)] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по номеру или направлению (например: 105, Сулейман-Тоо)"
            className="flex-1 bg-transparent border-0 outline-none text-sm md:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] py-3"
          />
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)]">
            <Filter className="w-3.5 h-3.5" />
            {filtered.length} / {routes.length}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 rounded-2xl border border-dashed border-[var(--border-color)] text-center text-[var(--text-muted)] text-sm">
            Ничего не найдено. Попробуйте изменить запрос.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <RouteCard key={r.route_id} route={r} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function RouteCard({ route }: { route: Route }) {
  const [stopsCount, setStopsCount] = useState<number>(0);

  useEffect(() => {
    setStopsCount(getStopsForRoute(route.route_id).length);
  }, [route.route_id]);

  return (
    <Link
      href={`/map?route=${encodeURIComponent(route.route_id)}`}
      className="group p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] backdrop-blur-md transition-all flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="px-3 py-2 text-base font-extrabold rounded-xl shrink-0"
          style={{
            backgroundColor: `#${route.route_color}`,
            color: `#${route.route_text_color}`
          }}
        >
          {route.route_short_name}
        </span>
        <Bus className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-light)] transition-colors" />
      </div>

      <div>
        <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug">
          {route.route_long_name}
        </h3>
        {route.route_desc && (
          <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-3 leading-relaxed">
            {route.route_desc}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
          <MapPin className="w-3.5 h-3.5 text-[var(--accent-light)]" />
          {stopsCount} остановок
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-light)] group-hover:translate-x-1 transition-transform">
          На карту <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}
