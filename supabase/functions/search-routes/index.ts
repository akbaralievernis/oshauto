// -------------------------------------------------------------
// SUPABASE EDGE FUNCTION: search-routes
// Местоположение: supabase/functions/search-routes/index.ts
// Язык: TypeScript (Deno runtime)
// Регулирует RAG-поиск по маршрутам Оша с защитой от галлюцинаций
// -------------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Обработка CORS Preflight запросов
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Инициализация API ключей из переменных окружения Supabase Vault
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!openAiApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing server-side configurations (OpenAI API key or Supabase secrets)");
    }

    // 1. ГЕНЕРАЦИЯ ВЕКТОРНОГО ВСТРАИВАНИЯ (Embedding) ДЛЯ ЗАПРОСА ПОЛЬЗОВАТЕЛЯ
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: query,
        model: "text-embedding-3-small", // 1536 измерений
      }),
    });

    if (!embeddingResponse.ok) {
      const errText = await embeddingResponse.text();
      throw new Error(`OpenAI Embeddings API error: ${errText}`);
    }

    const embeddingJson = await embeddingResponse.json();
    const queryEmbedding = embeddingJson.data[0].embedding;

    // 2. ВЕКТОРНЫЙ ПОИСК В БАЗЕ SUPABASE (RPC RPC match_routes)
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: matchedRoutes, error: dbError } = await supabaseClient.rpc(
      "match_routes", 
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.35, // Порог схожести
        match_count: 3         // Берем топ-3 релевантных контекста
      }
    );

    if (dbError) throw dbError;

    // Формируем текстовый контекст для ИИ
    let contextText = "";
    if (matchedRoutes && matchedRoutes.length > 0) {
      contextText = matchedRoutes
        .map((r: any) => `[Маршрут ID: ${r.route_id}]\nОписание: ${r.content}`)
        .join("\n\n");
    } else {
      contextText = "Нерелевантный контекст. Подходящие маршруты не найдены.";
    }

    // 3. СТРОГИЙ СИСТЕМНЫЙ ПРОМПТ (Anti-Hallucination Prompt)
    const systemPrompt = `
Вы — интеллектуальный ИИ-навигатор по общественному транспорту города Ош.
Ваша единственная задача — отвечать на вопросы пользователей о маршрутах строго на основе предоставленного контекста.

ПРАВИЛА БЕЗОПАСНОСТИ И АНТИ-ГАЛЛЮЦИНАЦИИ (КРИТИЧЕСКИ ВАЖНО):
1. Используйте ИСКЛЮЧИТЕЛЬНО предоставленный ниже контекст. В контексте перечислены реальные маршруты и остановки города Ош.
2. Если в контексте нет подходящего маршрута для данного запроса или контекст не содержит ответа, вы ОБЯЗАНЫ ответить строго: "К сожалению, этот маршрут мне неизвестен."
3. Вы не имеете права выдумывать новые маршруты, названия улиц, остановок, или додумывать несуществующие детали.
4. Ответ формулируйте строго по следующему шаблону (используйте markdown):
   - "Номер маршрутки / автобуса: [номер]"
   - "Где сесть: [название остановки]"
   - "Где выйти: [название остановки]"
   - "Время в пути (ориентировочно): [кол-во минут]"
5. Если пользователь просит найти маршрут, который отсутствует в базе, не придумывайте аналоги, сразу выдавайте фразу об отказе.

КОНТЕКСТ МАРШРУТОВ ИЗ БАЗЫ ДАННЫХ:
${contextText}
`;

    // 4. ВЫЗОВ OPENAI CHAT COMPLETION (gpt-4o-mini)
    const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Пользователь спрашивает: "${query}"` },
        ],
        temperature: 0.1, // Минимальная температура для детерминированности и исключения галлюцинаций
        max_tokens: 300,
      }),
    });

    if (!chatResponse.ok) {
      const errText = await chatResponse.text();
      throw new Error(`OpenAI Chat API error: ${errText}`);
    }

    const chatJson = await chatResponse.json();
    const aiAnswer = chatJson.choices[0].message.content;

    // Пытаемся распарсить из ответа ИИ номер маршрута, чтобы подсветить его на карте
    let detectedRouteId = null;
    if (matchedRoutes && matchedRoutes.length > 0) {
      for (const r of matchedRoutes) {
        if (aiAnswer.includes(r.route_id)) {
          detectedRouteId = r.route_id;
          break;
        }
      }
    }

    // 5. ОТПРАВКА СТРУКТУРИРОВАННОГО ОТВЕТА
    return new Response(
      JSON.stringify({
        answer: aiAnswer,
        detected_route_id: detectedRouteId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
