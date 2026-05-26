'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MOCK_ROUTES } from '@/lib/supabase';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import {
  Navigation,
  Play,
  Square,
  ArrowLeft,
  Users,
  Compass,
  Gauge
} from 'lucide-react';
import Link from 'next/link';

export default function DriverDashboard() {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('105');
  const [vehicleId, setVehicleId] = useState<string>('v1');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [bearing, setBearing] = useState<number>(0);
  const [congestion, setCongestion] = useState<'empty' | 'normal' | 'crowded'>('normal');

  const watchIdRef = useRef<number | null>(null);

  // Используем хук реального времени для обновления координат
  const { updateDriverPosition } = useSupabaseRealtime(null);

  // Выбираем соответствующий объект маршрута
  const activeRoute = MOCK_ROUTES.find((r) => r.route_id === selectedRouteId) || MOCK_ROUTES[0];

  // Сброс вотчера при размонтировании
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Переключение смены (GPS вещания)
  const toggleShift = async () => {
    if (isActive) {
      // Завершаем смену
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsActive(false);
      setCurrentCoords(null);
      setSpeed(0);
      setBearing(0);
    } else {
      // Проверяем геолокацию
      if (!('geolocation' in navigator)) {
        alert('Геолокация сиздин түзмөктө колдоого алынбайт!');
        return;
      }

      setIsActive(true);

      // Запускаем отслеживание координат с наивысшей точностью
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, speed: gpsSpeed, heading } = position.coords;
          
          const currentLat = latitude;
          const currentLon = longitude;
          
          setCurrentCoords({ lat: currentLat, lon: currentLon });
          setSpeed(Math.round((gpsSpeed || 0) * 3.6)); // м/с в км/ч
          setBearing(Math.round(heading || 0));

          // Отправка координат в Supabase DB или обновление в локальном симуляторе
          await updateDriverPosition(
            vehicleId,
            currentLat,
            currentLon,
            congestion
          );
        },
        (error) => {
          console.error('Ошибка отслеживания GPS:', error);
          alert('GPS-ке кирүү катасы. Браузер жөндөөлөрүндө геолокация күйгүзүлгөнүн текшериңиз.');
          toggleShift(); // Выключаем смену
        },
        {
          enableHighAccuracy: true, // Максимальная точность GPS
          timeout: 8000,
          maximumAge: 0
        }
      );
    }
  };

  // Обновление загруженности водителем в реальном времени
  const handleCongestionChange = async (status: 'empty' | 'normal' | 'crowded') => {
    setCongestion(status);
    if (isActive && currentCoords) {
      await updateDriverPosition(
        vehicleId,
        currentCoords.lat,
        currentCoords.lon,
        status
      );
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0d0d12] text-[#f3f4f6] font-sans select-none">
      {/* Шапка дашборда */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[#12121a] flex items-center justify-between z-10">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Башкы бетке
        </Link>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)]">
            {isActive ? 'Смена активдүү' : 'Смена жабык'}
          </span>
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 overflow-y-auto p-5 max-w-md mx-auto w-full flex flex-col gap-5 justify-center">
        {/* Карточка статуса маршрута */}
        <div className="glass-panel p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--text-primary)]">
              Айдоочунун Консолу
            </h2>
            <span
              className="px-2.5 py-1 text-xs font-black rounded-lg"
              style={{
                backgroundColor: `#${activeRoute.route_color}`,
                color: `#${activeRoute.route_text_color}`
              }}
            >
              {activeRoute.route_short_name}
            </span>
          </div>

          {/* Выбор параметров перед сменой */}
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Маршрутуңузду тандаңыз
              </label>
              <select
                disabled={isActive}
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)] cursor-pointer disabled:opacity-50"
              >
                {MOCK_ROUTES.map((r) => (
                  <option key={r.route_id} value={r.route_id} className="bg-[#12121a] text-white">
                    Маршрут {r.route_short_name} ({r.route_long_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Унаанын ID (vehicle_id)
              </label>
              <select
                disabled={isActive}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)] cursor-pointer disabled:opacity-50"
              >
                <option value="v1" className="bg-[#12121a] text-white">Унаа 1 (v1)</option>
                <option value="v2" className="bg-[#12121a] text-white">Унаа 2 (v2)</option>
                <option value="v3" className="bg-[#12121a] text-white">Унаа 3 (v3)</option>
                <option value="v4" className="bg-[#12121a] text-white">Унаа 4 (v4)</option>
              </select>
            </div>
          </div>
        </div>

        {/* HUD Показатели датчиков GPS */}
        {isActive && (
          <div className="grid grid-cols-2 gap-4">
            {/* Скорость */}
            <div className="glass-panel p-4 flex flex-col items-center gap-1 text-center">
              <Gauge className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                GPS ылдамдыгы
              </span>
              <span className="text-2xl font-black text-white">
                {speed} <span className="text-xs font-bold text-[var(--text-secondary)]">км/с</span>
              </span>
            </div>

            {/* Курс / Направление */}
            <div className="glass-panel p-4 flex flex-col items-center gap-1 text-center">
              <Compass className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Кыймыл багыты
              </span>
              <span className="text-2xl font-black text-white">
                {bearing}° <span className="text-xs font-bold text-[var(--text-secondary)]">багыт</span>
              </span>
            </div>
          </div>
        )}

        {/* Управление загруженностью из кабины */}
        {isActive && (
          <div className="glass-panel p-5 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[var(--accent)]" />
              Салондун учурдагы толумдугу
            </span>

            <div className="grid grid-cols-3 gap-2 mt-1">
              <button
                onClick={() => handleCongestionChange('empty')}
                className={`py-2.5 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  congestion === 'empty'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                    : 'border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.02)] text-[var(--text-primary)]'
                }`}
              >
                🟢 Бош
              </button>
              <button
                onClick={() => handleCongestionChange('normal')}
                className={`py-2.5 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  congestion === 'normal'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-400'
                    : 'border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.02)] text-[var(--text-primary)]'
                }`}
              >
                🟡 Орточо
              </button>
              <button
                onClick={() => handleCongestionChange('crowded')}
                className={`py-2.5 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  congestion === 'crowded'
                    ? 'bg-rose-950/40 border-rose-500 text-rose-400'
                    : 'border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.02)] text-[var(--text-primary)]'
                }`}
              >
                🔴 Толгон
              </button>
            </div>
          </div>
        )}

        {/* Гео-координаты */}
        {isActive && currentCoords && (
          <div className="glass-panel px-4 py-3 flex items-center justify-between text-xs border border-emerald-900/30 bg-emerald-950/10">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 animate-pulse" />
              GPS сигналы туруктуу
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {currentCoords.lat.toFixed(5)}, {currentCoords.lon.toFixed(5)}
            </span>
          </div>
        )}

        {/* Кнопка запуска / остановки смены */}
        <button
          onClick={toggleShift}
          className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-2xl active:scale-98 transition-all ${
            isActive
              ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
          }`}
        >
          {isActive ? (
            <>
              <Square className="w-4 h-4" />
              Сменаны бүтүрүү (Стоп GPS)
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Сменаны баштоо (Старт GPS)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
