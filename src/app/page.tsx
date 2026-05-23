'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer } from '@/components/Map/MapContainer';
import { BottomSheet } from '@/components/UI/BottomSheet';
import { RouteCard } from '@/components/UI/RouteCard';
import { SmartSearch } from '@/components/AIWidget/SmartSearch';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { MOCK_ROUTES, MOCK_STOPS, Route, Stop } from '@/lib/supabase';
import { Sun, SunMoon, Bus, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function Home() {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [theme, setTheme] = useState<'dark' | 'outdoor'>('dark');
  const [activeAlarmStopId, setActiveAlarmStopId] = useState<string | null>(null);

  // Подписка на обновление геопозиций транспорта в реальном времени
  const { vehicles } = useSupabaseRealtime(
    selectedRoute ? selectedRoute.route_short_name : null
  );

  // Регистрация Service Worker для PWA (оффлайн-режим)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[PWA] Service Worker зарегистрирован:', reg.scope))
        .catch((err) => console.error('[PWA] Ошибка регистрации SW:', err));
    }
  }, []);

  // Синхронизация атрибута темы на теге HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Выбор маршрута из списка
  const handleSelectRoute = (route: Route) => {
    setSelectedRoute(route);
    setStops(MOCK_STOPS[route.route_id] || []);
  };

  // Возврат к общему списку маршрутов
  const handleBackToList = () => {
    setSelectedRoute(null);
    setStops([]);
  };

  // Переключение темы (стандартная темная и высококонтрастный Outdoor Mode)
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'outdoor' : 'dark'));
  };

  // Фокусировка на маршруте по результатам ИИ-поиска
  const handleRouteFoundByAI = (routeId: string) => {
    const route = MOCK_ROUTES.find((r) => r.route_id === routeId);
    if (route) {
      handleSelectRoute(route);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden flex flex-col">
      {/* 1. СЛОЙ ИНТЕРАКТИВНОЙ КАРТЫ */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          selectedRoute={selectedRoute}
          stops={stops}
          vehicles={vehicles}
          onSelectStop={(stop) => {
            console.log('Клик по остановке на карте:', stop);
          }}
          activeAlarmStopId={activeAlarmStopId}
        />
      </div>

      {/* 2. ПРЕМИУМ-ИНТЕРФЕЙС ШАПКИ (Glassmorphism Header) */}
      <div className="absolute top-4 left-4 right-4 z-20 max-w-md mx-auto pointer-events-none flex flex-col gap-3">
        <div className="w-full glass-panel p-3 pointer-events-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white shrink-0">
              <Bus className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-[var(--text-primary)] tracking-wide">
                OshAuto
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest uppercase">
                Ош • Мониторинг
              </p>
            </div>
          </div>

          {/* Кнопка переключения Outdoor Mode */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Включить уличный режим (Высокий контраст)' : 'Включить премиум-тему'}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.03)] text-[var(--text-primary)] cursor-pointer transition-all duration-200"
          >
            {theme === 'dark' ? (
              <SunMoon className="w-4 h-4 text-amber-400" />
            ) : (
              <Sun className="w-4 h-4 text-black animate-spin-slow" />
            )}
          </button>
        </div>

        {/* 3. ИНТЕЛЛЕКТУАЛЬНЫЙ ПОИСКОВЫЙ ВИДЖЕТ */}
        {!selectedRoute && (
          <div className="w-full glass-panel p-3 pointer-events-auto">
            <SmartSearch onRouteFound={handleRouteFoundByAI} />
          </div>
        )}
      </div>

      {/* 4. ВЫДВИЖНОЙ BOTTOM SHEET */}
      <BottomSheet
        title={selectedRoute ? `Маршрут ${selectedRoute.route_short_name}` : 'Список маршрутов Оша'}
      >
        {selectedRoute ? (
          /* ДЕТАЛЬНОЕ ОПИСАНИЕ ВЫБРАННОГО МАРШРУТА */
          <div className="flex flex-col gap-4">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] self-start py-1.5 px-3 rounded-lg border border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Назад ко всем маршрутам
            </button>
            
            <RouteCard
              route={selectedRoute}
              stops={stops}
              onSelectStop={(stop) => {
                console.log('Остановка выбрана в шторке:', stop);
              }}
              onUpdateCongestion={(status) => {
                console.log(`Обновление загруженности маршрута ${selectedRoute.route_short_name}:`, status);
              }}
            />
          </div>
        ) : (
          /* ОБЩИЙ СПИСОК ДОСТУПНЫХ МАРШРУТОВ */
          <div className="flex flex-col gap-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1 px-1">
              Выберите направление
            </div>

            {MOCK_ROUTES.map((route) => (
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
                    <span className="text-[10px] text-[var(--text-muted)] font-medium max-w-[240px] truncate">
                      {route.route_desc}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                  ➡️
                </div>
              </div>
            ))}

            {/* Демо-предупреждение */}
            <div className="mt-6 p-3 rounded-lg border border-amber-950/30 bg-amber-950/10 text-amber-500 text-[10px] font-medium leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Приложение запущено в режиме демонстрации. Координаты транспорта симулируются. Для работы в реальном времени примените скрипт <b>schema.sql</b> в консоли Supabase.
              </span>
            </div>
          </div>
        )}
      </BottomSheet>
    </main>
  );
}
