import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

interface DeleteRoutePayload {
  route_id: string;
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

  let payload: DeleteRoutePayload;
  try {
    payload = (await request.json()) as DeleteRoutePayload;
  } catch {
    return NextResponse.json({ error: 'Туура эмес JSON' }, { status: 400 });
  }

  if (!payload?.route_id) {
    return NextResponse.json({ error: 'route_id талап кылынат' }, { status: 400 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Удаляем маршрут. В схеме базы данных настроен каскадный delete (on delete cascade)
    // для связанных таблиц (trips, route_embeddings), поэтому удаление маршрута
    // автоматически очистит связанные данные.
    const { error: deleteErr } = await supabase
      .from('routes')
      .delete()
      .eq('route_id', payload.route_id);

    if (deleteErr) throw deleteErr;

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
    console.error('[delete-route] Supabase error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
