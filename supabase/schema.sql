-- ==========================================
-- OshAuto Database Schema (Supabase + PostGIS + pgvector)
-- Схема базы данных общественного транспорта города Ош
-- Разработано в соответствии со стандартами GTFS и требованиями реального времени
-- ==========================================

-- 1. ПОДКЛЮЧЕНИЕ РАСШИРЕНИЙ (Extensions)
-- ==========================================
create extension if not exists postgis;
create extension if not exists vector;

-- Сброс таблиц перед созданием для чистой инициализации (раскомментировать при необходимости)
-- drop table if exists route_embeddings;
-- drop table if exists stop_events;
-- drop table if exists vehicle_locations;
-- drop table if exists trips;
-- drop table if exists shapes;
-- drop table if exists stops;
-- drop table if exists routes;

-- 2. СОЗДАНИЕ ТАБЛИЦ СТАНДАРТА GTFS
-- ==========================================

-- Таблица маршрутов (routes)
create table routes (
    route_id text primary key,
    route_short_name text not null,       -- Номер маршрутки или автобуса (например, "105", "12")
    route_long_name text not null,        -- Полное описание маршрута (например, "ХБК — мкрн. Ак-Тилек")
    route_desc text,                      -- Дополнительное описание
    route_type integer not null default 3,-- 3 = Автобус/маршрутное такси по классификации GTFS
    route_color text default '3b82f6',    -- HEX-цвет линии маршрута для отображения на карте (по умолчанию синий)
    route_text_color text default 'ffffff',-- Цвет шрифта поверх цвета маршрута
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table routes is 'Таблица маршрутов общественного транспорта города Ош';

-- Таблица остановок (stops)
create table stops (
    stop_id text primary key,
    stop_name text not null,              -- Название остановки (например, "Араванская", "Сулейман-Тоо")
    stop_desc text,                       -- Ориентиры или описание
    stop_lat double precision not null,   -- Широта (Latitude)
    stop_lon double precision not null,   -- Долгота (Longitude)
    geom geometry(Point, 4326) not null,  -- Геометрия PostGIS в системе координат WGS 84 (SRID 4326)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table stops is 'Таблица остановок с поддержкой пространственных индексов PostGIS';

-- Пространственный индекс для быстрого поиска остановок в радиусе координат
create index if not exists stops_geom_idx on stops using gist (geom);

-- Таблица точек путей движения (shapes)
-- Хранит детальный путь (полилинию) маршрута в виде последовательности точек
create table shapes (
    shape_id text not null,
    shape_pt_sequence integer not null,
    shape_pt_lat double precision not null,
    shape_pt_lon double precision not null,
    geom geometry(Point, 4326) not null,
    primary key (shape_id, shape_pt_sequence)
);

comment on table shapes is 'Детализированные геометрические пути следования маршрутов (линии движения)';

create index if not exists shapes_geom_idx on shapes using gist (geom);

-- Таблица рейсов (trips)
-- Связывает маршрут с конкретным путем следования (shape) и расписанием
create table trips (
    trip_id text primary key,
    route_id text references routes(route_id) on delete cascade not null,
    service_id text not null default 'daily', -- Тип обслуживания (ежедневно, будни и т.д.)
    trip_headsign text,                        -- Конечная станция отображаемая на табло (например, "мкрн. Анар")
    direction_id integer check (direction_id in (0, 1)) default 0, -- 0 = туда, 1 = обратно
    shape_id text,                             -- Ссылка на группу точек пути в shapes
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table trips is 'Рейсы общественного транспорта, связывающие маршруты с гео-формами';

-- 3. СОЗДАНИЕ ТАБЛИЦ ДЛЯ REAL-TIME И ГЕОЗОНИРОВАНИЯ
-- ==========================================

-- Таблица позиций транспорта (vehicle_locations)
create table vehicle_locations (
    vehicle_id text primary key,
    trip_id text references trips(trip_id) on delete set null,
    driver_id uuid references auth.users(id) on delete set null, -- Связь с пользователем-водителем в Supabase Auth
    latitude double precision not null,
    longitude double precision not null,
    geom geometry(Point, 4326) not null,                         -- Текущая геометрия PostGIS
    bearing numeric,                                             -- Угол направления движения (0-360 градусов)
    speed numeric,                                               -- Скорость в км/ч
    congestion_status text check (congestion_status in ('empty', 'normal', 'crowded')) default 'normal', -- Загруженность
    last_updated timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table vehicle_locations is 'Позиции машин в реальном времени, обновляемые водителями или GPS-трекерами';

create index if not exists vehicle_locations_geom_idx on vehicle_locations using gist (geom);

-- Таблица событий прибытия на остановки (stop_events)
create table stop_events (
    id bigserial primary key,
    vehicle_id text not null,
    stop_id text references stops(stop_id) on delete cascade not null,
    event_type text check (event_type in ('arrival', 'departure')) not null,
    event_time timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table stop_events is 'Лог событий прибытия и убытия транспорта на остановки (формируется гео-триггером)';

-- 4. ГЕО-ТРИГГЕРЫ НА СТОРОНЕ БАЗЫ ДАННЫХ (Geofencing Trigger)
-- ==========================================

-- Функция автоматического расчета вхождения транспорта в геозону остановки (100 метров)
create or replace function check_stop_geofence()
returns trigger as $$
declare
    target_stop record;
    radius_meters float := 100.0; -- Радиус определения прибытия на остановку в метрах
begin
    -- Поиск ближайшей остановки на пути следования в радиусе 100 метров от новой координаты
    select s.stop_id, s.stop_name
    into target_stop
    from stops s
    where ST_DWithin(
        new.geom::geography,
        s.geom::geography,
        radius_meters
    )
    limit 1;

    -- Если транспорт вошел в радиус остановки
    if target_stop.stop_id is not null then
        -- Проверяем, не регистрировали ли мы уже событие прибытия на эту же остановку за последние 2 минуты
        -- Это предотвращает дублирование записей при стоянке транспорта или медленном движении
        if not exists (
            select 1 from stop_events se
            where se.vehicle_id = new.vehicle_id
              and se.stop_id = target_stop.stop_id
              and se.event_time > now() - interval '2 minutes'
        ) then
            -- Добавляем запись о прибытии
            insert into stop_events (vehicle_id, stop_id, event_type, event_time)
            values (new.vehicle_id, target_stop.stop_id, 'arrival', now());
        end if;
    end if;

    return new;
end;
$$ language plpgsql;

-- Триггер, срабатывающий при обновлении гео-координат машины
create trigger trg_vehicle_geofence
after insert or update of geom on vehicle_locations
for each row execute function check_stop_geofence();

-- Вспомогательная функция для автоматического преобразования шир/долг в тип Geometry при вставке/обновлении
create or replace function update_geom_from_latlon()
returns trigger as $$
begin
    new.geom := ST_SetSRID(ST_MakePoint(new.longitude, new.latitude), 4326);
    return new;
end;
$$ language plpgsql;

-- Триггер для авто-заполнения geom для остановок
create trigger trg_stops_geom
before insert or update of stop_lat, stop_lon on stops
for each row execute function update_geom_from_latlon();

-- Триггер для авто-заполнения geom для shapes
create trigger trg_shapes_geom
before insert or update of shape_pt_lat, shape_pt_lon on shapes
for each row execute function update_geom_from_latlon();

-- Триггер для авто-заполнения geom для позиций машин
create trigger trg_vehicle_geom
before insert or update of latitude, longitude on vehicle_locations
for each row execute function update_geom_from_latlon();

-- 5. ТАБЛИЦА ВЕКТОРНЫХ ДАННЫХ И ИНТЕЛЛЕКТУАЛЬНЫЙ ПОИСК (RAG & pgvector)
-- ==========================================

-- Таблица эмбеддингов описаний маршрутов для ИИ-ассистента
create table route_embeddings (
    id bigserial primary key,
    route_id text references routes(route_id) on delete cascade not null,
    content text not null,                  -- Детализированное описание текстом (например: "Маршрут 105. Следует от Араванская до ХБК через Фрунзе. Интервал 7 минут.")
    embedding vector(1536) not null,        -- Векторное представление размерности 1536 (OpenAI text-embedding-3-small)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table route_embeddings is 'Таблица для хранения векторных описаний маршрутов под архитектуру RAG';

-- Индекс HNSW для быстрого поиска ближайших векторов по косинусному расстоянию
create index if not exists route_embeddings_embedding_idx on route_embeddings using hnsw (embedding vector_cosine_ops);

-- Функция векторного поиска ближайших маршрутов (RPC-функция для вызова из Supabase Edge Functions)
create or replace function match_routes (
    query_embedding vector(1536),
    match_threshold float,
    match_count int
) returns table (
    id bigint,
    route_id text,
    content text,
    similarity float
) language sql stable as $$
    select
        re.id,
        re.route_id,
        re.content,
        1 - (re.embedding <=> query_embedding) as similarity
    from route_embeddings re
    where 1 - (re.embedding <=> query_embedding) > match_threshold
    order by re.embedding <=> query_embedding
    limit match_count;
$$;

-- 6. БЕЗОПАСНОСТЬ БАЗЫ ДАННЫХ (Row Level Security & Policies)
-- ==========================================

-- Включение RLS на всех таблицах
alter table routes enable row level security;
alter table stops enable row level security;
alter table shapes enable row level security;
alter table trips enable row level security;
alter table vehicle_locations enable row level security;
alter table stop_events enable row level security;
alter table route_embeddings enable row level security;

-- А. Политики для статических данных (routes, stops, shapes, trips)
-- Разрешаем чтение абсолютно всем пользователям (включая анонимных гостей)
create policy "Enable read access for all users on routes" on routes for select using (true);
create policy "Enable read access for all users on stops" on stops for select using (true);
create policy "Enable read access for all users on shapes" on shapes for select using (true);
create policy "Enable read access for all users on trips" on trips for select using (true);

-- Модификация статических данных разрешена только пользователям с ролью 'admin' в токене JWT
create policy "Enable insert/update/delete for admins on routes" on routes for all
    using (auth.jwt() ->> 'role' = 'admin')
    with check (auth.jwt() ->> 'role' = 'admin');

create policy "Enable insert/update/delete for admins on stops" on stops for all
    using (auth.jwt() ->> 'role' = 'admin')
    with check (auth.jwt() ->> 'role' = 'admin');

create policy "Enable insert/update/delete for admins on shapes" on shapes for all
    using (auth.jwt() ->> 'role' = 'admin')
    with check (auth.jwt() ->> 'role' = 'admin');

create policy "Enable insert/update/delete for admins on trips" on trips for all
    using (auth.jwt() ->> 'role' = 'admin')
    with check (auth.jwt() ->> 'role' = 'admin');

-- Б. Политики для позиций машин в реальном времени (vehicle_locations)
-- Чтение разрешено всем пользователям
create policy "Enable read access for all users on vehicle locations" on vehicle_locations for select using (true);

-- Водители могут обновлять и вставлять данные только для своего ID
create policy "Enable insert for drivers for their own vehicle" on vehicle_locations for insert
    with check (auth.uid() = driver_id);

create policy "Enable update for drivers for their own vehicle" on vehicle_locations for update
    using (auth.uid() = driver_id)
    with check (auth.uid() = driver_id);

-- Админ имеет полный доступ к таблице позиций
create policy "Enable full access for admins on vehicle locations" on vehicle_locations for all
    using (auth.jwt() ->> 'role' = 'admin');

-- В. Политики для векторных данных (route_embeddings)
-- Чтение разрешено всем (для поиска через Edge Function)
create policy "Enable read access for all users on route embeddings" on route_embeddings for select using (true);

-- Полный CRUD доступ только у администраторов
create policy "Enable full access for admins on route embeddings" on route_embeddings for all
    using (auth.jwt() ->> 'role' = 'admin');

-- Г. Политики для событий остановок (stop_events)
-- Чтение разрешено всем
create policy "Enable read access for all users on stop events" on stop_events for select using (true);

-- Добавление записей разрешено системе и водителям (через гео-триггер при обновлении позиции)
create policy "Enable insert access for authenticated users on stop events" on stop_events for insert
    with check (auth.role() = 'authenticated');
