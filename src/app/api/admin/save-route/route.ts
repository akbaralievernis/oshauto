import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Этот роут выполняется только на сервере и использует SUPABASE_SERVICE_ROLE_KEY,
// который НЕ выставляется наружу. Так мы обходим RLS-политики для админских записей,
// не давая фронту прав сервиса.

export const runtime = 'nodejs';

interface SaveRoutePayload {
  route: {
    route_id: string;
    route_short_name: string;
    route_long_name: string;
    route_desc?: string;
    route_type: number;
    route_color: string;
    route_text_color: string;
  };
  stops: Array<{
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
  }>;
}

function getEnv() {
  let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let adminToken =
    process.env.ADMIN_API_TOKEN || process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  // Динамически читаем .env.local для предотвращения кеширования процесса Next.js и переопределений из ОС
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const keyMatch = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.*)$/m);
      if (keyMatch && keyMatch[1]) {
        serviceKey = keyMatch[1].trim();
      }
      const urlMatch = envContent.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)$/m);
      if (urlMatch && urlMatch[1]) {
        url = urlMatch[1].trim();
      }
    }
  } catch (err) {
    console.error('Error dynamically reading .env.local:', err);
  }

  return { url, serviceKey, adminToken };
}

export async function POST(request: Request) {
  const { url, serviceKey, adminToken } = getEnv();

  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        error:
          'Supabase сервер жөндөлгөн эмес. SUPABASE_URL жана SUPABASE_SERVICE_ROLE_KEY коюңуз.'
      },
      { status: 503 }
    );
  }

  // Проверка пароля (Bearer header)
  if (adminToken) {
    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
    if (token !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let payload: SaveRoutePayload;
  try {
    payload = (await request.json()) as SaveRoutePayload;
  } catch {
    return NextResponse.json({ error: 'Туура эмес JSON' }, { status: 400 });
  }

  if (!payload?.route?.route_id || !Array.isArray(payload.stops)) {
    return NextResponse.json({ error: 'route жана stops талап кылынат' }, { status: 400 });
  }

  // Минимальная валидация остановок
  for (const s of payload.stops) {
    if (
      !s.stop_id ||
      typeof s.stop_lat !== 'number' ||
      typeof s.stop_lon !== 'number' ||
      !Number.isFinite(s.stop_lat) ||
      !Number.isFinite(s.stop_lon)
    ) {
      return NextResponse.json(
        { error: `Аялдамада туура эмес координата: ${s.stop_id || '?'}` },
        { status: 400 }
      );
    }
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 1. Маршрут
    const { error: routeErr } = await supabase.from('routes').upsert(payload.route);
    if (routeErr) throw routeErr;

    // 2. Остановки
    if (payload.stops.length > 0) {
      const { error: stopsErr } = await supabase.from('stops').upsert(payload.stops);
      if (stopsErr) throw stopsErr;
    }

    // 3. Trip (одна на маршрут — для упрощения)
    if (payload.stops.length > 0) {
      const tripId = `trip_${payload.route.route_id}`;
      const { error: tripErr } = await supabase.from('trips').upsert({
        trip_id: tripId,
        route_id: payload.route.route_id,
        service_id: 'daily',
        trip_headsign: payload.stops[payload.stops.length - 1].stop_name,
        direction_id: 0
      });
      if (tripErr) throw tripErr;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    let message = 'Unknown error';
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === 'object' && 'message' in err) {
      message = String(err.message);
    } else {
      message = String(err);
    }
    console.error('[save-route] Supabase error:', message);

    const keyInfo = serviceKey
      ? `${serviceKey.substring(0, 15)}... (length: ${serviceKey.length})`
      : 'undefined';

    const diagMessage = message.includes('row-level security policy') || message.includes('security')
      ? `${message}\n\n[ДИАГНОСТИКА] Сервер колдонуп жаткан ачкыч: ${keyInfo}.\nЭгер бул жерде "sb_publishable_..." же башка туура эмес ачкыч турса, Vercel-деги өзгөрмөлөрдү текшериңиз.`
      : message;

    return NextResponse.json({ error: diagMessage }, { status: 500 });
  }
}
