'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase, isClientConfigured, Route, Stop } from '@/lib/supabase';
import {
  getCustomRoutes,
  saveCustomRoute,
  deleteCustomRoute,
  CustomRouteRecord
} from '@/lib/customRoutes';
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
  RefreshCw,
  HelpCircle,
  GripVertical,
  FolderOpen,
  Edit3,
  FilePlus2,
  Hash,
  X
} from 'lucide-react';
import Link from 'next/link';

// -------------------------------------------------------------
// СОРТИРУЕМЫЙ ЭЛЕМЕНТ ОСТАНОВКИ (DnD)
// -------------------------------------------------------------
interface SortableStopItemProps {
  stop: Stop;
  index: number;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onEditCoords: (id: string, lat: number, lon: number) => void;
}

function SortableStopItem({ stop, index, onRemove, onRename, onEditCoords }: SortableStopItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.stop_id
  });

  const [editingCoords, setEditingCoords] = useState(false);
  const [tempLat, setTempLat] = useState(String(stop.stop_lat));
  const [tempLon, setTempLon] = useState(String(stop.stop_lon));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1
  };

  const saveCoords = () => {
    const lat = Number(tempLat);
    const lon = Number(tempLon);
    if (!isFinite(lat) || !isFinite(lon)) {
      alert('Введите корректные координаты (числа).');
      return;
    }
    onEditCoords(stop.stop_id, lat, lon);
    setEditingCoords(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-[var(--border-color)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-all select-none"
    >
      <div className="flex items-center gap-2">
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

        <input
          type="text"
          value={stop.stop_name}
          onChange={(e) => onRename(stop.stop_id, e.target.value)}
          className="flex-1 text-xs font-bold bg-transparent border-0 outline-none text-[var(--text-primary)] focus:border-b border-[var(--accent)] py-0.5 min-w-0"
        />

        <button
          onClick={() => setEditingCoords((v) => !v)}
          title="Изменить координаты вручную"
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-light)] rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onRemove(stop.stop_id)}
          title="Удалить остановку"
          className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {editingCoords ? (
        <div className="flex items-center gap-1.5 pl-7 pr-1">
          <input
            value={tempLat}
            onChange={(e) => setTempLat(e.target.value)}
            placeholder="Широта"
            className="flex-1 min-w-0 px-2 py-1 text-[10px] font-mono rounded bg-[rgba(255,255,255,0.04)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
          />
          <input
            value={tempLon}
            onChange={(e) => setTempLon(e.target.value)}
            placeholder="Долгота"
            className="flex-1 min-w-0 px-2 py-1 text-[10px] font-mono rounded bg-[rgba(255,255,255,0.04)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={saveCoords}
            className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shrink-0"
          >
            OK
          </button>
        </div>
      ) : (
        <div className="pl-7 text-[10px] font-mono text-[var(--text-muted)]">
          {stop.stop_lat.toFixed(5)}, {stop.stop_lon.toFixed(5)}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// АДМИН-ПАНЕЛЬ
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
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);

  const [savedRoutes, setSavedRoutes] = useState<CustomRouteRecord[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  // Поля ручного добавления остановки
  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Запрос OSRM-маршрута
  const fetchOSRMRoute = async (stopsList: Stop[]): Promise<[number, number][]> => {
    if (stopsList.length < 2) return [];
    const coordsString = stopsList.map((s) => `${s.stop_lon},${s.stop_lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM Error');
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        return data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );
      }
    } catch (err) {
      console.error('OSRM error, fallback к прямым линиям:', err);
    }
    return stopsList.map((s) => [s.stop_lat, s.stop_lon] as [number, number]);
  };

  useEffect(() => {
    setIsClient(true);
    setSavedRoutes(getCustomRoutes());
  }, []);

  // Расчёт траектории при изменении остановок
  useEffect(() => {
    const updatePath = async () => {
      const path = await fetchOSRMRoute(stops);
      setRoutePath(path);
    };
    updatePath();
  }, [stops]);

  // Инициализация карты Leaflet
  useEffect(() => {
    if (!isClient || !mapContainerRef.current || leafletMapRef.current) return;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      import('leaflet/dist/leaflet.css' as any);

      const map = L.map(mapContainerRef.current!).setView([40.5215, 72.7981], 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(map);

      leafletMapRef.current = map;

      // Клик по карте → добавляем остановку
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        const newStopId = `stop_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        setStops((prev) => [
          ...prev,
          {
            stop_id: newStopId,
            stop_name: `Остановка ${prev.length + 1}`,
            stop_lat: lat,
            stop_lon: lng
          }
        ]);
      });
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isClient]);

  // Перерисовка маркеров и пути
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    import('leaflet').then((LModule) => {
      const L = LModule.default;

      stops.forEach((stop, index) => {
        const stopHtml = `
          <div class="flex items-center justify-center w-7 h-7 rounded-full border-2 border-white shadow-lg text-white text-[10px] font-bold" style="background-color: #${routeColor};">
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

      if (routePath.length > 0) {
        const polyline = L.polyline(routePath, {
          color: `#${routeColor}`,
          weight: 4.5,
          opacity: 0.85,
          dashArray: '2, 8'
        }).addTo(map);
        polylineRef.current = polyline;
      }
    });
  }, [stops, routePath, routeColor]);

  // Действия со списком остановок
  const handleRemoveStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.stop_id !== id));
  };

  const handleRenameStop = (id: string, newName: string) => {
    setStops((prev) => prev.map((s) => (s.stop_id === id ? { ...s, stop_name: newName } : s)));
  };

  const handleEditCoords = (id: string, lat: number, lon: number) => {
    setStops((prev) =>
      prev.map((s) => (s.stop_id === id ? { ...s, stop_lat: lat, stop_lon: lon } : s))
    );
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStops((items) => {
      const oldIndex = items.findIndex((x) => x.stop_id === active.id);
      const newIndex = items.findIndex((x) => x.stop_id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  // Ручное добавление остановки
  const handleAddManualStop = () => {
    const lat = Number(manualLat);
    const lon = Number(manualLon);
    if (!manualName.trim()) {
      alert('Введите название остановки.');
      return;
    }
    if (!isFinite(lat) || !isFinite(lon)) {
      alert('Введите корректные координаты (числа). Пример: 40.5215, 72.7981');
      return;
    }
    const newStop: Stop = {
      stop_id: `stop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      stop_name: manualName.trim(),
      stop_lat: lat,
      stop_lon: lon
    };
    setStops((prev) => [...prev, newStop]);
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lon], 14);
    }
    setManualName('');
    setManualLat('');
    setManualLon('');
  };

  // Загрузка маршрута из библиотеки
  const handleLoadRoute = (rec: CustomRouteRecord) => {
    setRouteId(rec.route.route_id);
    setRouteShortName(rec.route.route_short_name);
    setRouteLongName(rec.route.route_long_name);
    setRouteColor(rec.route.route_color);
    setRouteDesc(rec.route.route_desc || '');
    setIntervalMinutes(rec.interval_minutes || 8);
    setOperatingHours(rec.operating_hours || '06:00 - 21:30');
    setStops(rec.stops);
    setShowLibrary(false);
    if (leafletMapRef.current && rec.stops.length > 0) {
      const bounds = rec.stops.map((s) => [s.stop_lat, s.stop_lon]);
      import('leaflet').then((LModule) => {
        leafletMapRef.current.fitBounds(bounds, { padding: [40, 40] });
      });
    }
  };

  // Удаление из библиотеки
  const handleDeleteSaved = (id: string) => {
    if (!confirm('Удалить этот маршрут? Действие необратимо.')) return;
    deleteCustomRoute(id);
    setSavedRoutes(getCustomRoutes());
  };

  // Создание нового пустого маршрута
  const handleNewRoute = () => {
    const newId = `route_${Date.now()}`;
    setRouteId(newId);
    setRouteShortName('');
    setRouteLongName('');
    setRouteColor('3b82f6');
    setRouteDesc('');
    setIntervalMinutes(10);
    setOperatingHours('06:00 - 21:30');
    setStops([]);
  };

  // Сохранение
  const handleSaveRoute = async () => {
    if (!routeShortName.trim()) {
      alert('Укажите номер маршрута.');
      return;
    }
    if (!routeLongName.trim()) {
      alert('Укажите название маршрута.');
      return;
    }
    if (stops.length === 0) {
      alert('Добавьте хотя бы одну остановку.');
      return;
    }

    setIsSaving(true);

    try {
      const routeData: Route = {
        route_id: routeId,
        route_short_name: routeShortName,
        route_long_name: routeLongName,
        route_desc: `${routeDesc} • Интервал: ${intervalMinutes}м • ${operatingHours}`,
        route_type: 3,
        route_color: routeColor.replace('#', ''),
        route_text_color: 'ffffff'
      };

      // Локальное сохранение всегда выполняется
      const record: CustomRouteRecord = {
        route: routeData,
        stops,
        interval_minutes: intervalMinutes,
        operating_hours: operatingHours,
        created_at: new Date().toISOString()
      };
      saveCustomRoute(record);
      setSavedRoutes(getCustomRoutes());

      // Если есть Supabase — отправляем туда тоже
      if (isClientConfigured) {
        const { error: routeErr } = await supabase.from('routes').upsert(routeData);
        if (routeErr) throw routeErr;

        const stopsToInsert = stops.map((s) => ({
          stop_id: s.stop_id,
          stop_name: s.stop_name,
          stop_lat: s.stop_lat,
          stop_lon: s.stop_lon
        }));
        const { error: stopsErr } = await supabase.from('stops').upsert(stopsToInsert);
        if (stopsErr) throw stopsErr;

        const tripId = `trip_${routeId}`;
        const { error: tripErr } = await supabase.from('trips').upsert({
          trip_id: tripId,
          route_id: routeId,
          service_id: 'daily',
          trip_headsign: stops[stops.length - 1].stop_name,
          direction_id: 0
        });
        if (tripErr) throw tripErr;

        alert('Маршрут сохранён локально и в Supabase!');
      } else {
        alert(
          `Маршрут "${routeShortName}" сохранён локально и теперь доступен на сайте. Маршрут отображается в разделе "Маршруты".`
        );
      }
    } catch (err: any) {
      console.error(err);
      alert('Локально маршрут сохранён, но при отправке в Supabase возникла ошибка: ' + (err?.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-[#0d0d12] text-[#f3f4f6]">
      {/* ЛЕВАЯ ПАНЕЛЬ */}
      <div className="w-[400px] shrink-0 border-r border-[var(--border-color)] bg-[#12121a] flex flex-col h-full z-10 shadow-2xl">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            На главную
          </Link>
          <div className="flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded bg-amber-950/20 border border-amber-500/30 text-amber-400">
            <Settings className="w-3 h-3" />
            КОНСТРУКТОР
          </div>
        </div>

        {/* Тулбар: библиотека + новый */}
        <div className="px-4 pt-4 flex items-center gap-2">
          <button
            onClick={() => setShowLibrary(true)}
            className="flex-1 px-3 py-2 text-xs font-bold rounded-lg border border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Сохранённые ({savedRoutes.length})
          </button>
          <button
            onClick={handleNewRoute}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            Новый
          </button>
        </div>

        {/* Формы */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              ID маршрута
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
                Номер
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
                Цвет (HEX)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={routeColor}
                  onChange={(e) => setRouteColor(e.target.value.replace('#', ''))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
                />
                <input
                  type="color"
                  value={`#${routeColor}`}
                  onChange={(e) => setRouteColor(e.target.value.replace('#', ''))}
                  className="w-9 h-9 rounded-lg border border-[var(--border-color)] shrink-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Название (откуда — куда)
            </label>
            <input
              type="text"
              value={routeLongName}
              onChange={(e) => setRouteLongName(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Описание
            </label>
            <textarea
              value={routeDesc}
              onChange={(e) => setRouteDesc(e.target.value)}
              rows={2}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)] resize-none"
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

          {/* РУЧНОЙ ВВОД ОСТАНОВКИ */}
          <div className="flex flex-col gap-2 p-3 rounded-xl border border-blue-900/40 bg-blue-950/10">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-300">
              <Hash className="w-3.5 h-3.5" />
              Добавить остановку вручную
            </div>
            <input
              placeholder="Название остановки"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Широта (40.5215)"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="px-3 py-2 text-xs font-mono rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
              />
              <input
                placeholder="Долгота (72.7981)"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
                className="px-3 py-2 text-xs font-mono rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] text-white outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              onClick={handleAddManualStop}
              className="py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить
            </button>
          </div>

          {/* СПИСОК ОСТАНОВОК */}
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Остановки ({stops.length})
              </span>
              {stops.length > 0 && (
                <button
                  onClick={() => setStops([])}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 cursor-pointer"
                >
                  Сбросить все
                </button>
              )}
            </div>

            {stops.length === 0 ? (
              <div className="py-6 px-4 rounded-xl border border-dashed border-[var(--border-color)] text-center flex flex-col items-center gap-1 text-[var(--text-muted)] select-none">
                <MapPin className="w-6 h-6" />
                <span className="text-xs font-bold">Карта интерактивна</span>
                <span className="text-[10px]">
                  Кликайте по карте или используйте ручной ввод
                </span>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={stops.map((s) => s.stop_id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                    {stops.map((stop, index) => (
                      <SortableStopItem
                        key={stop.stop_id}
                        stop={stop}
                        index={index}
                        onRemove={handleRemoveStop}
                        onRename={handleRenameStop}
                        onEditCoords={handleEditCoords}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-color)] bg-[#0d0d12]">
          <button
            onClick={handleSaveRoute}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить маршрут
          </button>
        </div>
      </div>

      {/* КАРТА */}
      <div className="flex-1 h-full relative">
        <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <div className="px-4 py-2.5 text-xs font-bold rounded-xl glass-panel text-amber-400 pointer-events-auto border border-amber-500/30 flex items-center gap-2 shadow-2xl select-none max-w-md">
            <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
            Кликните в любую точку карты, чтобы добавить остановку. Перетаскивайте в списке слева для упорядочивания.
          </div>
        </div>
      </div>

      {/* МОДАЛКА БИБЛИОТЕКИ */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowLibrary(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[80vh] glass-panel flex flex-col rounded-2xl border border-[var(--border-color)] overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <div>
                <div className="text-base font-extrabold">Сохранённые маршруты</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Всего: {savedRoutes.length}. Нажмите, чтобы загрузить.
                </div>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[rgba(255,255,255,0.04)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {savedRoutes.length === 0 ? (
                <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                  Пока нет сохранённых маршрутов. Создайте первый!
                </div>
              ) : (
                savedRoutes.map((rec) => (
                  <div
                    key={rec.route.route_id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-all"
                  >
                    <span
                      className="w-11 h-11 flex items-center justify-center text-sm font-extrabold rounded-lg shrink-0"
                      style={{
                        backgroundColor: `#${rec.route.route_color}`,
                        color: `#${rec.route.route_text_color}`
                      }}
                    >
                      {rec.route.route_short_name}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{rec.route.route_long_name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        {rec.stops.length} остановок • Создан {new Date(rec.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoadRoute(rec)}
                      className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                    >
                      Загрузить
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(rec.route.route_id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
