import { create } from 'zustand';
import { Route, Stop, VehicleLocation } from '@/lib/supabase';

interface AppState {
  // Состояние маршрутов и остановок
  selectedRoute: Route | null;
  stops: Stop[];
  vehicles: VehicleLocation[];
  
  // Системные настройки
  theme: 'dark' | 'outdoor';
  activeAlarmStopId: string | null;
  
  // Состояние ИИ-виджета
  isListening: boolean;
  aiResponse: string | null;
  isLoading: boolean;
  
  // Состояние водителя
  driverActiveTripId: string | null;
  driverIsActive: boolean;

  // Экшены (Методы изменения состояния)
  setSelectedRoute: (route: Route | null) => void;
  setStops: (stops: Stop[]) => void;
  setVehicles: (vehicles: VehicleLocation[]) => void;
  setTheme: (theme: 'dark' | 'outdoor') => void;
  setActiveAlarmStopId: (stopId: string | null) => void;
  setIsListening: (isListening: boolean) => void;
  setAiResponse: (aiResponse: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setDriverActiveTripId: (tripId: string | null) => void;
  setDriverIsActive: (isActive: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Первоначальный стейт
  selectedRoute: null,
  stops: [],
  vehicles: [],
  theme: 'dark',
  activeAlarmStopId: null,
  isListening: false,
  aiResponse: null,
  isLoading: false,
  driverActiveTripId: null,
  driverIsActive: false,

  // Реализация методов
  setSelectedRoute: (route) => set({ selectedRoute: route }),
  setStops: (stops) => set({ stops }),
  setVehicles: (vehicles) => set({ vehicles }),
  setTheme: (theme) => set({ theme }),
  setActiveAlarmStopId: (stopId) => set({ activeAlarmStopId: stopId }),
  setIsListening: (isListening) => set({ isListening }),
  setAiResponse: (aiResponse) => set({ aiResponse }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setDriverActiveTripId: (tripId) => set({ driverActiveTripId: tripId }),
  setDriverIsActive: (isActive) => set({ driverIsActive: isActive }),
}));
