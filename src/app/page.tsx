'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bus,
  Map as MapIcon,
  Route as RouteIcon,
  Search,
  Clock,
  ShieldCheck,
  Sparkles,
  MapPin,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Send,
  Phone,
  Mail,
  Bell,
  Users,
  Loader2
} from 'lucide-react';
import { Route } from '@/lib/supabase';
import { getAllRoutes } from '@/lib/customRoutes';
import { Modal } from '@/components/UI/Modal';
import { SiteHeader } from '@/components/UI/SiteHeader';
import { SiteFooter } from '@/components/UI/SiteFooter';

export default function HomePage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [query, setQuery] = useState<string>('');
  const [openRoutes, setOpenRoutes] = useState<boolean>(false);
  const [openBuses, setOpenBuses] = useState<boolean>(false);
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  // Загрузка маршрутов с локального хранилища + мок
  useEffect(() => {
    setRoutes(getAllRoutes());
    const handler = () => setRoutes(getAllRoutes());
    window.addEventListener('oshauto:routes-updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('oshauto:routes-updated', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const filteredRoutes = useMemo(() => {
    if (!query.trim()) return routes;
    const q = query.trim().toLowerCase();
    return routes.filter(
      (r) =>
        r.route_short_name.toLowerCase().includes(q) ||
        r.route_long_name.toLowerCase().includes(q) ||
        (r.route_desc || '').toLowerCase().includes(q)
    );
  }, [routes, query]);

  const openRouteOnMap = (routeId: string) => {
    router.push(`/map?route=${encodeURIComponent(routeId)}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <SiteHeader activePath="home" />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-blue-600/30 to-indigo-600/10 blur-3xl" />
          <div className="absolute top-32 -right-40 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-emerald-600/20 to-cyan-600/10 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-5 pt-14 pb-12 md:pt-20 md:pb-16">
          <div className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[rgba(59,130,246,0.06)] text-xs font-bold text-[var(--accent-light)]">
              <Sparkles className="w-3.5 h-3.5" />
              Транспорт Оша в реальном времени
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
              Доедь до места{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                быстро и без догадок
              </span>
            </h1>
            <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
              Маршруты городских автобусов, остановки и движение транспорта Оша —
              в одном удобном современном сервисе.
            </p>

            {/* SEARCH */}
            <div className="w-full max-w-2xl">
              <div className="flex items-center gap-2 p-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-xl shadow-2xl">
                <Search className="w-5 h-5 ml-3 text-[var(--text-muted)] shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setOpenRoutes(true);
                  }}
                  placeholder="Например: 105, Сулейман-Тоо, Анар, Достук..."
                  className="flex-1 bg-transparent border-0 outline-none text-sm md:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] py-3"
                />
                <button
                  onClick={() => setOpenRoutes(true)}
                  className="px-4 md:px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 cursor-pointer shrink-0"
                >
                  Найти
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {query.trim() && (
                <div className="mt-3 text-xs text-[var(--text-muted)]">
                  Найдено маршрутов:{' '}
                  <b className="text-[var(--text-primary)]">{filteredRoutes.length}</b>. Нажмите «Найти» для просмотра.
                </div>
              )}
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-3 gap-3 md:gap-6 w-full max-w-2xl mt-4">
              <Stat value={`${routes.length}+`} label="Маршрутов" />
              <Stat value="24/7" label="Доступно" />
              <Stat value="GPS" label="Реальное время" />
            </div>
          </div>

          {/* TWO ACTION CARDS — Routes + Buses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 max-w-4xl mx-auto">
            <ActionCard
              icon={<RouteIcon className="w-6 h-6" />}
              tone="blue"
              title="Маршруты"
              description="Все городские маршруты, остановки и направления движения."
              onClick={() => setOpenRoutes(true)}
              cta="Открыть список"
            />
            <ActionCard
              icon={<Bus className="w-6 h-6" />}
              tone="emerald"
              title="Автобусы"
              description="Действующий парк, загруженность салонов и движение онлайн."
              onClick={() => setOpenBuses(true)}
              cta="Посмотреть"
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-5 py-12 md:py-16 w-full">
        <SectionHeading
          eyebrow="Возможности"
          title="Всё, что нужно пассажиру"
          subtitle="OshAuto объединяет карту, маршруты и удобные инструменты в одном месте."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          <FeatureCard
            icon={<MapIcon className="w-5 h-5" />}
            title="Живая карта"
            text="Маршруты и остановки на интерактивной карте города с привязкой к дорогам."
          />
          <FeatureCard
            icon={<Bell className="w-5 h-5" />}
            title="Гео-будильник"
            text="Не пропустите свою остановку — приложение разбудит уведомлением заранее."
          />
          <FeatureCard
            icon={<Users className="w-5 h-5" />}
            title="Загруженность"
            text="Оценки пассажиров о свободных и переполненных автобусах в реальном времени."
          />
          <FeatureCard
            icon={<Clock className="w-5 h-5" />}
            title="Интервалы"
            text="Расписание и интервалы движения для каждого городского маршрута."
          />
          <FeatureCard
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Безопасно"
            text="Никаких регистраций, реклам и слежки. Только маршрут и поездка."
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5" />}
            title="Современный UI"
            text="Стильный интерфейс, темная тема и поддержка мобильных устройств."
          />
        </div>
      </section>

      {/* TOP ROUTES PREVIEW */}
      <section className="max-w-6xl mx-auto px-5 py-10 w-full">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Популярные маршруты
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Самые загруженные направления города Ош.
            </p>
          </div>
          <button
            onClick={() => setOpenRoutes(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-light)] hover:text-[var(--accent)] cursor-pointer"
          >
            Все маршруты <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.slice(0, 6).map((r) => (
            <RoutePreviewCard
              key={r.route_id}
              route={r}
              onView={() => openRouteOnMap(r.route_id)}
            />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-5 py-12 md:py-16 w-full" id="about">
        <SectionHeading
          eyebrow="Как пользоваться"
          title="Три простых шага"
          subtitle="От поиска маршрута до прибытия на остановку."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <StepCard
            n={1}
            title="Найдите маршрут"
            text="Введите название остановки или номер автобуса в поиске."
          />
          <StepCard
            n={2}
            title="Посмотрите на карте"
            text="Откройте маршрут и увидите все остановки и движение транспорта."
          />
          <StepCard
            n={3}
            title="Доберитесь без догадок"
            text="Используйте гео-будильник, чтобы выйти именно там, где нужно."
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 py-12 md:py-16 w-full" id="faq">
        <SectionHeading
          eyebrow="FAQ"
          title="Частые вопросы"
          subtitle="Кратко о том, как устроен сервис."
        />

        <div className="flex flex-col gap-3 mt-8">
          {FAQ.map((f, i) => (
            <FaqItem
              key={i}
              open={openFaqId === i}
              onToggle={() => setOpenFaqId(openFaqId === i ? null : i)}
              question={f.q}
              answer={f.a}
            />
          ))}
        </div>
      </section>

      {/* CONTACTS + FEEDBACK */}
      <section className="max-w-6xl mx-auto px-5 py-12 md:py-16 w-full" id="contacts">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-6 md:p-8">
            <h3 className="text-xl font-extrabold mb-2">Контакты</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              Связаться с командой OshAuto можно по любому из каналов ниже.
            </p>

            <div className="flex flex-col gap-3">
              <ContactRow
                icon={<MapPin className="w-4 h-4" />}
                label="Адрес"
                value="г. Ош, Кыргызстан"
              />
              <ContactRow
                icon={<Phone className="w-4 h-4" />}
                label="Телефон"
                value="+996 (770) 00-00-00"
                href="tel:+996770000000"
              />
              <ContactRow
                icon={<Mail className="w-4 h-4" />}
                label="Почта"
                value="info@oshauto.kg"
                href="mailto:info@oshauto.kg"
              />
            </div>
          </div>

          <FeedbackForm />
        </div>
      </section>

      <SiteFooter />

      {/* MODALS */}
      <Modal
        isOpen={openRoutes}
        onClose={() => setOpenRoutes(false)}
        title="Городские маршруты"
        subtitle={`Всего: ${routes.length}. Нажмите, чтобы открыть на карте.`}
        size="md"
      >
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по номеру или направлению..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          {filteredRoutes.length === 0 ? (
            <EmptyState text="Ничего не найдено. Попробуйте другой запрос." />
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRoutes.map((r) => (
                <RouteRow
                  key={r.route_id}
                  route={r}
                  onClick={() => {
                    setOpenRoutes(false);
                    openRouteOnMap(r.route_id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={openBuses}
        onClose={() => setOpenBuses(false)}
        title="Автобусы города Ош"
        subtitle="Парк и текущая загруженность"
        size="md"
      >
        <BusesModalContent
          onPickRoute={(routeId) => {
            setOpenBuses(false);
            openRouteOnMap(routeId);
          }}
        />
      </Modal>
    </div>
  );
}

// =============================================================
// UI HELPERS
// =============================================================

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center p-3 md:p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-md">
      <div className="text-xl md:text-2xl font-black text-[var(--text-primary)]">{value}</div>
      <div className="text-[10px] md:text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold mt-1">
        {label}
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
  cta,
  tone
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  cta: string;
  tone: 'blue' | 'emerald';
}) {
  const toneClasses =
    tone === 'blue'
      ? 'from-blue-600/20 to-indigo-600/5 border-blue-500/20 hover:border-blue-500/40 text-blue-300'
      : 'from-emerald-600/20 to-teal-600/5 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300';

  return (
    <button
      onClick={onClick}
      className={`group text-left p-5 md:p-6 rounded-2xl border bg-gradient-to-br ${toneClasses} backdrop-blur-md transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[rgba(255,255,255,0.06)] border border-[var(--border-color)]">
          {icon}
        </div>
        <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
      <h3 className="text-lg font-extrabold text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
        {description}
      </p>
      <div className="text-xs font-bold mt-4 uppercase tracking-wider opacity-80">
        {cta}
      </div>
    </button>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center max-w-xl mx-auto">
      <div className="text-xs font-extrabold uppercase tracking-widest text-[var(--accent-light)] mb-2">
        {eyebrow}
      </div>
      <h2 className="text-2xl md:text-4xl font-black tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-sm md:text-base text-[var(--text-secondary)] mt-3">{subtitle}</p>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-md hover:border-[var(--border-hover)] transition-all">
      <div className="w-10 h-10 rounded-xl bg-[rgba(59,130,246,0.1)] text-[var(--accent-light)] flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">{text}</p>
    </div>
  );
}

function RoutePreviewCard({
  route,
  onView
}: {
  route: Route;
  onView: () => void;
}) {
  return (
    <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-all flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          className="px-3 py-1.5 text-sm font-extrabold rounded-lg"
          style={{
            backgroundColor: `#${route.route_color}`,
            color: `#${route.route_text_color}`
          }}
        >
          {route.route_short_name}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{route.route_long_name}</div>
          {route.route_desc && (
            <div className="text-[10px] text-[var(--text-muted)] truncate">
              {route.route_desc}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onView}
        className="w-full py-2 rounded-lg border border-[var(--border-color)] text-xs font-bold hover:bg-[rgba(255,255,255,0.04)] flex items-center justify-center gap-1.5 cursor-pointer"
      >
        Открыть на карте
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

function StepCard({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="relative p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="text-5xl font-black bg-gradient-to-br from-blue-500/40 to-indigo-500/0 bg-clip-text text-transparent">
        0{n}
      </div>
      <h3 className="text-base font-bold mt-1">{title}</h3>
      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">{text}</p>
    </div>
  );
}

function FaqItem({
  open,
  onToggle,
  question,
  answer
}: {
  open: boolean;
  onToggle: () => void;
  question: string;
  answer: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-[rgba(255,255,255,0.02)]"
      >
        <span className="text-sm font-bold text-[var(--text-primary)]">{question}</span>
        <HelpCircle
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
            open ? 'rotate-45 text-[var(--accent-light)]' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[rgba(255,255,255,0.02)]">
      <div className="w-9 h-9 rounded-lg bg-[rgba(59,130,246,0.1)] text-[var(--accent-light)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
          {label}
        </div>
        <div className="text-sm font-bold text-[var(--text-primary)] truncate">{value}</div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block hover:opacity-90 transition-opacity">
      {content}
    </a>
  ) : (
    content
  );
}

function FeedbackForm() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setTimeout(() => {
      // Сохраняем отзыв локально
      try {
        const key = 'oshauto_feedback_v1';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ name, contact, message, at: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
      setSending(false);
      setSent(true);
      setName('');
      setContact('');
      setMessage('');
      setTimeout(() => setSent(false), 5000);
    }, 600);
  };

  return (
    <form
      id="feedback"
      onSubmit={handleSubmit}
      className="glass-panel p-6 md:p-8 flex flex-col gap-4"
    >
      <div>
        <h3 className="text-xl font-extrabold">Обратная связь</h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Заметили ошибку или хотите предложить улучшение?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ваше имя (необязательно)"
          className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)]"
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Телефон или email"
          className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Опишите ваше предложение или проблему..."
        rows={4}
        className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)] resize-none"
      />

      <button
        type="submit"
        disabled={!message.trim() || sending}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {sending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        Отправить отзыв
      </button>

      {sent && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          Спасибо! Ваш отзыв принят.
        </div>
      )}
    </form>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-8 px-4 rounded-xl border border-dashed border-[var(--border-color)] text-center flex flex-col items-center gap-2 text-[var(--text-muted)]">
      <Search className="w-5 h-5" />
      <span className="text-xs font-medium">{text}</span>
    </div>
  );
}

