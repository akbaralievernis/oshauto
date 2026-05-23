'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, MicOff, Sparkles, X, Volume2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase, isClientConfigured } from '@/lib/supabase';

interface SmartSearchProps {
  onRouteFound?: (routeId: string) => void;
}

export function SmartSearch({ onRouteFound }: SmartSearchProps) {
  const [query, setQuery] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  
  const responseRef = useRef<HTMLDivElement>(null);

  // Инициализация Web Speech API для голосового ввода
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.lang = 'ru-RU'; // Поддержка русского языка
        recog.interimResults = false;
        recog.maxAlternatives = 1;

        recog.onstart = () => {
          setIsListening(true);
        };

        recog.onresult = (event: any) => {
          const speechToText = event.results[0][0].transcript;
          setQuery(speechToText);
          handleSubmitQuery(speechToText); // Автоматически отправляем при распознавании
        };

        recog.onerror = (event: any) => {
          console.error('Ошибка голосового ввода:', event.error);
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        setRecognition(recog);
      }
    }
  }, []);

  // Переключение голосового ввода
  const toggleListening = () => {
    if (!recognition) {
      alert('Голосовой ввод не поддерживается вашим браузером.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setAiResponse(null);
      recognition.start();
    }
  };

  // Отправка ИИ-запроса (RAG)
  const handleSubmitQuery = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setAiResponse(null);

    // Скроллим к выводу ответа
    setTimeout(() => {
      responseRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      if (isClientConfigured) {
        // -------------------------------------------------------------
        // РЕАЛЬНЫЙ RAG: ВЫЗОВ SUPABASE EDGE FUNCTION
        // -------------------------------------------------------------
        const { data, error } = await supabase.functions.invoke('search-routes', {
          body: { query: searchQuery }
        });

        if (error) throw error;
        
        if (data && data.answer) {
          setAiResponse(data.answer);
          // Если ИИ нашел конкретный маршрут и вернул его ID в ответе, можем сфокусировать карту
          if (data.detected_route_id && onRouteFound) {
            onRouteFound(data.detected_route_id);
          }
        } else {
          setAiResponse('Ошибка: пустой ответ от ИИ-ассистента.');
        }
      } else {
        // -------------------------------------------------------------
        // ДЕМО-ФОЛЛБЭК: ЛОКАЛЬНАЯ АНТИ-ГАЛЛЮЦИНАЦИОННАЯ СИМУЛЯЦИЯ RAG
        // -------------------------------------------------------------
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Симуляция сети

        const normalizedQuery = searchQuery.toLowerCase();
        
        let answer = '';
        let detectedId = '';

        if (normalizedQuery.includes('хбк') || normalizedQuery.includes('ак-тилек') || normalizedQuery.includes('105')) {
          answer = '🚌 **Маршрутка №105**\n📍 **Где сесть:** Остановка "ХБК (Конечная)" или "Швейная фабрика".\n🏁 **Где выйти:** мкрн. Ак-Тилек.\n⏱ **Время в пути:** ~25 минут.\nℹ️ *Ориентировочный интервал движения составляет 7 минут.*';
          detectedId = '105';
        } else if (normalizedQuery.includes('анар') || normalizedQuery.includes('араван') || normalizedQuery.includes('111')) {
          answer = '🚌 **Маршрутка №111**\n📍 **Где сесть:** Остановка "мкрн. Анар" или "Центральная площадь".\n🏁 **Где выйти:** Араванская или Западная конечная.\n⏱ **Время в пути:** ~20 минут.\nℹ️ *Интервал движения составляет 9-10 минут.*';
          detectedId = '111';
        } else if (normalizedQuery.includes('сулейман') || normalizedQuery.includes('гора') || normalizedQuery.includes('автовокзал') || normalizedQuery.includes('124')) {
          answer = '🚌 **Маршрутка №124**\n📍 **Где сесть:** "Новый Автовокзал" или "Кыргызтелеком".\n🏁 **Где выйти:** Остановка "Гора Сулейман-Тоо" или мкрн. Юго-Восток.\n⏱ **Время в пути:** ~30 минут.\nℹ️ *Очень удобный маршрут для туристов.*';
          detectedId = '124';
        } else if (normalizedQuery.includes('рынок') || normalizedQuery.includes('достук') || normalizedQuery.includes('142')) {
          answer = '🚌 **Маршрутка №142**\n📍 **Где сесть:** Остановка "Фрунзенский рынок".\n🏁 **Где выйти:** мкрн. Достук.\n⏱ **Время в пути:** ~18 минут.\nℹ️ *Соединяет рыночную зону с спальным кварталом Достук.*';
          detectedId = '142';
        } else {
          // Строгий отказ согласно правилу анти-галлюцинации
          answer = 'К сожалению, этот маршрут мне неизвестен. Я могу подсказать только по маршрутам 105, 111, 124 и 142 в городе Ош.';
        }

        setAiResponse(answer);
        if (detectedId && onRouteFound) {
          onRouteFound(detectedId);
        }
      }
    } catch (err) {
      console.error(err);
      setAiResponse('К сожалению, не удалось подключиться к серверу ИИ. Попробуйте еще раз позже.');
    } finally {
      setIsLoading(false);
    }
  };

  // Озвучивание ответа ИИ с помощью TTS (Text-to-Speech)
  const speakResponse = () => {
    if (!aiResponse || typeof window === 'undefined') return;
    
    // Очищаем markdown-разметку для чтения речи
    const cleanText = aiResponse.replace(/[*#`_]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ru-RU';
    window.speechSynthesis.cancel(); // Останавливаем прошлую речь, если говорит
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Строка ввода */}
      <div className="relative flex items-center w-full rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] overflow-hidden transition-all duration-300 focus-within:border-[var(--accent)]">
        <Search className="w-4 h-4 ml-3.5 text-[var(--text-muted)] shrink-0" />
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmitQuery(query)}
          placeholder="Куда едем? (например: Араванская)"
          className="w-full py-3 px-3 text-sm bg-transparent border-0 outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)]"
        />

        {query && (
          <button
            onClick={() => setQuery('')}
            className="p-1 mr-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Кнопка голосового ввода */}
        <button
          onClick={toggleListening}
          className={`p-2.5 mr-1 rounded-lg transition-colors cursor-pointer relative flex items-center justify-center ${
            isListening
              ? 'text-rose-500 bg-rose-950/20'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {isListening ? (
            <>
              <span className="absolute inset-0 rounded-lg border-2 border-rose-500 animate-ping opacity-60" />
              <MicOff className="w-4 h-4 z-10" />
            </>
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Кнопка отправки */}
        <button
          onClick={() => handleSubmitQuery(query)}
          disabled={!query.trim() || isLoading}
          className="p-2.5 mr-1.5 text-[var(--accent-light)] disabled:text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Панель ответа ИИ */}
      {(isLoading || aiResponse) && (
        <div
          ref={responseRef}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[rgba(59,130,246,0.02)] flex flex-col gap-2.5 transition-all duration-300 animate-fadeIn"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[var(--accent-light)] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Маршрутный ИИ-Ассистент
            </span>

            {aiResponse && !isLoading && (
              <button
                onClick={speakResponse}
                title="Озвучить ответ"
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2 py-2">
              <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded w-full animate-pulse" />
              <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded w-5/6 animate-pulse" />
            </div>
          ) : (
            <div className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-medium">
              {aiResponse}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
