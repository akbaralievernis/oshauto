import { useEffect, useState, useRef } from 'react';

interface GeofenceConfig {
  stopName: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  onArrive?: () => void;
}

export function useGeofenceAlarm() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const watchIdRef = useRef<number | null>(null);
  const configRef = useRef<GeofenceConfig | null>(null);

  // Проверка прав на уведомления при первом рендере
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Функция запроса прав на системные уведомления
  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    return permission === 'granted';
  };

  // Расчет расстояния по формуле Гаверсинуса (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Радиус Земли в метрах
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Дистанция в метрах
  };

  // Очистка отслеживания геопозиции
  const stopAlarm = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsActive(false);
    setCurrentDistance(null);
  };

  // Запуск гео-будильника
  const startAlarm = async (config: GeofenceConfig) => {
    configRef.current = config;
    
    // Запрашиваем разрешения
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        alert('Для работы гео-будильника требуются системные уведомления!');
        return;
      }
    }

    if (!('geolocation' in navigator)) {
      alert('Геолокация не поддерживается вашим устройством!');
      return;
    }

    stopAlarm(); // Сбрасываем старый вотчер, если был запущен
    setIsActive(true);

    const radius = config.radiusMeters || 500; // Радиус по умолчанию 500 метров

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const target = configRef.current;
        
        if (!target) return;

        const dist = calculateDistance(latitude, longitude, target.latitude, target.longitude);
        setCurrentDistance(Math.round(dist));

        // Если вошли в радиус геозоны
        if (dist <= radius) {
          // Отправляем пуш-уведомление
          new Notification('Пора выходить! 🚌', {
            body: `Вы приближаетесь к остановке "${target.stopName}" (осталось ${Math.round(dist)}м). Приготовьтесь к выходу.`,
            icon: '/favicon.ico',
            tag: 'geofence-arrival',
            requireInteraction: true // Оставляем уведомление висеть на экране
          });

          // Вызов коллбэка прибытия
          if (target.onArrive) {
            target.onArrive();
          }

          // Выключаем будильник после срабатывания
          stopAlarm();
        }
      },
      (error) => {
        console.error('Ошибка геолокации:', error);
        stopAlarm();
        alert('Не удалось определить положение GPS для гео-будильника.');
      },
      {
        enableHighAccuracy: true, // Максимальная точность GPS-приемника
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Автоматическая очистка ресурсов при размонтировании
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isActive,
    currentDistance,
    permissionStatus,
    startAlarm,
    stopAlarm,
    requestPermission
  };
}
