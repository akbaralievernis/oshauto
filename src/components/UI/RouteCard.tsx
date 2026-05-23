'use client';

import React, { useState } from 'react';
import { Route, Stop } from '@/lib/supabase';
import { useGeofenceAlarm } from '@/hooks/useGeofenceAlarm';
import { Users, Bell, BellRing, Sparkles, Navigation, Info } from 'lucide-react';
import confetti from 'canvas-confetti';

import { saveOfflineRating } from '@/lib/indexedDb';

interface RouteCardProps {
  route: Route;
  stops: Stop[];
  onSelectStop?: (stop: Stop) => void;
  onUpdateCongestion?: (status: 'empty' | 'normal' | 'crowded') => void;
}

export function RouteCard({ route, stops, onSelectStop, onUpdateCongestion }: RouteCardProps) {
  const [congestion, setCongestion] = useState<'empty' | 'normal' | 'crowded' | null>(null);
  const [karma, setKarma] = useState<number>(0);
  const [floatingKarmas, setFloatingKarmas] = useState<{ id: number; x: number; y: number }[]>([]);
  const [activeAlarmStopId, setActiveAlarmStopId] = useState<string | null>(null);
  
  const { isActive, currentDistance, startAlarm, stopAlarm } = useGeofenceAlarm();

  // Обработка кнопки оценки загруженности
  const handleCongestionClick = async (
    status: 'empty' | 'normal' | 'crowded',
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    setCongestion(status);

    // Проверяем онлайн статус браузера пассажира
    const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;

    if (isOnline) {
      if (onUpdateCongestion) {
        onUpdateCongestion(status);
      }
    } else {
      // Сохраняем в оффлайн очередь IndexedDB
      try {
        await saveOfflineRating({
          id: `rating_${Date.now()}`,
          vehicle_id: 'v1', // Ссылка на головное ТС маршрута
          congestion_status: status,
          timestamp: new Date().toISOString()
        });
        alert('🌐 Вы оффлайн. Оценка сохранена в IndexedDB и будет отправлена при подключении к сети. Нам важен ваш вклад!');
      } catch (err) {
        console.error('Ошибка записи IndexedDB:', err);
      }
    }

    // Начисляем карму локально
    setKarma((prev) => prev + 1);

    // Эффект конфетти на весь экран
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
    });

    // Добавляем летящую анимацию "+1 Карма" над кнопкой
    const rect = e.currentTarget.getBoundingClientRect();
    const newFloat = {
      id: Date.now(),
      x: rect.left + rect.width / 2 - 20,
      y: rect.top - 20
    };
    
    setFloatingKarmas((prev) => [...prev, newFloat]);
    setTimeout(() => {
      setFloatingKarmas((prev) => prev.filter((item) => item.id !== newFloat.id));
    }, 1000);
  };

  // Переключение гео-будильника
  const toggleGeofenceAlarm = (stop: Stop) => {
    if (activeAlarmStopId === stop.stop_id && isActive) {
      stopAlarm();
      setActiveAlarmStopId(null);
    } else {
      setActiveAlarmStopId(stop.stop_id);
      startAlarm({
        stopName: stop.stop_name,
        latitude: stop.stop_lat,
        longitude: stop.stop_lon,
        radiusMeters: 500,
        onArrive: () => {
          setActiveAlarmStopId(null);
          alert(`⏰ Будильник сработал! Вы приехали на остановку "${stop.stop_name}"!`);
        }
      });
    }
  };

  // Возвращает текстовое описание загруженности
  const getCongestionLabel = (status: 'empty' | 'normal' | 'crowded') => {
    switch (status) {
      case 'empty':
        return 'Свободно';
      case 'normal':
        return 'Нормально';
      case 'crowded':
        return 'Толпа';
    }
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Шапка карточки маршрута */}
      <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)]">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 text-base font-extrabold rounded-lg text-center"
              style={{
                backgroundColor: `#${route.route_color}`,
                color: `#${route.route_text_color}`
              }}
            >
              {route.route_short_name}
            </span>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {route.route_long_name}
            </h3>
          </div>
          {route.route_desc && (
            <p className="text-xs text-[var(--text-muted)] flex items-start gap-1 leading-relaxed mt-1">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {route.route_desc}
            </p>
          )}
        </div>
      </div>

      {/* Модуль Геймификации: Оценка загруженности */}
      <div className="flex flex-col gap-2 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
            Оценить загруженность маршрута
          </span>
          <span className="text-xs font-bold text-[#10b981] flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Карма: +{karma}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-1">
          <button
            onClick={(e) => handleCongestionClick('empty', e)}
            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer ${
              congestion === 'empty'
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 font-bold scale-[1.02]'
                : 'border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)]'
            }`}
          >
            🟢 Свободно
          </button>
          <button
            onClick={(e) => handleCongestionClick('normal', e)}
            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer ${
              congestion === 'normal'
                ? 'bg-amber-950/40 border-amber-500 text-amber-400 font-bold scale-[1.02]'
                : 'border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)]'
            }`}
          >
            🟡 Нормально
          </button>
          <button
            onClick={(e) => handleCongestionClick('crowded', e)}
            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer ${
              congestion === 'crowded'
                ? 'bg-rose-950/40 border-rose-500 text-rose-400 font-bold scale-[1.02]'
                : 'border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)]'
            }`}
          >
            🔴 Толпа
          </button>
        </div>
      </div>

      {/* Список остановок с гео-будильниками */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1 px-1">
          Маршрут следования ({stops.length} остановок)
        </span>

        <div className="flex flex-col relative pl-6 pr-1 select-none">
          {/* Вертикальная линия маршрута */}
          <div
            className="absolute left-3 top-3 bottom-3 w-1 opacity-70 rounded-full"
            style={{ backgroundColor: `#${route.route_color}` }}
          />

          {stops.map((stop, idx) => {
            const isAlarmSet = activeAlarmStopId === stop.stop_id;
            
            return (
              <div
                key={stop.stop_id}
                className="flex items-center justify-between py-2.5 relative group border-b border-[var(--border-color)] last:border-b-0"
              >
                {/* Кружок остановки на линии */}
                <div
                  onClick={() => onSelectStop && onSelectStop(stop)}
                  className="absolute -left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-[var(--background)] cursor-pointer transition-transform duration-200 hover:scale-130"
                  style={{ backgroundColor: `#${route.route_color}` }}
                />

                <div className="flex flex-col gap-0.5">
                  <span
                    onClick={() => onSelectStop && onSelectStop(stop)}
                    className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent-light)] cursor-pointer transition-colors"
                  >
                    {stop.stop_name}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <Navigation className="w-2.5 h-2.5" />
                    {stop.stop_lat.toFixed(5)}, {stop.stop_lon.toFixed(5)}
                  </span>
                </div>

                {/* Кнопка гео-будильника */}
                <button
                  onClick={() => toggleGeofenceAlarm(stop)}
                  title="Установить гео-будильник на эту остановку"
                  className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                    isAlarmSet && isActive
                      ? 'bg-rose-950/40 border-rose-500 text-rose-400 font-bold scale-[1.05]'
                      : 'border-transparent hover:border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isAlarmSet && isActive ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] animate-pulse">
                        {currentDistance ? `${currentDistance}м` : 'Будильник'}
                      </span>
                      <BellRing className="w-4 h-4 animate-bounce text-rose-400" />
                    </div>
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Отрендерить летящие баллы кармы */}
      {floatingKarmas.map((item) => (
        <span
          key={item.id}
          className="karma-float-anim"
          style={{ left: item.x, top: item.y }}
        >
          +1 Карма
        </span>
      ))}
    </div>
  );
}
