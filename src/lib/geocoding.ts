// Утилиты разбора и геокодирования остановок (для админ-панели).
// Geocoder использует OpenStreetMap Nominatim (бесплатный, лимит ~1 запрос/сек).
// Поэтому делается последовательно с задержкой.

export interface ParsedStop {
  name: string;
  lat?: number;
  lon?: number;
}

// Эти строки в массовом импорте — это региональные пометки, отфильтровываем
const REGION_PATTERNS: RegExp[] = [
  /Ош\s*г\./i,
  /\bКыргызстан\b/i,
  /\bОшская область\b/i,
  /\bКара-Суйский район\b/i,
  /^\s*Ош\s*$/i,
  /\bреспубликанского значения\b/i,
  /\bресп\.?\s*значения\b/i,
  /\bс\.\s*\(/i, // "Кызыл-Кыштак с. (..."
  /^г\./i,
  /^обл\./i,
  /^р-н\./i
];

const STOP_HINT_WORDS = /^\s*(Автобус|Маршрут|Бус|Каждые|Кольцевой|Конечная)\b/i;

function isRegionLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (t.length < 2) return true;
  // Чёткие региональные шаблоны
  for (const p of REGION_PATTERNS) {
    if (p.test(t)) return true;
  }
  return false;
}

function isMetaLine(line: string): boolean {
  const t = line.trim();
  if (STOP_HINT_WORDS.test(t)) return true;
  if (/^[А-ЯA-Z]+\s*→/.test(t)) return true; // "Борбордук базар → ..."
  if (/^[A-Za-zА-Яа-я0-9]+\s*-\s*[A-Za-zА-Яа-я0-9]+\s*$/i.test(t) && t.length < 5) {
    return true;
  }
  return false;
}

// Парсинг массового ввода: текст в массив остановок.
// Поддерживает форматы:
//   1) "Название" (одна остановка в строке)
//   2) "Название; lat; lon" или "Название, lat, lon" или TAB-разделители
export function parseStopsInput(text: string): ParsedStop[] {
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const result: ParsedStop[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (isRegionLine(line) || isMetaLine(line)) continue;

    // Попытка извлечь координаты по сепаратору ; или , или табу
    const sepMatch = line.split(/[;\t]|,(?=\s*-?\d)/);
    if (sepMatch.length >= 3) {
      const name = sepMatch[0].trim();
      const lat = Number(sepMatch[1]);
      const lon = Number(sepMatch[2]);
      if (name && isFinite(lat) && isFinite(lon)) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ name, lat, lon });
        }
        continue;
      }
    }

    // Иначе — только название
    const cleanName = line.replace(/\s+/g, ' ').trim();
    if (cleanName.length < 2) continue;
    const key = cleanName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ name: cleanName });
  }

  return result;
}

// Геокодирование одной остановки через Nominatim с привязкой к Ошу.
// viewbox: lon1,lat1,lon2,lat2 (west, north, east, south) с bounded=1.
const OSH_VIEWBOX = '72.6,40.65,72.95,40.40';

export async function geocodeStopName(
  name: string
): Promise<{ lat: number; lon: number } | null> {
  if (!name) return null;

  const queries = [
    `${name}, Ош, Кыргызстан`,
    `${name} остановка, Ош`,
    `${name}, Osh, Kyrgyzstan`
  ];

  for (const q of queries) {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(q)}` +
      `&format=json&limit=1&viewbox=${OSH_VIEWBOX}&bounded=1&accept-language=ru`;

    try {
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'ru' }
      });
      if (!res.ok) continue;
      const arr = await res.json();
      if (Array.isArray(arr) && arr.length > 0) {
        const lat = Number(arr[0].lat);
        const lon = Number(arr[0].lon);
        if (isFinite(lat) && isFinite(lon)) {
          return { lat, lon };
        }
      }
    } catch {
      // ignore, попробуем следующий вариант
    }
  }
  return null;
}

// Поочередное геокодирование всех остановок с прогрессом и тротлингом.
export async function geocodeStops(
  stops: ParsedStop[],
  onProgress?: (i: number, total: number, stop: ParsedStop, found: boolean) => void
): Promise<ParsedStop[]> {
  const result: ParsedStop[] = [];

  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];

    if (typeof s.lat === 'number' && typeof s.lon === 'number') {
      result.push(s);
      onProgress?.(i + 1, stops.length, s, true);
      continue;
    }

    const r = await geocodeStopName(s.name);
    const enriched: ParsedStop = r
      ? { name: s.name, lat: r.lat, lon: r.lon }
      : { name: s.name };
    result.push(enriched);
    onProgress?.(i + 1, stops.length, enriched, Boolean(r));

    // Нагрузочный лимит Nominatim: 1 запрос/сек
    if (i < stops.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return result;
}
