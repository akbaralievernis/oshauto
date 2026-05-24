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

export function getCustomRoutes(): CustomRouteRecord[] {
  return readStorage();
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
}

export function deleteCustomRoute(routeId: string) {
  const list = readStorage().filter((r) => r.route.route_id !== routeId);
  writeStorage(list);
}

export function getAllRoutes(): Route[] {
  const custom = readStorage().map((r) => r.route);
  const customIds = new Set(custom.map((c) => c.route_id));
  const builtin = MOCK_ROUTES.filter((r) => !customIds.has(r.route_id));
  return [...custom, ...builtin];
}

export function getStopsForRoute(routeId: string): Stop[] {
  const custom = readStorage().find((r) => r.route.route_id === routeId);
  if (custom) return custom.stops;
  return MOCK_STOPS[routeId] || [];
}

export function getRouteById(routeId: string): Route | null {
  return getAllRoutes().find((r) => r.route_id === routeId) || null;
}
