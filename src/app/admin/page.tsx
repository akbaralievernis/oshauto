'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase, isClientConfigured, Route, Stop } from '@/lib/supabase';
import {
  getCustomRoutes,
  saveCustomRoute,
  deleteCustomRoute,
  CustomRouteRecord
} from '@/lib/customRoutes';
import { parseStopsInput, geocodeStops, ParsedStop } from '@/lib/geocoding';
import { AdminAuth, logoutAdmin } from '@/components/Admin/AdminAuth';
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
  Plus,
  Trash2,
  RefreshCw,
  GripVertical,
  FolderOpen,
  Edit3,
  FilePlus2,
  X,
  ListPlus,
  Search,
  AlertTriangle,
  CheckCircle2,
  MousePointerClick,
  Hash,
  Palette,
  Clock,
  Route as RouteIcon,
  Sparkles,
  LogOut,
  HelpCircle,
  Eye,
  EyeOff,
  Lightbulb
} from 'lucide-react';
import Link from 'next/link';

const COLOR_PRESETS = [
  '3b82f6', // blue
  'ef4444', // red
  '10b981', // emerald
  'f59e0b', // amber
  'a855f7', // purple
  'ec4899', // pink
  '06b6d4', // cyan
  '64748b'  // slate
];

// =============================================================
// СОРТИРУЕМЫЙ ЭЛЕМЕНТ ОСТАНОВКИ
// =============================================================
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
      alert('Туура координаталарды жазыңыз.');
      return;
    }
    onEditCoords(stop.stop_id, lat, lon);
    setEditingCoords(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] transition-all select-none"
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

        <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-[var(--accent-glow)] text-[var(--accent)] shrink-0">
          {index + 1}
        </span>

        <input
          type="text"
          value={stop.stop_name}
          onChange={(e) => onRename(stop.stop_id, e.target.value)}
          className="flex-1 text-xs font-bold bg-transparent border-0 outline-none text-[var(--text-primary)] py-0.5 min-w-0"
        />

        <button
          onClick={() => setEditingCoords((v) => !v)}
          title="Координаталарды кол менен өзгөртүү"
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onRemove(stop.stop_id)}
          title="Аялдаманы өчүрүү"
          className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {editingCoords ? (
        <div className="flex items-center gap-1.5 pl-7 pr-1">
          <input
            value={tempLat}
            onChange={(e) => setTempLat(e.target.value)}
            placeholder="Кеңдик"
            className="flex-1 min-w-0 px-2 py-1 text-[10px] font-mono rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <input
            value={tempLon}
            onChange={(e) => setTempLon(e.target.value)}
            placeholder="Узундук"
            className="flex-1 min-w-0 px-2 py-1 text-[10px] font-mono rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
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

// =============================================================
// ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ — СЕКЦИЯ
// =============================================================
function Section({
  step,
  icon,
  title,
  hint,
  done,
  children
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  hint?: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-md overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
            done
              ? 'bg-emerald-500/15 text-emerald-500'
              : 'bg-[var(--accent-glow)] text-[var(--accent)]'
          }`}
        >
          {done ? <CheckCircle2 className="w-4 h-4" /> : step}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-primary)]">
            {icon}
            {title}
          </div>
          {hint && (
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{hint}</div>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 mb-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        {children}
      </label>
      {hint && <span className="text-[10px] text-[var(--text-muted)]">{hint}</span>}
    </div>
  );
}

// =============================================================
// АДМИН-ПАНЕЛЬ
// =============================================================
function AdminPageContent() {
  const [routeId, setRouteId] = useState<string>(`route_${Date.now()}`);
  const [routeShortName, setRouteShortName] = useState<string>('');
  const [routeLongName, setRouteLongName] = useState<string>('');
  const [routeColor, setRouteColor] = useState<string>('3b82f6');
  const [routeDesc, setRouteDesc] = useState<string>('');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(10);
  const [operatingHours, setOperatingHours] = useState<string>('06:00 - 21:30');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [stops, setStops] = useState<Stop[]>([]);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);

  const [savedRoutes, setSavedRoutes] = useState<CustomRouteRecord[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // вкладки добавления остановок
  const [addMode, setAddMode] = useState<'map' | 'manual' | 'bulk'>('map');

  // ручной ввод
  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');

  // массовый импорт
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importParsed, setImportParsed] = useState<ParsedStop[]>([]);
  const [importStage, setImportStage] = useState<'input' | 'preview' | 'geocoding' | 'ready'>('input');
  const [importProgress, setImportProgress] = useState<{ i: number; total: number; current: string } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ----- инициализация
  useEffect(() => {
    setIsClient(true);
    setSavedRoutes(getCustomRoutes());
    try {
      if (typeof window !== 'undefined') {
        const seen = window.localStorage.getItem('oshauto_admin_guide_seen');
        if (seen) setShowGuide(false);
      }
    } catch {}
  }, []);

  const closeGuide = () => {
    setShowGuide(false);
    try {
      window.localStorage.setItem('oshauto_admin_guide_seen', '1');
    } catch {}
  };

  // ----- OSRM
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
    const updatePath = async () => {
      const path = await fetchOSRMRoute(stops);
      setRoutePath(path);
    };
    updatePath();
  }, [stops]);

  // ----- Leaflet init
  useEffect(() => {
    if (!isClient || !mapContainerRef.current || leafletMapRef.current) return;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      import('leaflet/dist/leaflet.css' as any);

      const map = L.map(mapContainerRef.current!).setView([40.5215, 72.7981], 13);

      const currentTheme = document.documentElement.getAttribute('data-theme');
      const tileUrl = currentTheme === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      tileLayerRef.current = L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(map);

      leafletMapRef.current = map;

      map.on('click', (e: any) => {
        if (addMode !== 'map') return;
        const { lat, lng } = e.latlng;
        const newStopId = `stop_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        setStops((prev) => [
          ...prev,
          {
            stop_id: newStopId,
            stop_name: `Аялдама ${prev.length + 1}`,
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

  // ----- наблюдение за темой
  useEffect(() => {
    const handler = () => {
      const map = leafletMapRef.current;
      if (!map) return;
      import('leaflet').then((LModule) => {
        const L = LModule.default;
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const tileUrl = currentTheme === 'light'
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = L.tileLayer(tileUrl).addTo(map);
      });
    };
    const observer = new MutationObserver(handler);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // ----- перерисовка маркеров
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

  // ----- остановки
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

  const handleAddManualStop = () => {
    const lat = Number(manualLat);
    const lon = Number(manualLon);
    if (!manualName.trim()) {
      alert('Аялдаманын атын жазыңыз.');
      return;
    }
    if (!isFinite(lat) || !isFinite(lon)) {
      alert('Туура координаталарды жазыңыз. Мисалы: 40.5215, 72.7981');
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

  // ----- массовый импорт
  const handleOpenImport = () => {
    setImportText('');
    setImportParsed([]);
    setImportStage('input');
    setImportProgress(null);
    setShowImport(true);
  };

  const handleParseImport = () => {
    const parsed = parseStopsInput(importText);
    if (parsed.length === 0) {
      alert('Эч бир аялдама табылган жок. Аттар жаңы саптан жазылганын текшериңиз.');
      return;
    }
    setImportParsed(parsed);
    setImportStage('preview');
  };

  const handleGeocodeImport = async () => {
    if (importParsed.length === 0) return;
    setImportStage('geocoding');
    setImportProgress({ i: 0, total: importParsed.length, current: '' });
    const result = await geocodeStops(importParsed, (i, total, stop) => {
      setImportProgress({ i, total, current: stop.name });
    });
    setImportParsed(result);
    setImportStage('ready');
    setImportProgress(null);
  };

  const handleEditImportItem = (index: number, patch: Partial<ParsedStop>) => {
    setImportParsed((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const handleRemoveImportItem = (index: number) => {
    setImportParsed((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddImportedStops = () => {
    const usable = importParsed.filter(
      (s) =>
        typeof s.lat === 'number' &&
        typeof s.lon === 'number' &&
        isFinite(s.lat as number) &&
        isFinite(s.lon as number)
    );
    if (usable.length === 0) {
      alert('Координаталары бар бирөө да аялдама жок.');
      return;
    }
    const newStops: Stop[] = usable.map((s, idx) => ({
      stop_id: `stop_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
      stop_name: s.name,
      stop_lat: s.lat as number,
      stop_lon: s.lon as number
    }));
    setStops((prev) => [...prev, ...newStops]);
    setShowImport(false);

    if (leafletMapRef.current) {
      const bounds = newStops.map((s) => [s.stop_lat, s.stop_lon]);
      import('leaflet').then(() => {
        leafletMapRef.current.fitBounds(bounds, { padding: [40, 40] });
      });
    }

    const skipped = importParsed.length - usable.length;
    if (skipped > 0) {
      alert(`${newStops.length} аялдама кошулду. Координаталарсыз калгандар: ${skipped}.`);
    }
  };

  // ----- библиотека
  const handleLoadRoute = (rec: CustomRouteRecord) => {
    setRouteId(rec.route.route_id);
    setRouteShortName(rec.route.route_short_name);
    setRouteLongName(rec.route.route_long_name);
    setRouteColor(rec.route.route_color);
    setRouteDesc(rec.route.route_desc?.split('•')[0]?.trim() || '');
    setIntervalMinutes(rec.interval_minutes || 10);
    setOperatingHours(rec.operating_hours || '06:00 - 21:30');
    setStops(rec.stops);
    setShowLibrary(false);
    if (leafletMapRef.current && rec.stops.length > 0) {
      const bounds = rec.stops.map((s) => [s.stop_lat, s.stop_lon]);
      import('leaflet').then(() => {
        leafletMapRef.current.fitBounds(bounds, { padding: [40, 40] });
      });
    }
  };

  const handleDeleteSaved = (id: string) => {
    if (!confirm('Бул маршрутту өчүрөсүзбү? Аракет кайтарылбайт.')) return;
    deleteCustomRoute(id);
    setSavedRoutes(getCustomRoutes());
  };

  const handleNewRoute = () => {
    setRouteId(`route_${Date.now()}`);
    setRouteShortName('');
    setRouteLongName('');
    setRouteColor('3b82f6');
    setRouteDesc('');
    setIntervalMinutes(10);
    setOperatingHours('06:00 - 21:30');
    setStops([]);
  };

  // ----- сохранение
  const handleSaveRoute = async () => {
    if (!routeShortName.trim()) {
      alert('1-кадам: маршруттун номерин жазыңыз.');
      return;
    }
    if (!routeLongName.trim()) {
      alert('1-кадам: маршруттун атын жазыңыз.');
      return;
    }
    if (stops.length === 0) {
      alert('3-кадам: кеминде бир аялдама кошуңуз.');
      return;
    }

    setIsSaving(true);

    try {
      const routeData: Route = {
        route_id: routeId,
        route_short_name: routeShortName,
        route_long_name: routeLongName,
        route_desc: `${routeDesc || ''} • Аралык: ${intervalMinutes} мүн • ${operatingHours}`,
        route_type: 3,
        route_color: routeColor.replace('#', ''),
        route_text_color: 'ffffff'
      };

      const record: CustomRouteRecord = {
        route: routeData,
        stops,
        interval_minutes: intervalMinutes,
        operating_hours: operatingHours,
        created_at: new Date().toISOString()
      };
      saveCustomRoute(record);
      setSavedRoutes(getCustomRoutes());

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

        alert('Маршрут локалдуу жана Supabase-та сакталды!');
      } else {
        alert(`"${routeShortName}" маршруту сакталды жана сайтта пайда болду.`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Маршрут локалдуу сакталды, бирок Supabase-ке жөнөтүүдө ката болду: ' + (err?.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (!confirm('Чыгасызбы?')) return;
    logoutAdmin();
    window.location.reload();
  };

  // ----- индикаторы заполненности
  const step1Done = !!routeShortName.trim() && !!routeLongName.trim();
  const step2Done = stops.length > 0;

  return (
    <div className="w-screen h-screen overflow-hidden flex">
      {/* ЛЕВАЯ ПАНЕЛЬ */}
      <div className="w-[440px] shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-solid)] flex flex-col h-full z-10 shadow-2xl">
        {/* Шапка */}
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Башкы бетке
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            ЧЫГУУ
          </button>
        </div>

        {/* Title */}
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-extrabold tracking-tight">Маршрут куроо</div>
            <div className="text-[11px] text-[var(--text-muted)]">
              3 кадам менен жаңы маршрут түзүңүз
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowLibrary(true)}
              title="Сакталган маршруттар"
              className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="sr-only">Сакталгандар</span>
            </button>
            <button
              onClick={handleNewRoute}
              title="Жаңы маршрут"
              className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowGuide(true)}
              title="Жардам"
              className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Прогресс-индикатор */}
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2">
          <ProgressDot done={step1Done} label="Маалымат" />
          <div className="flex-1 h-0.5 bg-[var(--border-color)]" />
          <ProgressDot done={step2Done} label="Аялдамалар" />
          <div className="flex-1 h-0.5 bg-[var(--border-color)]" />
          <ProgressDot done={false} label="Сактоо" />
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Гид */}
          {showGuide && (
            <div className="relative rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 p-4">
              <button
                onClick={closeGuide}
                className="absolute top-2 right-2 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="text-sm font-extrabold text-[var(--text-primary)]">
                  Кантип маршрут кошуу?
                </div>
              </div>
              <ol className="flex flex-col gap-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                <li>
                  <b className="text-[var(--text-primary)]">1.</b> «Маршруттун маалыматы» бөлүмүнө номер (мис. 13), атын жана түсүн жазыңыз
                </li>
                <li>
                  <b className="text-[var(--text-primary)]">2.</b> «Аялдамалар» бөлүмүнөн үч жолдун бирин тандаңыз:{' '}
                  <i>картага басып</i>, <i>кол менен жазып</i> же <i>массалык тизмени кошуп</i>
                </li>
                <li>
                  <b className="text-[var(--text-primary)]">3.</b> Аягында «Маршрутту сактоо» баскычын басыңыз — маршрут сайтта пайда болот
                </li>
              </ol>
            </div>
          )}

          {/* СЕКЦИЯ 1: Маршруттун маалыматы */}
          <Section
            step={1}
            icon={<RouteIcon className="w-3.5 h-3.5 text-[var(--accent)]" />}
            title="Маршруттун маалыматы"
            hint="Номер, аталышы жана түсү"
            done={step1Done}
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <FieldLabel hint="Мис.: 13">Номер</FieldLabel>
                <input
                  type="text"
                  value={routeShortName}
                  onChange={(e) => setRouteShortName(e.target.value)}
                  placeholder="13"
                  className="w-full px-3 py-2.5 text-sm font-bold rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="col-span-2">
                <FieldLabel hint="Кайдан — кайда">Аталышы</FieldLabel>
                <input
                  type="text"
                  value={routeLongName}
                  onChange={(e) => setRouteLongName(e.target.value)}
                  placeholder="Борбордук базар — Анар"
                  className="w-full px-3 py-2.5 text-sm font-semibold rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div>
              <FieldLabel hint="Маршруттун картадагы түсү">Маршруттун түсү</FieldLabel>
              <div className="flex flex-wrap gap-2 items-center">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setRouteColor(c)}
                    className={`w-9 h-9 rounded-lg border-2 cursor-pointer transition-all ${
                      routeColor === c
                        ? 'border-[var(--text-primary)] scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: `#${c}` }}
                  />
                ))}
                <input
                  type="color"
                  value={`#${routeColor}`}
                  onChange={(e) => setRouteColor(e.target.value.replace('#', ''))}
                  className="w-9 h-9 rounded-lg border-2 border-[var(--border-color)] cursor-pointer"
                  title="Башка түс"
                />
              </div>
            </div>

            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="self-start flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              {showAdvanced ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              Кошумча жөндөөлөр
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-color)]">
                <div>
                  <FieldLabel hint="Маршрут жөнүндө кошумча маалымат">Сүрөттөмө</FieldLabel>
                  <textarea
                    value={routeDesc}
                    onChange={(e) => setRouteDesc(e.target.value)}
                    rows={2}
                    placeholder="Кыска сүрөттөмө..."
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel hint="Мис.: 10">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Аралык (мүн)
                    </FieldLabel>
                    <input
                      type="number"
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <FieldLabel hint="Мис.: 06:00 - 21:30">Иштөө убактысы</FieldLabel>
                    <input
                      type="text"
                      value={operatingHours}
                      onChange={(e) => setOperatingHours(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel hint="Автоматтык генерацияланат">
                    <Hash className="w-3 h-3 inline mr-1" />
                    Маршрут ID
                  </FieldLabel>
                  <input
                    type="text"
                    value={routeId}
                    onChange={(e) => setRouteId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            )}
          </Section>

          {/* СЕКЦИЯ 2: Аялдамалар */}
          <Section
            step={2}
            icon={<MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />}
            title={`Аялдамалар (${stops.length})`}
            hint="3 ыкманын бирин тандаңыз"
            done={step2Done}
          >
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
              <TabButton
                active={addMode === 'map'}
                onClick={() => setAddMode('map')}
                icon={<MousePointerClick className="w-3.5 h-3.5" />}
                label="Картадан"
              />
              <TabButton
                active={addMode === 'manual'}
                onClick={() => setAddMode('manual')}
                icon={<Hash className="w-3.5 h-3.5" />}
                label="Кол менен"
              />
              <TabButton
                active={addMode === 'bulk'}
                onClick={() => {
                  setAddMode('bulk');
                  handleOpenImport();
                }}
                icon={<ListPlus className="w-3.5 h-3.5" />}
                label="Тизме"
              />
            </div>

            {addMode === 'map' && (
              <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 text-xs text-[var(--text-secondary)] leading-relaxed flex items-start gap-2">
                <MousePointerClick className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <span>
                  Оң жактагы картанын каалаган жерине басыңыз — ал жерге аялдама кошулат. Алып салуу үчүн тизмедеги корзинаны басыңыз.
                </span>
              </div>
            )}

            {addMode === 'manual' && (
              <div className="flex flex-col gap-2">
                <input
                  placeholder="Аялдаманын аты (мис. Борбордук базар)"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Кеңдик (40.5215)"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="px-3 py-2 text-xs font-mono rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    placeholder="Узундук (72.7981)"
                    value={manualLon}
                    onChange={(e) => setManualLon(e.target.value)}
                    className="px-3 py-2 text-xs font-mono rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <button
                  onClick={handleAddManualStop}
                  className="py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Аялдама кошуу
                </button>
              </div>
            )}

            {addMode === 'bulk' && (
              <button
                onClick={handleOpenImport}
                className="w-full py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <ListPlus className="w-4 h-4" />
                Тизмени жайгаштыруу
              </button>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Кошулган: {stops.length}
              </span>
              {stops.length > 0 && (
                <button
                  onClick={() => setStops([])}
                  className="text-[11px] font-bold text-red-500 hover:text-red-400 cursor-pointer"
                >
                  Бардыгын тазалоо
                </button>
              )}
            </div>

            {stops.length === 0 ? (
              <div className="py-6 px-4 rounded-xl border border-dashed border-[var(--border-color)] text-center flex flex-col items-center gap-1 text-[var(--text-muted)] select-none">
                <MapPin className="w-5 h-5" />
                <span className="text-xs font-bold">Азырынча аялдама жок</span>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={stops.map((s) => s.stop_id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
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
          </Section>
        </div>

        {/* Сохранение */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--background)]">
          <button
            onClick={handleSaveRoute}
            disabled={isSaving}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Маршрутту сактоо
          </button>
          <div className="mt-2 text-[10px] text-center text-[var(--text-muted)]">
            Сакталгандан кийин маршрут сайтта дароо пайда болот
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: КАРТА */}
      <div className="flex-1 h-full relative">
        <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

        {/* Превью маршрута сверху */}
        {(routeShortName || stops.length > 0) && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="px-3 py-2 rounded-xl glass-panel border border-[var(--border-color)] pointer-events-auto flex items-center gap-2.5 shadow-2xl select-none">
              {routeShortName && (
                <span
                  className="w-9 h-9 flex items-center justify-center text-xs font-extrabold rounded-lg shrink-0"
                  style={{ backgroundColor: `#${routeColor}`, color: '#fff' }}
                >
                  {routeShortName}
                </span>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[260px]">
                  {routeLongName || 'Жаңы маршрут'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {stops.length} аялдама • {intervalMinutes} мүн
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Хинт-панель в режиме картинки */}
        {addMode === 'map' && (
          <div className="absolute top-4 right-4 z-10 pointer-events-none">
            <div className="px-3 py-2 rounded-xl glass-panel border border-blue-500/30 pointer-events-auto flex items-center gap-2 shadow-2xl select-none text-xs font-bold text-blue-600 dark:text-blue-300 max-w-xs">
              <MousePointerClick className="w-4 h-4 shrink-0" />
              Аялдама кошуу үчүн картаны басыңыз
            </div>
          </div>
        )}
      </div>

      {/* МОДАЛКА БИБЛИОТЕКИ */}
      {showLibrary && (
        <ModalShell title="Сакталган маршруттар" subtitle={`Бардыгы: ${savedRoutes.length}`} onClose={() => setShowLibrary(false)}>
          {savedRoutes.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--text-muted)]">
              Азырынча сакталган маршрут жок. Биринчисин жасаңыз!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {savedRoutes.map((rec) => (
                <div
                  key={rec.route.route_id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] transition-all"
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
                      {rec.stops.length} аялдама • {new Date(rec.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleLoadRoute(rec)}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                  >
                    Жүктөө
                  </button>
                  <button
                    onClick={() => handleDeleteSaved(rec.route.route_id)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ModalShell>
      )}

      {/* МОДАЛКА МАССОВОГО ИМПОРТА */}
      {showImport && (
        <ModalShell
          title="Аялдамаларды массалык кошуу"
          subtitle="Тизмени жайгаштырыңыз — координаталар автоматтык табылат"
          onClose={() => importStage !== 'geocoding' && setShowImport(false)}
        >
          <div className="flex flex-col gap-4">
            {importStage === 'input' && (
              <>
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-[var(--text-secondary)] leading-relaxed">
                  <b className="text-blue-600 dark:text-blue-300">Колдоого алынган форматтар:</b>
                  <ul className="list-disc list-inside mt-1.5 space-y-1">
                    <li>Ар бир аялдаманын атын жаңы саптан — координаталарын автоматтык табабыз</li>
                    <li>
                      Координаталары менен:{' '}
                      <code className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] font-mono text-[10px]">
                        Аталышы; 40.5215; 72.7981
                      </code>
                    </li>
                  </ul>
                </div>

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Борбордук базар\nАнар (Толойкон)\nСупермаркет Миллион\nКинотеатр Кыргызстан\n...`}
                  rows={12}
                  className="w-full px-3 py-2 text-xs font-mono leading-relaxed rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] resize-y"
                />

                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Сап саны: {importText.split(/\r?\n/).filter((l) => l.trim()).length}
                  </div>
                  <button
                    onClick={handleParseImport}
                    disabled={!importText.trim()}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    Талдоо
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            {importStage === 'preview' && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-[var(--text-secondary)]">
                    Табылган аялдамалар:{' '}
                    <b className="text-[var(--text-primary)]">{importParsed.length}</b>
                  </div>
                  <button
                    onClick={() => setImportStage('input')}
                    className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    ← Тексткe кайтуу
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {importParsed.map((s, i) => (
                    <ImportRow
                      key={i}
                      index={i}
                      stop={s}
                      onEdit={(p) => handleEditImportItem(i, p)}
                      onRemove={() => handleRemoveImportItem(i)}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
                  <div className="text-[10px] text-[var(--text-muted)] leading-tight max-w-[55%]">
                    Геокодирлөө ар бир аялдамага ~1 сек алат
                  </div>
                  <button
                    onClick={handleGeocodeImport}
                    disabled={importParsed.length === 0}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Координаталарды табуу ({importParsed.length})
                  </button>
                </div>
              </>
            )}

            {importStage === 'geocoding' && importProgress && (
              <div className="flex flex-col items-center gap-3 py-10">
                <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin" />
                <div className="text-sm font-bold">
                  {importProgress.i} / {importProgress.total}
                </div>
                <div className="text-xs text-[var(--text-muted)] text-center max-w-md truncate">
                  {importProgress.current}
                </div>
                <div className="w-full max-w-md h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all"
                    style={{ width: `${(importProgress.i / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {importStage === 'ready' && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-[var(--text-secondary)]">
                    Табылган координаталар:{' '}
                    <b className="text-emerald-500">
                      {importParsed.filter((s) => typeof s.lat === 'number').length}
                    </b>{' '}
                    / <b className="text-[var(--text-primary)]">{importParsed.length}</b>
                  </div>
                  <button
                    onClick={() => setImportStage('preview')}
                    className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    ← Түзөтүү
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {importParsed.map((s, i) => (
                    <ImportRow
                      key={i}
                      index={i}
                      stop={s}
                      onEdit={(p) => handleEditImportItem(i, p)}
                      onRemove={() => handleRemoveImportItem(i)}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-[var(--border-color)]">
                  <button
                    onClick={handleAddImportedStops}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Маршрутка кошуу
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// =============================================================
// Подкомпоненты
// =============================================================

function ProgressDot({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2.5 h-2.5 rounded-full ${
          done ? 'bg-emerald-500' : 'bg-[var(--border-hover)]'
        }`}
      />
      <span
        className={`text-[10px] font-bold uppercase tracking-widest ${
          done ? 'text-emerald-500' : 'text-[var(--text-muted)]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
        active
          ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-solid)] overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div>
            <div className="text-base font-extrabold">{title}</div>
            {subtitle && (
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

interface ImportRowProps {
  index: number;
  stop: ParsedStop;
  onEdit: (patch: Partial<ParsedStop>) => void;
  onRemove: () => void;
}

function ImportRow({ index, stop, onEdit, onRemove }: ImportRowProps) {
  const hasCoords = typeof stop.lat === 'number' && typeof stop.lon === 'number';
  return (
    <div
      className={`flex items-center gap-2 p-2.5 rounded-lg border ${
        hasCoords
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-amber-500/30 bg-amber-500/5'
      }`}
    >
      <span className="w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] shrink-0">
        {index + 1}
      </span>
      <input
        type="text"
        value={stop.name}
        onChange={(e) => onEdit({ name: e.target.value })}
        className="flex-1 min-w-0 text-xs font-semibold bg-transparent border-0 outline-none text-[var(--text-primary)] py-1"
      />
      <input
        type="text"
        value={stop.lat ?? ''}
        onChange={(e) => onEdit({ lat: e.target.value === '' ? undefined : Number(e.target.value) })}
        placeholder="Кеңдик"
        className="w-24 px-2 py-1 text-[10px] font-mono rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />
      <input
        type="text"
        value={stop.lon ?? ''}
        onChange={(e) => onEdit({ lon: e.target.value === '' ? undefined : Number(e.target.value) })}
        placeholder="Узундук"
        className="w-24 px-2 py-1 text-[10px] font-mono rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />
      {hasCoords ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      )}
      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// =============================================================
// EXPORT с защитой
// =============================================================
export default function AdminPage() {
  return (
    <AdminAuth>
      <AdminPageContent />
    </AdminAuth>
  );
}