function RouteRow({ route, onClick }: { route: Route; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] flex items-center gap-3 cursor-pointer transition-all"
    >
      <span
        className="w-11 h-11 flex items-center justify-center text-sm font-extrabold rounded-lg shrink-0"
        style={{
          backgroundColor: `#${route.route_color}`,
          color: `#${route.route_text_color}`
        }}
      >
        {route.route_short_name}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{route.route_long_name}</div>
        {route.route_desc && (
          <div className="text-[10px] text-[var(--text-muted)] truncate">{route.route_desc}</div>
        )}
      </div>
      <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
    </button>
  );
}

function BusesModalContent({ onPickRoute }: { onPickRoute: (routeId: string) => void }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  useEffect(() => {
    setRoutes(getAllRoutes());
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="p-3 rounded-xl bg-[rgba(59,130,246,0.05)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex items-start gap-2">
        <Bus className="w-4 h-4 text-[var(--accent-light)] mt-0.5 shrink-0" />
        <span>
          Городские автобусы Оша работают по{' '}
          <b className="text-[var(--text-primary)]">{routes.length}</b> маршрутам.
          Нажмите на маршрут, чтобы увидеть автобусы на карте.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <BusInfoCell tone="emerald" label="Свободно" hint="зелёный индикатор" />
        <BusInfoCell tone="amber" label="Нормально" hint="жёлтый индикатор" />
        <BusInfoCell tone="rose" label="Толпа" hint="красный индикатор" />
        <BusInfoCell tone="blue" label="GPS LIVE" hint="онлайн-движение" />
      </div>

      <div className="border-t border-[var(--border-color)] pt-3 mt-1">
        <div className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Парк автобусов
        </div>
        <div className="flex flex-col gap-2">
          {routes.map((r) => (
            <RouteRow key={r.route_id} route={r} onClick={() => onPickRoute(r.route_id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BusInfoCell({
  tone,
  label,
  hint
}: {
  tone: 'emerald' | 'amber' | 'rose' | 'blue';
  label: string;
  hint: string;
}) {
  const colors = {
    emerald: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
    amber: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
    rose: 'border-rose-500/30 bg-rose-950/20 text-rose-300',
    blue: 'border-blue-500/30 bg-blue-950/20 text-blue-300'
  }[tone];

  const dot = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    blue: 'bg-blue-500'
  }[tone];

  return (
    <div className={`p-3 rounded-xl border ${colors}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${dot} animate-pulse`} />
        <span className="text-sm font-bold">{label}</span>
      </div>
      <div className="text-[10px] mt-1 opacity-80">{hint}</div>
    </div>
  );
}

const FAQ = [
  {
    q: 'Сервис платный?',
    a: 'Нет. OshAuto полностью бесплатен для пассажиров.'
  },
  {
    q: 'Нужно ли регистрироваться?',
    a: 'Нет, регистрация не требуется. Просто откройте сайт и пользуйтесь.'
  },
  {
    q: 'Что показывает онлайн-карта?',
    a: 'Маршруты, остановки и движение городского транспорта Оша в реальном времени, если данные GPS поступают с автобусов.'
  },
  {
    q: 'Можно ли добавить свой маршрут?',
    a: 'Да. Перейдите в админ-панель, добавьте остановки кликом на карте или вручную по координатам, сохраните — маршрут появится на сайте.'
  },
  {
    q: 'Как работает гео-будильник?',
    a: 'Откройте маршрут, выберите остановку прибытия и включите будильник — приложение уведомит вас при приближении.'
  }
];
