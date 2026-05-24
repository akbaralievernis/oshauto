'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Route, Stop, VehicleLocation, MOCK_PROMO_PINS, PromoPin } from '@/lib/supabase';
import { Bus, MapPin, Navigation, Sparkles } from 'lucide-react';

interface MapContainerProps {
  selectedRoute: Route | null;
  stops: Stop[];
  vehicles: VehicleLocation[];
  onSelectStop?: (stop: Stop) => void;
  activeAlarmStopId?: string | null;
}

// Помощник линейной интерполяции (Linear Interpolation)
const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;

export function MapContainer({
  selectedRoute,
  stops,
  vehicles,
  onSelectStop,
  activeAlarmStopId
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapType, setMapType] = useState<'mapbox' | 'leaflet' | 'none'>('none');
  const [isClient, setIsClient] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const tileLayerRef = useRef<any>(null);

  // Автоматический расчет сглаженной траектории по дорогам для пассажирской карты
  useEffect(() => {
    const getPath = async () => {
      if (stops.length < 2) {
        setRoutePath([]);
        return;
      }
      
      const coordsString = stops.map((s) => `${s.stop_lon},${s.stop_lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
      
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const routeCoords = data.routes[0].geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] as [number, number]
            );
            setRoutePath(routeCoords);
            return;
          }
        }
      } catch (err) {
        console.error('Ошибка OSRM маршрутизации пассажира:', err);
      }
      
      // Фоллбэк: прямые линии
      setRoutePath(stops.map((s) => [s.stop_lat, s.stop_lon] as [number, number]));
    };

    getPath();
  }, [stops]);
  
  // Хранилища для инстансов и слоев
  const mapboxMapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  
  // Кэши маркеров для оптимизации и плавной анимации
  const leafletStopsRef = useRef<any[]>([]);
  const leafletPromoPinsRef = useRef<any[]>([]);
  const leafletVehiclesRef = useRef<Record<string, { marker: any; lat: number; lon: number }>>({});
  const leafletPolylineRef = useRef<any>(null);

  // Координаты центра города Ош (Кыргызстан)
  const OSH_CENTER = { lat: 40.5215, lon: 72.7981 };

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Переключение тайлов при смене темы
  useEffect(() => {
    if (mapType !== 'leaflet' || !leafletMapRef.current) return;

    const handler = () => {
      const map = leafletMapRef.current;
      if (!map) return;
      import('leaflet').then((LModule) => {
        const L = LModule.default;
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const tileUrl = currentTheme === 'light'
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        if (tileLayerRef.current) {
          map.removeLayer(tileLayerRef.current);
        }
        tileLayerRef.current = L.tileLayer(tileUrl, {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);
      });
    };

    const observer = new MutationObserver(handler);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [mapType]);

  // Инициализация картографического провайдера (Mapbox vs Leaflet)
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    if (mapboxToken) {
      // -------------------------------------------------------------
      // МЕТОД 1: ИНИЦИАЛИЗАЦИЯ MAPBOX GL JS
      // -------------------------------------------------------------
      import('mapbox-gl').then((mapboxglModule) => {
        const mapboxgl = mapboxglModule.default;
        mapboxgl.accessToken = mapboxToken;

        if (mapboxMapRef.current) return;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/navigation-night-v1', // Ночная премиум тема
          center: [OSH_CENTER.lon, OSH_CENTER.lat],
          zoom: 12.5,
          pitch: 45 // 3D наклон
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        mapboxMapRef.current = map;
        setMapType('mapbox');
      }).catch((e) => {
        console.error('Ошибка загрузки Mapbox, переключение на Leaflet:', e);
        initLeaflet();
      });
    } else {
      // -------------------------------------------------------------
      // МЕТОД 2: ИНИЦИАЛИЗАЦИЯ LEAFLET.JS (Полный оффлайн-режим)
      // -------------------------------------------------------------
      initLeaflet();
    }

    function initLeaflet() {
      if (leafletMapRef.current) return;

      import('leaflet').then((LModule) => {
        const L = LModule.default;
        import('leaflet/dist/leaflet.css' as any);

        // Исправление дефолтных путей к картинкам маркеров Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const map = L.map(mapContainerRef.current!).setView(
          [OSH_CENTER.lat, OSH_CENTER.lon],
          13
        );

        // Тайлы зависят от темы
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const tileUrl = currentTheme === 'light'
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        tileLayerRef.current = L.tileLayer(tileUrl, {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);

        leafletMapRef.current = map;
        setMapType('leaflet');
      });
    }

    return () => {
      // Очистка памяти при unmount
      if (mapboxMapRef.current) {
        mapboxMapRef.current.remove();
        mapboxMapRef.current = null;
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isClient]);

  // -------------------------------------------------------------
  // ОТРИСОВКА И АНИМАЦИЯ НА LEAFLET КАРТЕ
  // -------------------------------------------------------------
  useEffect(() => {
    if (mapType !== 'leaflet' || !leafletMapRef.current) return;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      const map = leafletMapRef.current;

      // 1. Очищаем старые маркеры остановок и B2B пинов (транспорт анимируем отдельно)
      leafletStopsRef.current.forEach((marker) => marker.remove());
      leafletStopsRef.current = [];

      leafletPromoPinsRef.current.forEach((marker) => marker.remove());
      leafletPromoPinsRef.current = [];

      if (leafletPolylineRef.current) {
        leafletPolylineRef.current.remove();
        leafletPolylineRef.current = null;
      }

      // 2. Рисуем траекторию пути (сглаженную по дорогам OSRM)
      if (routePath.length > 1) {
        const polylineColor = selectedRoute ? `#${selectedRoute.route_color}` : '#3b82f6';
        
        const polyline = L.polyline(routePath, {
          color: polylineColor,
          weight: 5,
          opacity: 0.85,
          dashArray: '2, 8'
        }).addTo(map);

        leafletPolylineRef.current = polyline;

        // Зум по размеру всего пути
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      }

      // 3. Добавление маркеров остановок
      stops.forEach((stop) => {
        const isAlarmSet = activeAlarmStopId === stop.stop_id;
        const iconColor = selectedRoute ? `#${selectedRoute.route_color}` : '#3b82f6';
        
        const stopHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow-md relative transition-transform duration-200 hover:scale-125" style="background-color: ${iconColor};">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><circle cx="12" cy="12" r="10"/></svg>
            ${isAlarmSet ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white animate-ping"></span>' : ''}
          </div>
        `;

        const stopIcon = L.divIcon({
          html: stopHtml,
          className: 'custom-stop-div-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const stopMarker = L.marker([stop.stop_lat, stop.stop_lon], { icon: stopIcon })
          .addTo(map)
          .bindPopup(`<b>${stop.stop_name}</b><br/>Координаталар: ${stop.stop_lat.toFixed(5)}, ${stop.stop_lon.toFixed(5)}`);

        if (onSelectStop) {
          stopMarker.on('click', () => onSelectStop(stop));
        }

        leafletStopsRef.current.push(stopMarker);
      });

      // 4. Отрисовка B2B светящихся промо-пинов с купонами
      MOCK_PROMO_PINS.forEach((pin) => {
        let pinIconHtml = '';
        
        if (pin.category === 'coffee') {
          pinIconHtml = `
            <div class="relative flex items-center justify-center w-9 h-9 rounded-full border-2 border-amber-500 bg-[#1c120c] shadow-[0_0_15px_rgba(245,158,11,0.5)] cursor-pointer">
              <span class="absolute inset-0 rounded-full border-2 border-amber-500 animate-ping opacity-40" style="animation-duration: 2s;"></span>
              ☕
            </div>
          `;
        } else if (pin.category === 'copy') {
          pinIconHtml = `
            <div class="relative flex items-center justify-center w-9 h-9 rounded-full border-2 border-indigo-500 bg-[#0d1224] shadow-[0_0_15px_rgba(99,102,241,0.5)] cursor-pointer">
              <span class="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-40" style="animation-duration: 2.2s;"></span>
              📄
            </div>
          `;
        } else {
          pinIconHtml = `
            <div class="relative flex items-center justify-center w-9 h-9 rounded-full border-2 border-purple-500 bg-[#180d24] shadow-[0_0_15px_rgba(168,85,247,0.5)] cursor-pointer">
              <span class="absolute inset-0 rounded-full border-2 border-purple-500 animate-ping opacity-40" style="animation-duration: 1.8s;"></span>
              🛒
            </div>
          `;
        }

        const promoIcon = L.divIcon({
          html: pinIconHtml,
          className: 'custom-promo-div-icon',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const promoMarker = L.marker([pin.latitude, pin.longitude], { icon: promoIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: var(--font-sans), sans-serif; padding: 4px; max-width: 200px;">
              <div style="display: flex; align-items: center; gap: 4px; font-weight: 800; font-size: 13px; color: #f59e0b;">
                <span style="font-size:12px;">🌟</span> ${pin.business_name}
              </div>
              <p style="font-size: 10px; color: #d1d5db; line-height: 1.35; margin: 4px 0 6px 0;">${pin.description}</p>
              <div style="padding: 4px 8px; background: rgba(245,158,11,0.15); border: 1px dashed #f59e0b; border-radius: 6px; text-align: center; font-family: monospace; font-size: 11px; font-weight: 900; color: #fbbf24;">
                Купон: ${pin.coupon_code}

              </div>
            </div>
          `);

        leafletPromoPinsRef.current.push(promoMarker);
      });

      // 5. Плавный трекинг транспорта и интерполяция координат (lerp)
      const activeVehicleIds = new Set(vehicles.map((v) => v.vehicle_id));

      // Удаляем маркеры уехавших машин
      Object.keys(leafletVehiclesRef.current).forEach((id) => {
        if (!activeVehicleIds.has(id)) {
          leafletVehiclesRef.current[id].marker.remove();
          delete leafletVehiclesRef.current[id];
        }
      });

      // Отрисовка/анимация активных машин
      vehicles.forEach((v) => {
        let color = '#10b981'; // empty
        if (v.congestion_status === 'normal') color = '#f59e0b';
        if (v.congestion_status === 'crowded') color = '#ef4444';

        const vehicleHtml = `
          <div class="custom-vehicle-marker flex items-center justify-center w-9 h-9 rounded-full border-2 border-white shadow-lg" style="background-color: ${color}; transform: rotate(${v.bearing || 0}deg);">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="m12 19-7-7 7-7M5 12h14"/></svg>
          </div>
        `;

        const vehicleIcon = L.divIcon({
          html: vehicleHtml,
          className: 'custom-vehicle-div-icon',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const cached = leafletVehiclesRef.current[v.vehicle_id];

        if (cached) {
          // Если маркер уже есть — плавно скользим (интерполируем lerp)
          const marker = cached.marker;
          marker.setIcon(vehicleIcon); // обновляем курс/цвет
          
          const startLat = cached.lat;
          const startLon = cached.lon;
          const endLat = v.latitude;
          const endLon = v.longitude;

          // Запуск плавной анимации скольжения маркера по дорогам
          const duration = 2500; // время сглаживания в мс
          const startTime = performance.now();

          const animateStep = (timestamp: number) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = progress * (2 - progress); // кривая easeOut

            const currentLat = lerp(startLat, endLat, easeProgress);
            const currentLon = lerp(startLon, endLon, easeProgress);

            marker.setLatLng([currentLat, currentLon]);

            if (progress < 1) {
              requestAnimationFrame(animateStep);
            }
          };

          requestAnimationFrame(animateStep);

          // Обновляем координаты кэша
          leafletVehiclesRef.current[v.vehicle_id] = {
            marker,
            lat: endLat,
            lon: endLon
          };

          // Обновляем текст попапа
          marker.getPopup().setContent(`
            <div style="font-family: sans-serif; padding: 4px 8px;">
              <b style="font-size: 14px;">Маршрут №${v.route_short_name || '105'}</b><br/>
              <b>Толумдук:</b> ${v.congestion_status === 'empty' ? '🟢 Бош' : v.congestion_status === 'normal' ? '🟡 Орточо' : '🔴 Толгон'}<br/>
              <b>Ылдамдык:</b> ${v.speed || 0} км/саат<br/>
              <span style="font-size: 10px; color: #888;">Жаңыртылды: ${new Date(v.last_updated).toLocaleTimeString()}</span>
            </div>
          `);
        } else {
          // Если это новая машина — создаем с нуля
          const vehicleMarker = L.marker([v.latitude, v.longitude], { icon: vehicleIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: sans-serif; padding: 4px 8px;">
                <b style="font-size: 14px;">Маршрутка №${v.route_short_name || '105'}</b><br/>
                <b>Загруженность:</b> ${v.congestion_status === 'empty' ? '🟢 Свободно' : v.congestion_status === 'normal' ? '🟡 Нормально' : '🔴 Толпа'}<br/>
                <b>Скорость:</b> ${v.speed || 0} км/ч<br/>
                <span style="font-size: 10px; color: #888;">Обновлено: ${new Date(v.last_updated).toLocaleTimeString()}</span>
              </div>
            `);

          leafletVehiclesRef.current[v.vehicle_id] = {
            marker: vehicleMarker,
            lat: v.latitude,
            lon: v.longitude
          };
        }
      });
    });
  }, [mapType, stops, routePath, vehicles, selectedRoute, activeAlarmStopId]);

  if (!isClient) return <div className="w-full h-full bg-[#0d0d12]" />;

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />
      
      {/* HUD статусная панель карт */}
      <div className="absolute top-24 left-4 z-10 pointer-events-none flex flex-col gap-1.5">
        <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest rounded-lg bg-[var(--bg-primary)] backdrop-blur-md border border-[var(--border-color)] text-[var(--text-secondary)] pointer-events-auto flex items-center gap-1.5 shadow-lg select-none">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          {mapType === 'mapbox' ? 'MAPBOX 3D' : 'LEAFLET • OSM'}
        </div>
      </div>
    </div>
  );
}
