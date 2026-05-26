'use client';

import { Route, Stop, MOCK_ROUTES, MOCK_STOPS } from './supabase';

const STORAGE_KEY = 'oshauto_custom_routes_v1';

export interface CustomRouteRecord {
  route: Route;
  stops: Stop[];
  interval_minutes?: number;
  operating_hours?: string;
  created_at: string;
}

function readStorage(): CustomRouteRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CustomRouteRecord[];
  } catch (e) {
    console.error('[customRoutes] read error', e);
    return [];
  }
}

function writeStorage(records: CustomRouteRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('oshauto:routes-updated'));
  } catch (e) {
    console.error('[customRoutes] write error', e);
  }
}

const DELETED_KEY = 'oshauto_deleted_routes_v1';

function readDeletedStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed);
  } catch (e) {
    console.error('[customRoutes] read deleted error', e);
    return new Set();
  }
}

function writeDeletedStorage(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(ids)));
    window.dispatchEvent(new CustomEvent('oshauto:routes-updated'));
  } catch (e) {
    console.error('[customRoutes] write deleted error', e);
  }
}

export function getCustomRoutes(): CustomRouteRecord[] {
  const custom = readStorage();
  const customIds = new Set(custom.map((r) => r.route.route_id));
  const deleted = readDeletedStorage();

  // Отсекаем удаленные кастомные маршруты
  const activeCustom = custom.filter((r) => !deleted.has(r.route.route_id));

  // Получаем встроенные (mock) маршруты, которые не были изменены (нет в custom) и не были удалены
  const builtinRecords: CustomRouteRecord[] = MOCK_ROUTES
    .filter((r) => !customIds.has(r.route_id) && !deleted.has(r.route_id))
    .map((route) => ({
      route,
      stops: MOCK_STOPS[route.route_id] || [],
      interval_minutes: 10,
      operating_hours: '06:00 - 21:30',
      created_at: new Date('2026-05-26T00:00:00.000Z').toISOString()
    }));

  return [...activeCustom, ...builtinRecords];
}

export function saveCustomRoute(record: CustomRouteRecord) {
  const list = readStorage();
  const i = list.findIndex((r) => r.route.route_id === record.route.route_id);
  if (i >= 0) {
    list[i] = record;
  } else {
    list.push(record);
  }
  writeStorage(list);

  // Если маршрут был в удаленных, убираем его оттуда (восстановление при сохранении)
  const deleted = readDeletedStorage();
  if (deleted.has(record.route.route_id)) {
    deleted.delete(record.route.route_id);
    writeDeletedStorage(deleted);
  }
}

export function deleteCustomRoute(routeId: string) {
  // Удаляем из списка кастомных
  const list = readStorage().filter((r) => r.route.route_id !== routeId);
  writeStorage(list);

  // Добавляем в список удаленных
  const deleted = readDeletedStorage();
  deleted.add(routeId);
  writeDeletedStorage(deleted);
}

export function getAllRoutes(): Route[] {
  const deleted = readDeletedStorage();
  const custom = readStorage()
    .filter((r) => !deleted.has(r.route.route_id))
    .map((r) => r.route);
  const customIds = new Set(custom.map((c) => c.route_id));
  const builtin = MOCK_ROUTES.filter((r) => !customIds.has(r.route_id) && !deleted.has(r.route_id));
  return [...custom, ...builtin];
}

export function getStopsForRoute(routeId: string): Stop[] {
  const deleted = readDeletedStorage();
  if (deleted.has(routeId)) return [];

  const custom = readStorage().find((r) => r.route.route_id === routeId);
  if (custom) return custom.stops;
  return MOCK_STOPS[routeId] || [];
}

export function getRouteById(routeId: string): Route | null {
  return getAllRoutes().find((r) => r.route_id === routeId) || null;
}

