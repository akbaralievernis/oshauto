'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Route, Stop, VehicleLocation, MOCK_PROMO_PINS } from '@/lib/supabase';

interface MapContainerProps {
  selectedRoute: Route | null;
  stops: Stop[];
  vehicles: VehicleLocation[];
  onSelectStop?: (stop: Stop) => void;
  activeAlarmStopId?: string | null;
}

// Linear interpolation helper for smooth vehicle motion.
const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;

const OSH_CENTER = { lat: 40.5215, lon: 72.7981 };

export function MapContainer({
  selectedRoute,
  stops,
  vehicles,
  onSelectStop,
  activeAlarmStopId
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const leafletStopsRef = useRef<any[]>([]);
  const leafletPromoPinsRef = useRef<any[]>([]);
  const leafletVehiclesRef = useRef<Record<string, { marker: any; lat: number; lon: number }>>({});
  const leafletPolylineRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Smooth route geometry via OSRM (falls back to straight lines).
  useEffect(() => {
    let cancelled = false;
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
          if (!cancelled && data.routes?.[0]) {
            const coords = data.routes[0].geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] as [number, number]
            );
            setRoutePath(coords);
            return;
          }
        }
      } catch (err) {
        console.warn('OSRM unavailable, using straight lines.', err);
      }
      if (!cancelled) {
        setRoutePath(stops.map((s) => [s.stop_lat, s.stop_lon] as [number, number]));
      }
    };
    getPath();
    return () => {
      cancelled = true;
    };
  }, [stops]);

  // Initialize Leaflet once on mount.
  useEffect(() => {
    if (!isClient || !mapContainerRef.current || leafletMapRef.current) return;

    let cleanup: (() => void) | undefined;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      import('leaflet/dist/leaflet.css' as any);

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
      });

      if (!mapContainerRef.current) return;
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true
      }).setView([OSH_CENTER.lat, OSH_CENTER.lon], 13);

      const currentTheme = document.documentElement.getAttribute('data-theme');
      const tileUrl =
        currentTheme === 'light'
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      tileLayerRef.current = L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      leafletMapRef.current = map;
      setIsMapReady(true);

      cleanup = () => {
        map.remove();
        leafletMapRef.current = null;
        setIsMapReady(false);
      };
    });

    return () => cleanup?.();
  }, [isClient]);

  // Swap tiles when theme changes.
  useEffect(() => {
    if (!isMapReady) return;
    const handler = () => {
      const map = leafletMapRef.current;
      if (!map) return;
      import('leaflet').then((LModule) => {
        const L = LModule.default;
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const tileUrl =
          currentTheme === 'light'
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = L.tileLayer(tileUrl, {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);
      });
    };
    const observer = new MutationObserver(handler);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  }, [isMapReady]);

  // Draw stops, route path and promo pins.
  useEffect(() => {
    if (!isMapReady) return;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      const map = leafletMapRef.current;
      if (!map) return;

      leafletStopsRef.current.forEach((m) => m.remove());
      leafletStopsRef.current = [];
      leafletPromoPinsRef.current.forEach((m) => m.remove());
      leafletPromoPinsRef.current = [];

      if (leafletPolylineRef.current) {
        leafletPolylineRef.current.remove();
        leafletPolylineRef.current = null;
      }

      if (routePath.length > 1) {
        const polylineColor = selectedRoute ? `#${selectedRoute.route_color}` : '#3b82f6';
        const polyline = L.polyline(routePath, {
          color: polylineColor,
          weight: 5,
          opacity: 0.9
        }).addTo(map);
        leafletPolylineRef.current = polyline;
        map.fitBounds(polyline.getBounds(), { padding: [60, 60] });
      }

      stops.forEach((stop) => {
        const isAlarmSet = activeAlarmStopId === stop.stop_id;
        const iconColor = selectedRoute ? `#${selectedRoute.route_color}` : '#3b82f6';

        const stopHtml = `
          <div style="position:relative; display:flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:9999px; border:2px solid white; background:${iconColor}; box-shadow:0 4px 14px rgba(0,0,0,0.35);">
            <span style="width:6px; height:6px; background:white; border-radius:9999px;"></span>
            ${isAlarmSet ? '<span style="position:absolute; top:-4px; right:-4px; width:12px; height:12px; background:#ef4444; border-radius:9999px; border:2px solid white;" class="animate-ping"></span>' : ''}
          </div>
        `;

        const stopIcon = L.divIcon({
          html: stopHtml,
          className: 'custom-stop-div-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([stop.stop_lat, stop.stop_lon], { icon: stopIcon })
          .addTo(map)
          .bindPopup(
            `<b>${stop.stop_name}</b><br/><span style="opacity:.7; font-size:11px;">${stop.stop_lat.toFixed(5)}, ${stop.stop_lon.toFixed(5)}</span>`
          );

        if (onSelectStop) marker.on('click', () => onSelectStop(stop));
        leafletStopsRef.current.push(marker);
      });

      MOCK_PROMO_PINS.forEach((pin) => {
        const palette = {
          coffee: { border: '#f59e0b', glow: 'rgba(245,158,11,0.45)', emoji: '☕' },
          copy: { border: '#6366f1', glow: 'rgba(99,102,241,0.45)', emoji: '📄' },
          store: { border: '#a855f7', glow: 'rgba(168,85,247,0.45)', emoji: '🛒' }
        }[pin.category];

        const pinHtml = `
          <div style="position:relative; display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9999px; border:2px solid ${palette.border}; background:rgba(15,15,22,0.85); box-shadow:0 0 18px ${palette.glow}; cursor:pointer; font-size:16px;">
            <span style="position:absolute; inset:0; border-radius:9999px; border:2px solid ${palette.border}; opacity:.35;" class="animate-ping"></span>
            ${palette.emoji}
          </div>
        `;

        const promoIcon = L.divIcon({
          html: pinHtml,
          className: 'custom-promo-div-icon',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const promoMarker = L.marker([pin.latitude, pin.longitude], { icon: promoIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: var(--font-sans, sans-serif); padding:4px; max-width:220px;">
              <div style="display:flex; align-items:center; gap:6px; font-weight:800; font-size:13px; color:${palette.border};">
                <span>🌟</span> ${pin.business_name}
              </div>
              <p style="font-size:11px; opacity:.85; line-height:1.4; margin:6px 0 8px 0;">${pin.description}</p>
              <div style="padding:6px 10px; background:rgba(245,158,11,0.12); border:1px dashed ${palette.border}; border-radius:8px; text-align:center; font-family:monospace; font-size:12px; font-weight:900; letter-spacing:1px;">
                ${pin.coupon_code}
              </div>
            </div>
          `);

        leafletPromoPinsRef.current.push(promoMarker);
      });
    });
  }, [isMapReady, stops, routePath, selectedRoute, activeAlarmStopId, onSelectStop]);

  // Smooth vehicle interpolation.
  useEffect(() => {
    if (!isMapReady) return;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      const map = leafletMapRef.current;
      if (!map) return;

      const activeIds = new Set(vehicles.map((v) => v.vehicle_id));

      Object.keys(leafletVehiclesRef.current).forEach((id) => {
        if (!activeIds.has(id)) {
          leafletVehiclesRef.current[id].marker.remove();
          delete leafletVehiclesRef.current[id];
        }
      });

      vehicles.forEach((v) => {
        let color = '#10b981';
        if (v.congestion_status === 'normal') color = '#f59e0b';
        if (v.congestion_status === 'crowded') color = '#ef4444';

        const vehicleHtml = `
          <div class="custom-vehicle-marker" style="background:${color};">
            <div style="transform: rotate(${v.bearing || 0}deg); display:flex; align-items:center; justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2 L20 21 L12 16 L4 21 Z"/></svg>
            </div>
          </div>
        `;

        const vehicleIcon = L.divIcon({
          html: vehicleHtml,
          className: 'custom-vehicle-div-icon',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const cached = leafletVehiclesRef.current[v.vehicle_id];
        const popupHtml = `
          <div style="font-family: var(--font-sans, sans-serif); padding:6px 8px;">
            <b style="font-size:13px;">Маршрут №${v.route_short_name || '—'}</b><br/>
            <span style="font-size:11px;">${v.congestion_status === 'empty' ? '🟢 Бош' : v.congestion_status === 'normal' ? '🟡 Орточо' : '🔴 Толгон'}</span><br/>
            <span style="font-size:11px;">Ылдамдык: ${v.speed || 0} км/саат</span><br/>
            <span style="font-size:10px; opacity:.6;">Жаңыртылды: ${new Date(v.last_updated).toLocaleTimeString()}</span>
          </div>
        `;

        if (cached) {
          const { marker } = cached;
          marker.setIcon(vehicleIcon);
          marker.getPopup()?.setContent(popupHtml);

          const startLat = cached.lat;
          const startLon = cached.lon;
          const endLat = v.latitude;
          const endLon = v.longitude;
          const duration = 2200;
          const startTime = performance.now();

          const step = (now: number) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const ease = t * (2 - t);
            marker.setLatLng([lerp(startLat, endLat, ease), lerp(startLon, endLon, ease)]);
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);

          leafletVehiclesRef.current[v.vehicle_id] = { marker, lat: endLat, lon: endLon };
        } else {
          const marker = L.marker([v.latitude, v.longitude], { icon: vehicleIcon })
            .addTo(map)
            .bindPopup(popupHtml);
          leafletVehiclesRef.current[v.vehicle_id] = {
            marker,
            lat: v.latitude,
            lon: v.longitude
          };
        }
      });
    });
  }, [isMapReady, vehicles]);

  if (!isClient) return <div className="w-full h-full bg-[var(--background)]" />;

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

      <div className="absolute top-24 left-4 z-10 pointer-events-none flex flex-col gap-1.5">
        <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest rounded-lg bg-[var(--bg-primary)] backdrop-blur-md border border-[var(--border-color)] text-[var(--text-secondary)] pointer-events-auto flex items-center gap-1.5 shadow-lg select-none">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          LEAFLET • OSM
        </div>
      </div>
    </div>
  );
}
