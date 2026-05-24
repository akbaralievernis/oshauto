'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapContainer } from '@/components/Map/MapContainer';
import { BottomSheet } from '@/components/UI/BottomSheet';
import { RouteCard } from '@/components/UI/RouteCard';
import { SmartSearch } from '@/components/AIWidget/SmartSearch';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useStore } from '@/store/useStore';
import { Route } from '@/lib/supabase';
import { getAllRoutes, getStopsForRoute } from '@/lib/customRoutes';
import { Sun, SunMoon, ArrowLeft, ShieldAlert, Home } from 'lucide-react';

function MapPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const presetRouteId = params.get('route');

  const {
    selectedRoute,
    setSelectedRoute,
    stops,
    setStops,
    theme,
    setTheme,
    activeAlarmStopId
  } = useStore();

  const [routes, setRoutes] = useState<Route[]>([]);

  // Загрузка маршрутов
  useEffect(() => {
    const update = () => setRoutes(getAllRoutes());
    update();
    window.addEventListener('oshauto:routes-updated', update);
    return () => window.removeEventListener('oshauto:routes-updated', update);
  }, []);

  // Авто-выбор маршрута по query-параметру
  useEffect(() => {
    if (!presetRouteId || routes.length === 0) return;
    const route = routes.find((r) => r.route_id === presetRouteId);
    if (route) {
      setSelectedRoute(route);
      setStops(getStopsForRoute(route.route_id));
    }
  }, [presetRouteId, routes]);

  // Подписка на realtime транспорта
  const { vehicles } = useSupabaseRealtime(
    selectedRoute ? selectedRoute.route_short_name : null
  );

  // Регистрация Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[PWA] SW зарегистрирован:', reg.scope))
        .catch(() => {
          // SW отсутствует — не критично
        });
    }
  }, []);

  // Применение темы
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSelectRoute = (route: Route) => {
    setSelectedRoute(route);
    setStops(getStopsForRoute(route.route_id));
  };

  const handleBackToList = () => {
    setSelectedRoute(null);
    setStops([]);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'outdoor' : 'dark');
  };

  const handleRouteFoundByAI = (routeId: string) => {
    const route = routes.find((r) => r.route_id === routeId);
    if (route) handleSelectRoute(route);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden flex flex-col">
      <div className="absolute inset-0 z-0">
        <MapContainer
          selectedRoute={selectedRoute}
          stops={stops}
          vehicles={vehicles}
          onSelectStop={() => {}}
          activeAlarmStopId={activeAlarmStopId}
        />
      </div>

      {/* Шапка */}
      <div className="absolute top-4 left-4 right-4 z-20 max-w-md mx-auto pointer-events-none flex flex-col gap-3">
        <div className="w-full glass-panel p-3 pointer-events-auto flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4 text-[var(--text-secondary)]" />
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-[var(--text-primary)] tracking-tight leading-none">
                OshAuto
              </span>
              <span className="text-[9px] text-[var(--text-muted)] font-bold tracking-widest uppercase mt-0.5">
                На главную
              </span>
            </div>
          </Link>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Уличный режим (контраст)' : 'Тёмная тема'}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.03)] text-[var(--text-primary)] cursor-pointer transition-all"
          >
            {theme === 'dark' ? (
              <SunMoon className="w-4 h-4 text-amber-400" />
            ) : (
              <Sun className="w-4 h-4 text-black" />
            )}
          </button>
        </div>

        {!selectedRoute && (
          <div className="w-full glass-panel p-3 pointer-events-auto">
            <SmartSearch onRouteFound={handleRouteFoundByAI} />
          </div>
        )}
      </div>

      {/* BottomSheet */}
      <BottomSheet
        title={
          selectedRoute ? `Маршрут ${selectedRoute.route_short_name}` : 'Маршруты Оша'
        }
      >
        {selectedRoute ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] self-start py-1.5 px-3 rounded-lg border border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Назад ко всем маршрутам
            </button>

            <RouteCard route={selectedRoute} stops={stops} />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1 px-1">
              Выберите направление
            </div>

            {routes.map((route) => (
              <div
                key={route.route_id}
                onClick={() => handleSelectRoute(route)}
                className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all duration-200 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 flex items-center justify-center text-sm font-extrabold rounded-lg shrink-0"
                    style={{
                      backgroundColor: `#${route.route_color}`,
                      color: `#${route.route_text_color}`
                    }}
                  >
                    {route.route_short_name}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-light)] transition-colors">
                      {route.route_long_name}
                    </span>
                    {route.route_desc && (
                      <span className="text-[10px] text-[var(--text-muted)] font-medium max-w-[240px] truncate">
                        {route.route_desc}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {routes.length === 0 && (
              <div className="mt-4 p-4 rounded-lg border border-amber-950/30 bg-amber-950/10 text-amber-500 text-xs font-medium leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                Маршруты пока не настроены. Добавьте их в админ-панели.
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </main>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text-muted)] text-sm">
          Загрузка карты...
        </div>
      }
    >
      <MapPageInner />
    </Suspense>
  );
}
