import { useEffect, useState } from 'react';
import { supabase, isClientConfigured, MOCK_VEHICLES, VehicleLocation } from '@/lib/supabase';

export function useSupabaseRealtime(selectedRouteShortName: string | null) {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>(MOCK_VEHICLES);
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    if (isClientConfigured) {
      // -------------------------------------------------------------
      // РЕАЛЬНЫЙ СЦЕНАРИЙ: ПОДКЛЮЧЕНИЕ К SUPABASE REALTIME
      // -------------------------------------------------------------
      setIsLive(true);
      
      // Первоначальный запрос текущих координат
      const fetchInitialLocations = async () => {
        const { data, error } = await supabase
          .from('vehicle_locations')
          .select('vehicle_id, latitude, longitude, bearing, speed, congestion_status, last_updated, trips(routes(route_short_name))');
        if (!error && data) {
          const formatted: VehicleLocation[] = data.map((v: any) => ({
            vehicle_id: v.vehicle_id,
            latitude: v.latitude,
            longitude: v.longitude,
            bearing: Number(v.bearing || 0),
            speed: Number(v.speed || 0),
            congestion_status: v.congestion_status || 'normal',
            last_updated: v.last_updated,
            route_short_name: v.trips?.routes?.route_short_name || '?'
          }));
          setVehicles(formatted);
        }
      };

      fetchInitialLocations();

      // Подписка на вебсокет-канал реального времени Supabase Realtime
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vehicle_locations' },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newLocation = payload.new as any;
              
              setVehicles((prev) => {
                const index = prev.findIndex((v) => v.vehicle_id === newLocation.vehicle_id);
                const updatedVehicle: VehicleLocation = {
                  vehicle_id: newLocation.vehicle_id,
                  latitude: newLocation.latitude,
                  longitude: newLocation.longitude,
                  bearing: Number(newLocation.bearing || 0),
                  speed: Number(newLocation.speed || 0),
                  congestion_status: newLocation.congestion_status || 'normal',
                  last_updated: newLocation.last_updated,
                  route_short_name: prev[index]?.route_short_name || '105' // сохраняем или подтягиваем
                };

                if (index > -1) {
                  const copy = [...prev];
                  copy[index] = updatedVehicle;
                  return copy;
                } else {
                  return [...prev, updatedVehicle];
                }
              });
            } else if (payload.eventType === 'DELETE') {
              const oldLocation = payload.old as any;
              setVehicles((prev) => prev.filter((v) => v.vehicle_id !== oldLocation.vehicle_id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // -------------------------------------------------------------
      // ДЕМО СЦЕНАРИЙ: СИМУЛЯЦИЯ ДВИЖЕНИЯ ТРАНСПОРТА
      // -------------------------------------------------------------
      setIsLive(false);

      const interval = setInterval(() => {
        setVehicles((prev) =>
          prev.map((v) => {
            // Симулируем легкое перемещение машины по городу Ош
            const isMoving = Math.random() > 0.15; // 85% вероятность движения
            if (!isMoving) return v;

            const latDelta = (Math.random() - 0.5) * 0.0002;
            const lonDelta = (Math.random() - 0.5) * 0.0002;
            
            // Рассчитываем примерный новый угол движения (bearing)
            const angle = Math.atan2(lonDelta, latDelta) * (180 / Math.PI);
            const formattedBearing = angle < 0 ? angle + 360 : angle;

            return {
              ...v,
              latitude: v.latitude + latDelta,
              longitude: v.longitude + lonDelta,
              bearing: Math.round(formattedBearing),
              speed: Math.round(15 + Math.random() * 30), // скорость от 15 до 45 км/ч
              last_updated: new Date().toISOString()
            };
          })
        );
      }, 3000); // Обновляем симуляцию каждые 3 секунды

      return () => clearInterval(interval);
    }
  }, []);

  // Фильтруем машины по выбранному маршруту, если фильтр включен
  const filteredVehicles = selectedRouteShortName
    ? vehicles.filter((v) => v.route_short_name === selectedRouteShortName)
    : vehicles;

  // Функция для водителей — симуляция отправки геопозиции
  const updateDriverPosition = async (
    vehicleId: string,
    lat: number,
    lon: number,
    congestion?: 'empty' | 'normal' | 'crowded'
  ) => {
    if (isClientConfigured) {
      const { error } = await supabase
        .from('vehicle_locations')
        .upsert({
          vehicle_id: vehicleId,
          latitude: lat,
          longitude: lon,
          bearing: Math.round(Math.random() * 360),
          speed: 25,
          congestion_status: congestion || 'normal',
          last_updated: new Date().toISOString()
        });
      return !error;
    } else {
      // Для демо обновляем локальное состояние симулятора
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicle_id === vehicleId
            ? {
                ...v,
                latitude: lat,
                longitude: lon,
                congestion_status: congestion || v.congestion_status,
                last_updated: new Date().toISOString()
              }
            : v
        )
      );
      return true;
    }
  };

  return {
    vehicles: filteredVehicles,
    isLive,
    updateDriverPosition
  };
}
