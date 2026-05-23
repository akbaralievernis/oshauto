'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase, isClientConfigured, Route, Stop } from '@/lib/supabase';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MapPin,
  Save,
  ArrowLeft,
  Settings,
  Plus,
  Trash2,
  Clock,
  RefreshCw,
  HelpCircle,
  GripVertical
} from 'lucide-react';
import Link from 'next/link';

// -------------------------------------------------------------
// КОМПОНЕНТ СОРТИРУЕМОГО ЭЛЕМЕНТА СПИСКА (Drag and Drop Stop Item)
// -------------------------------------------------------------
interface SortableStopItemProps {
  stop: Stop;
  index: number;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

function SortableStopItem({ stop, index, onRemove, onRename }: SortableStopItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: stop.stop_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border-color)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-all select-none"
    >
      {/* Ручка захвата для Drag & Drop */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-[var(--border-color)] text-[var(--text-secondary)] shrink-0">
        {index + 1}
      </span>

      {/* Переименование остановки */}
      <input
        type="text"
        value={stop.stop_name}
        onChange={(e) => onRename(stop.stop_id, e.target.value)}
        className="w-full text-xs font-bold bg-transparent border-0 outline-none text-[var(--text-primary)] focus:border-b border-[var(--accent)] py-0.5"
      />

      {/* Кнопка удаления остановки */}
      <button
        onClick={() => onRemove(stop.stop_id)}
        className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// ГЛАВНЫЙ КОМПОНЕНТ АДМИН-ПАНЕЛИ (Admin Editor Page)
// -------------------------------------------------------------
export default function AdminPage() {
  const [routeId, setRouteId] = useState<string>('201');
  const [routeShortName, setRouteShortName] = useState<string>('12');
  const [routeLongName, setRouteLongName] = useState<string>('мкрн. Анар — мкрн. Юго-Восток');
  const [routeColor, setRouteColor] = useState<string>('3b82f6');
  const [routeDesc, setRouteDesc] = useState<string>('Новый скоростной маршрут');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(8);
  const [operatingHours, setOperatingHours] = useState<string>('06:00 - 21:30');

  const [stops, setStops] = useState<Stop[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  // Настройка сенсоров для Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Активируем DND только при смещении курсора более чем на 8 пикселей
      }
    })
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Инициализация Leaflet в админке
  useEffect(() => {
    if (!isClient || !mapContainerRef.current || leafletMapRef.current) return;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      import('leaflet/dist/leaflet.css' as any);

      // Создаем карту Оша
      const map = L.map(mapContainerRef.current!).setView([40.5215, 72.7981], 13);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(map);

      leafletMapRef.current = map;

      // Обработчик КЛИКА ПО КАРТЕ для установки ОСТАНОВКИ
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Генерация новой остановки
        const newStopId = `stop_${Date.now()}`;
        const newStop: Stop = {
          stop_id: newStopId,
          stop_name: `Остановка ${stops.length + 1}`,
          stop_lat: lat,
          stop_lon: lng
        };

        // Обновляем состояние остановок
        setStops((prev) => [...prev, newStop]);
      });
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isClient, stops.length]);

  // Обновление карты при изменении списка остановок
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    // Очищаем старые маркеры
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    import('leaflet').then((LModule) => {
      const L = LModule.default;

      // 1. Отрисовка остановок
      stops.forEach((stop, index) => {
        const stopHtml = `
          <div class="flex items-center justify-center w-7 h-7 rounded-full border-2 border-white shadow-lg bg-[#${routeColor}] text-white text-[10px] font-bold">
            ${index + 1}
          </div>
        `;

        const icon = L.divIcon({
          html: stopHtml,
          className: 'admin-stop-div-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([stop.stop_lat, stop.stop_lon], { icon })
          .addTo(map)
          .bindPopup(`<b>${stop.stop_name}</b>`);

        markersRef.current.push(marker);
      });

      // 2. Отрисовка пути (полилинии) между ними (Snap-to-road stub)
      if (stops.length > 1) {
        const coords = stops.map((s) => [s.stop_lat, s.stop_lon] as [number, number]);
        
        const polyline = L.polyline(coords, {
          color: `#${routeColor}`,
          weight: 4,
          opacity: 0.8,
          dashArray: '5, 8'
        }).addTo(map);

        polylineRef.current = polyline;
      }
    });
  }, [stops, routeColor]);

  // Обработка удаления остановки
  const handleRemoveStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.stop_id !== id));
  };

  // Обработка изменения имени остановки
  const handleRenameStop = (id: string, newName: string) => {
    setStops((prev) =>
      prev.map((s) => (s.stop_id === id ? { ...s, stop_name: newName } : s))
    );
  };

  // Завершение сортировки Drag & Drop
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setStops((items) => {
        const oldIndex = items.findIndex((x) => x.stop_id === active.id);
        const newIndex = items.findIndex((x) => x.stop_id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Сохранение в БД
  const handleSaveRoute = async () => {
    if (stops.length === 0) {
      alert('Добавьте хотя бы одну остановку на карту!');
      return;
    }

    setIsSaving(true);

    try {
      const routeData = {
        route_id: routeId,
        route_short_name: routeShortName,
        route_long_name: routeLongName,
        route_desc: `${routeDesc} • Интервал: ${intervalMinutes}м • Время работы: ${operatingHours}`,
        route_type: 3,
        route_color: routeColor,
        route_text_color: 'ffffff'
      };

      if (isClientConfigured) {
        // -------------------------------------------------------------
        // ИМПОРТ В SUPABASE
        // -------------------------------------------------------------
        // 1. Сохраняем маршрут
        const { error: routeErr } = await supabase.from('routes').upsert(routeData);
        if (routeErr) throw routeErr;

        // 2. Сохраняем каждую остановку
        const stopsToInsert = stops.map((s) => ({
          stop_id: s.stop_id,
          stop_name: s.stop_name,
          stop_lat: s.stop_lat,
          stop_lon: s.stop_lon
        }));

        const { error: stopsErr } = await supabase.from('stops').upsert(stopsToInsert);
        if (stopsErr) throw stopsErr;

        // 3. Создаем дефолтный рейс для маршрутизации
        const tripId = `trip_${routeId}`;
        const { error: tripErr } = await supabase.from('trips').upsert({
          trip_id: tripId,
          route_id: routeId,
          service_id: 'daily',
          trip_headsign: stops[stops.length - 1].stop_name,
          direction_id: 0
        });
        if (tripErr) throw tripErr;

        alert('🎉 Маршрут и остановки успешно сохранены в Supabase DB!');
      } else {
        // -------------------------------------------------------------
        // ДЕМО-ФОЛЛБЭК: СИМУЛЯЦИЯ СОХРАНЕНИЯ В БД
        // -------------------------------------------------------------
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('Сохранено в демо-режиме:', { routeData, stops });
        alert(`🎉 Демо-режим: Объект маршрута "${routeShortName}" с ${stops.length} остановками успешно сгенерирован и отправлен в лог!`);
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении маршрута в базу данных.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-[#0d0d12] text-[#f3f4f6]">
      {/* ЛЕВАЯ КОНСОЛЬ РЕДАКТОРА */}
      <div className="w-96 shrink-0 border-r border-[var(--border-color)] bg-[#12121a] flex flex-col h-full z-10 shadow-2xl">
        {/* Шапка админки */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            На карту
          </Link>
          <div className="flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded bg-amber-950/20 border border-amber-500/30 text-amber-400">
            <Settings className="w-3 h-3 animate-spin-slow" />
            РЕЖИМ КОНСТРУКТОРА
          </div>
        </div>

        {/* Формы конфигурации */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Индификатор Маршрута (route_id)
            </label>
            <input
              type="text"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Номер маршрута
              </label>
              <input
                type="text"
                value={routeShortName}
                onChange={(e) => setRouteShortName(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Цвет ветки (HEX)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={routeColor}
                  onChange={(e) => setRouteColor(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
                />
                <div
                  className="w-7 h-7 rounded-lg border border-[var(--border-color)] shrink-0"
                  style={{ backgroundColor: `#${routeColor}` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Название пути
            </label>
            <input
              type="text"
              value={routeLongName}
              onChange={(e) => setRouteLongName(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Интервал (мин)
              </label>
              <input
                type="number"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Время работы
              </label>
              <input
                type="text"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Список остановок с Drag & Drop */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Список остановок ({stops.length})
              </span>
              {stops.length > 0 && (
                <button
                  onClick={() => setStops([])}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 cursor-pointer"
                >
                  Сбросить
                </button>
              )}
            </div>

            {stops.length === 0 ? (
              <div className="py-6 px-4 rounded-xl border border-dashed border-[var(--border-color)] text-center flex flex-col items-center gap-1 text-[var(--text-muted)] select-none">
                <MapPin className="w-6 h-6 animate-bounce" />
                <span className="text-xs font-bold">Карта интерактивна</span>
                <span className="text-[10px]">Кликайте по карте для установки остановок и построения пути!</span>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={stops.map((s) => s.stop_id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {stops.map((stop, index) => (
                      <SortableStopItem
                        key={stop.stop_id}
                        stop={stop}
                        index={index}
                        onRemove={handleRemoveStop}
                        onRename={handleRenameStop}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Панель сохранения внизу левой панели */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[#0d0d12]">
          <button
            onClick={handleSaveRoute}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Сохранить в базу Supabase
          </button>
        </div>
      </div>

      {/* ПРАВАЯ ИНТЕРАКТИВНАЯ КАРТА */}
      <div className="flex-1 h-full relative">
        <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
        
        {/* Хинт-панель сверху карты */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <div className="px-4 py-2.5 text-xs font-bold rounded-xl glass-panel text-amber-400 pointer-events-auto border border-amber-500/30 flex items-center gap-2 shadow-2xl select-none">
            <HelpCircle className="w-4 h-4 shrink-0 animate-pulse text-amber-400" />
            Кликните в любую точку на карте, чтобы добавить новую остановку. Перетаскивайте их в списке слева для упорядочивания пути.
          </div>
        </div>
      </div>
    </div>
  );
}
