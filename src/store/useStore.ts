import { create } from 'zustand';
import { Route, Stop, VehicleLocation } from '@/lib/supabase';

export type ThemeMode = 'dark' | 'light';

interface AppState {
  selectedRoute: Route | null;
  stops: Stop[];
  vehicles: VehicleLocation[];

  theme: ThemeMode;
  activeAlarmStopId: string | null;

  isListening: boolean;
  aiResponse: string | null;
  isLoading: boolean;

  driverActiveTripId: string | null;
  driverIsActive: boolean;

  setSelectedRoute: (route: Route | null) => void;
  setStops: (stops: Stop[]) => void;
  setVehicles: (vehicles: VehicleLocation[]) => void;
  setTheme: (theme: ThemeMode) => void;
  setActiveAlarmStopId: (stopId: string | null) => void;
  setIsListening: (isListening: boolean) => void;
  setAiResponse: (aiResponse: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setDriverActiveTripId: (tripId: string | null) => void;
  setDriverIsActive: (isActive: boolean) => void;
}

const readInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem('oshauto_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'dark';
};

export const useStore = create<AppState>((set) => ({
  selectedRoute: null,
  stops: [],
  vehicles: [],
  theme: readInitialTheme(),
  activeAlarmStopId: null,
  isListening: false,
  aiResponse: null,
  isLoading: false,
  driverActiveTripId: null,
  driverIsActive: false,

  setSelectedRoute: (route) => set({ selectedRoute: route }),
  setStops: (stops) => set({ stops }),
  setVehicles: (vehicles) => set({ vehicles }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('oshauto_theme', theme);
      } catch {}
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },
  setActiveAlarmStopId: (stopId) => set({ activeAlarmStopId: stopId }),
  setIsListening: (isListening) => set({ isListening }),
  setAiResponse: (aiResponse) => set({ aiResponse }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setDriverActiveTripId: (tripId) => set({ driverActiveTripId: tripId }),
  setDriverIsActive: (isActive) => set({ driverIsActive: isActive })
}));
