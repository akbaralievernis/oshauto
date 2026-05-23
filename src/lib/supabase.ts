import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Инициализация клиента Supabase. 
// Если переменные окружения отсутствуют, мы используем заглушки,
// чтобы приложение не падало при сборке и первом запуске без ключей.
const isClientConfigured = !!supabaseUrl && !!supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project-id.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-anon-key'
);

if (!isClientConfigured) {
  console.warn(
    '⚠️ Supabase URL or Anon Key is missing. OshAuto is running in DEMO mode with mock data.'
  );
}

export { isClientConfigured };

// Интерфейсы данных GTFS для типизации
export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_desc?: string;
  route_type: number;
  route_color: string;
  route_text_color: string;
}

export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_desc?: string;
  stop_lat: number;
  stop_lon: number;
  geom?: any;
}

export interface VehicleLocation {
  vehicle_id: string;
  trip_id?: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  congestion_status: 'empty' | 'normal' | 'crowded';
  last_updated: string;
  route_short_name?: string; // Для удобства отображения
}

// -------------------------------------------------------------
// ВЫСОКОКАЧЕСТВЕННЫЕ ДЕМО-ДАННЫЕ ДЛЯ ГОРОДА ОШ (Кыргызстан)
// Используются при отсутствии подключения к Supabase
// -------------------------------------------------------------
export const MOCK_ROUTES: Route[] = [
  {
    route_id: '105',
    route_short_name: '105',
    route_long_name: 'ХБК — Микрорайон Ак-Тилек',
    route_desc: 'Один из самых популярных маршрутов города Ош, соединяющий промышленный район ХБК с спальным микрорайоном Ак-Тилек.',
    route_type: 3,
    route_color: 'ef4444', // Красный
    route_text_color: 'ffffff'
  },
  {
    route_id: '111',
    route_short_name: '111',
    route_long_name: 'Микрорайон Анар — Западный (Араванская)',
    route_desc: 'Соединяет микрорайон Анар, проходя через центральную площадь, Араванскую улицу до западных окраин.',
    route_type: 3,
    route_color: '3b82f6', // Синий
    route_text_color: 'ffffff'
  },
  {
    route_id: '124',
    route_short_name: '124',
    route_long_name: 'Автовокзал — Сулейман-Тоо — Юго-Восток',
    route_desc: 'Туристический маршрут, проходящий мимо священной горы Сулейман-Тоо и соединяющий автовокзал с районом Юго-Восток.',
    route_type: 3,
    route_color: '10b981', // Зеленый
    route_text_color: 'ffffff'
  },
  {
    route_id: '142',
    route_short_name: '142',
    route_long_name: 'Фрунзенский рынок — Микрорайон Достук',
    route_desc: 'Соединяет оживленный район Фрунзенского рынка с микрорайоном Достук.',
    route_type: 3,
    route_color: 'f59e0b', // Оранжевый
    route_text_color: '000000'
  }
];

export const MOCK_STOPS: Record<string, Stop[]> = {
  '105': [
    { stop_id: 'hbk', stop_name: 'ХБК (Конечная)', stop_lat: 40.5512, stop_lon: 72.8256 },
    { stop_id: 'shveinaya', stop_name: 'Швейная фабрика', stop_lat: 40.5423, stop_lon: 72.8123 },
    { stop_id: 'masaliev', stop_name: 'Улица Масалиева', stop_lat: 40.5312, stop_lon: 72.8012 },
    { stop_id: 'aravanskaya_105', stop_name: 'Араванская', stop_lat: 40.5215, stop_lon: 72.7981 },
    { stop_id: 'ak_tilek', stop_name: 'мкрн. Ак-Тилек (Конечная)', stop_lat: 40.5056, stop_lon: 72.8112 }
  ],
  '111': [
    { stop_id: 'anar', stop_name: 'мкрн. Анар (Конечная)', stop_lat: 40.5412, stop_lon: 72.7756 },
    { stop_id: 'cheremushki', stop_name: 'Черемушки', stop_lat: 40.5323, stop_lon: 72.7845 },
    { stop_id: 'ploshad', stop_name: 'Центральная площадь', stop_lat: 40.5280, stop_lon: 72.7990 },
    { stop_id: 'aravanskaya_111', stop_name: 'Араванская', stop_lat: 40.5215, stop_lon: 72.7981 },
    { stop_id: 'zapadny', stop_name: 'Западный (Конечная)', stop_lat: 40.5112, stop_lon: 72.7612 }
  ],
  '124': [
    { stop_id: 'vokzal', stop_name: 'Новый Автовокзал', stop_lat: 40.5654, stop_lon: 72.7912 },
    { stop_id: 'kg_filial', stop_name: 'Кыргызтелеком', stop_lat: 40.5412, stop_lon: 72.7985 },
    { stop_id: 'suleiman_too', stop_name: 'Гора Сулейман-Тоо', stop_lat: 40.5292, stop_lon: 72.7865 },
    { stop_id: 'philarmonia', stop_name: 'Филармония', stop_lat: 40.5180, stop_lon: 72.8020 },
    { stop_id: 'ugo_vostok', stop_name: 'мкрн. Юго-Восток (Конечная)', stop_lat: 40.5012, stop_lon: 72.8285 }
  ],
  '142': [
    { stop_id: 'frunze_market', stop_name: 'Фрунзенский рынок', stop_lat: 40.5350, stop_lon: 72.8190 },
    { stop_id: 'navoi', stop_name: 'Улица Навои', stop_lat: 40.5265, stop_lon: 72.8080 },
    { stop_id: 'bazar', stop_name: 'Центральный Базар', stop_lat: 40.5230, stop_lon: 72.8010 },
    { stop_id: 'dostuk', stop_name: 'мкрн. Достук (Конечная)', stop_lat: 40.5480, stop_lon: 72.8390 }
  ]
};

export const MOCK_VEHICLES: VehicleLocation[] = [
  {
    vehicle_id: 'v1',
    latitude: 40.5360,
    longitude: 72.8060,
    bearing: 145,
    speed: 35,
    congestion_status: 'normal',
    last_updated: new Date().toISOString(),
    route_short_name: '105'
  },
  {
    vehicle_id: 'v2',
    latitude: 40.5120,
    longitude: 72.8020,
    bearing: 12,
    speed: 40,
    congestion_status: 'empty',
    last_updated: new Date().toISOString(),
    route_short_name: '105'
  },
  {
    vehicle_id: 'v3',
    latitude: 40.5280,
    longitude: 72.7990,
    bearing: 280,
    speed: 0,
    congestion_status: 'crowded',
    last_updated: new Date().toISOString(),
    route_short_name: '111'
  },
  {
    vehicle_id: 'v4',
    latitude: 40.5240,
    longitude: 72.7880,
    bearing: 45,
    speed: 15,
    congestion_status: 'normal',
    last_updated: new Date().toISOString(),
    route_short_name: '124'
  }
];
