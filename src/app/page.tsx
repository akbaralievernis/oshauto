'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bus,
  Route as RouteIcon,
  Search,
  Clock,
  ShieldCheck,
  Sparkles,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Send,
  Phone,
  Mail,
  Bell,
  Users,
  Loader2,
  Plus,
  Map as MapIcon
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
    <div className="min-h-screen flex flex-col">
      <SiteHeader activePath="home" />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[var(--border-color)]">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-gradient-to-br from-blue-500/25 via-indigo-500/12 to-transparent blur-3xl" />
          <div className="absolute bottom-[-25%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/18 blur-3xl" />
          <div className="absolute top-1/3 left-[-15%] w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 pt-14 pb-16 md:pt-24 md:pb-24">
          <div className="mx-auto max-w-3xl flex flex-col items-center text-center gap-6 animate-fadeUp">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-glow)] text-xs font-semibold text-[var(--accent-strong)] backdrop-blur-md">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Ош транспорту реалдуу убакытта
              <Sparkles className="w-3.5 h-3.5" />
            </span>

            <h1 className="text-[2.5rem] sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.02] text-balance">
              Жетер жайыңызга{' '}
              <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                тез жана так
              </span>
              {' '}барыңыз
            </h1>

            <p className="text-base md:text-xl text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              Шаардык автобустардын маршруттары, аялдамалары жана транспорттун кыймылы — бир ыңгайлуу жана заманбап кызматта.
            </p>

            {/* SEARCH */}
            <div className="w-full max-w-2xl mt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setOpenRoutes(true);
                }}
                className="flex items-stretch gap-2 p-1.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-xl shadow-2xl"
                style={{ boxShadow: '0 20px 60px var(--shadow-color)' }}
              >
                <div className="flex items-center flex-1 min-w-0 px-3">
                  <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Мисалы: 105, Сулайман-Тоо, Анар..."
                    className="w-full ml-2.5 bg-transparent border-0 outline-none text-sm md:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] py-3"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 md:px-7 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 cursor-pointer shrink-0"
                >
                  Издөө
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {query.trim() && (
                <div className="mt-2.5 text-xs text-[var(--text-muted)] text-center">
                  Табылган маршруттар:{' '}
                  <b className="text-[var(--text-primary)]">{filteredRoutes.length}</b>
                </div>
              )}
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-xl mt-6">
              <Stat value={`${routes.length}+`} label="Маршрут" />
              <Stat value="24/7" label="Жеткиликтүү" />
              <Stat value="GPS" label="Реалдуу убакыт" />
            </div>
          </div>
        </div>
      </section>

      {/* TWO ACTION CARDS */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 -mt-10 md:-mt-14 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 animate-fadeUp" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
          <ActionCard
            icon={<RouteIcon className="w-6 h-6" />}
            tone="blue"
            title="Маршруттар"
            description="Шаардын бардык маршруттары, аялдамалары жана багыттары."
            onClick={() => setOpenRoutes(true)}
            cta="Тизмени ачуу"
            badge={`${routes.length}`}
          />
          <ActionCard
            icon={<Bus className="w-6 h-6" />}
            tone="emerald"
            title="Автобустар"
            description="Иштеп жаткан парк, салондордун толумдугу жана онлайн кыймылы."
            onClick={() => setOpenBuses(true)}
            cta="Көрүү"
            badge="LIVE"
          />
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-16 md:py-24">
        <SectionHeading
          eyebrow="Мүмкүнчүлүктөр"
          title="Жүргүнчүгө керектүүнүн бардыгы"
          subtitle="OshAuto картаны, маршруттарды жана ыңгайлуу куралдарды бир жерге бириктирет."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          <FeatureCard
            icon={<MapIcon className="w-5 h-5" />}
            title="Тирүү карта"
            text="Жолдорго байланган маршруттар жана аялдамалар интерактивдүү картада."
          />
          <FeatureCard
            icon={<Bell className="w-5 h-5" />}
            title="Гео-чалгыч"
            text="Өзүңүздүн аялдамаңыздан өтүп кетпеңиз — колдонмо алдын-ала эскертет."
          />
          <FeatureCard
            icon={<Users className="w-5 h-5" />}
            title="Толумдук"
            text="Жүргүнчүлөрдүн баалоосу боюнча бош жана толгон автобустар жөнүндө маалымат."
          />
          <FeatureCard
            icon={<Clock className="w-5 h-5" />}
            title="Аралык убакыт"
            text="Ар бир маршрут үчүн жүрүү графиги жана аралыктар."
          />
          <FeatureCard
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Коопсуз"
            text="Каттоо, жарнама, көзөмөл жок — болгону маршрут жана сапар."
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5" />}
            title="Заманбап интерфейс"
            text="Стилдүү интерфейс, тема алмаштыруу жана мобилдик түзмөктөр үчүн ыңгайлуу."
          />
        </div>
      </section>

      {/* TOP ROUTES PREVIEW */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 pb-16 md:pb-20">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-2">
              Маршруттар
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Атактуу багыттар
            </h2>
          </div>
          <button
            onClick={() => setOpenRoutes(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)] cursor-pointer transition-colors"
          >
            Бардык маршруттар <ArrowRight className="w-4 h-4" />
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

        <div className="sm:hidden mt-5">
          <button
            onClick={() => setOpenRoutes(true)}
            className="w-full py-3 rounded-xl border border-[var(--border-color)] text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            Бардык маршруттар <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-[var(--border-color)] bg-[var(--bg-elevated)]">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-16 md:py-24" id="about">
          <SectionHeading
            eyebrow="Кантип колдонуу"
            title="Үч жөнөкөй кадам"
            subtitle="Маршрутту издөөдөн аялдамага жетүүгө чейин."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            <StepCard
              n={1}
              title="Маршрутту табыңыз"
              text="Издөө талаасына аялдамаңыздын атын же автобустун номерин жазыңыз."
            />
            <StepCard
              n={2}
              title="Картадан ачыңыз"
              text="Бардык аялдамаларды жана транспорттун кыймылын реалдуу убакытта көрөсүз."
            />
            <StepCard
              n={3}
              title="Так барыңыз"
              text="Гео-чалгычты колдонуп, керектүү аялдамада чыгыңыз."
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-5 sm:px-8 py-16 md:py-24" id="faq">
        <SectionHeading
          eyebrow="FAQ"
          title="Көп берилген суроолор"
          subtitle="Кызмат кантип иштээри жөнүндө кыска."
        />

        <div className="flex flex-col gap-3 mt-10">
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
      <section
        className="border-t border-[var(--border-color)] bg-[var(--bg-elevated)]"
        id="contacts"
      >
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-16 md:py-24">
          <SectionHeading
            eyebrow="Байланыш"
            title="Байланыш жана кайтарым байланыш"
            subtitle="Катаны байкадыңызбы же сунушуңуз барбы? Бизге жазыңыз."
          />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mt-10">
            <div className="lg:col-span-2 flex flex-col gap-3">
              <ContactRow
                icon={<MapPin className="w-4 h-4" />}
                label="Дарек"
                value="Ош ш., Кыргызстан"
              />
              <ContactRow
                icon={<Phone className="w-4 h-4" />}
                label="Телефон"
                value="+996 (770) 00-00-00"
                href="tel:+996770000000"
              />
              <ContactRow
                icon={<Mail className="w-4 h-4" />}
                label="Электрондук почта"
                value="info@oshauto.kg"
                href="mailto:info@oshauto.kg"
              />
              <div className="p-4 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-glow)]">
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--accent-strong)] mb-2">
                  Ташуучуларга
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Эгер сиз ташуучу болсоңуз — өзүңүздүн GPS-маалыматыңызды админ-панель аркылуу кошуп, шаардын картасына чыгыңыз.
                </p>
              </div>
            </div>

            <div className="lg:col-span-3">
              <FeedbackForm />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* MODALS */}
      <Modal
        isOpen={openRoutes}
        onClose={() => setOpenRoutes(false)}
        title="Шаардык маршруттар"
        subtitle={`Бардыгы: ${routes.length}. Картадан ачуу үчүн басыңыз.`}
        size="md"
      >
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Номер же багыт боюнча издөө..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          {filteredRoutes.length === 0 ? (
            <EmptyState text="Эч нерсе табылган жок. Башка суроону жазып көрүңүз." />
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
        title="Ош шаарынын автобустары"
        subtitle="Парк жана учурдагы толумдук"
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
    <div className="flex flex-col items-center text-center px-3 py-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-md">
      <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-none">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold mt-2">
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
  tone,
  badge
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  cta: string;
  tone: 'blue' | 'emerald';
  badge?: string;
}) {
  const isBlue = tone === 'blue';
  const gradient = isBlue
    ? 'from-blue-500/15 via-blue-500/5 to-indigo-500/10'
    : 'from-emerald-500/15 via-emerald-500/5 to-teal-500/10';
  const borderHover = isBlue ? 'hover:border-blue-500/50' : 'hover:border-emerald-500/50';
  const iconBg = isBlue
    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300';
  const ctaColor = isBlue ? 'text-blue-600 dark:text-blue-300' : 'text-emerald-600 dark:text-emerald-300';
  const badgeBg = isBlue
    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300';

  return (
    <button
      onClick={onClick}
      className={`group text-left p-5 md:p-6 rounded-2xl border border-[var(--border-color)] ${borderHover} bg-gradient-to-br ${gradient} backdrop-blur-md transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 shadow-xl`}
      style={{ boxShadow: '0 12px 40px var(--shadow-color)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {badge && (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${badgeBg}`}>
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-xl font-extrabold text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{description}</p>
      <div className={`flex items-center justify-between mt-5 pt-4 border-t border-[var(--border-color)] text-xs font-bold uppercase tracking-widest ${ctaColor}`}>
        <span>{cta}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-3">
        {eyebrow}
      </div>
      <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-sm md:text-base text-[var(--text-secondary)] mt-3 leading-relaxed">
          {subtitle}
        </p>
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
    <div className="p-5 md:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-md hover:border-[var(--border-hover)] transition-all">
      <div className="w-11 h-11 rounded-xl bg-[var(--accent-glow)] text-[var(--accent)] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{text}</p>
    </div>
  );
}

function RoutePreviewCard({ route, onView }: { route: Route; onView: () => void }) {
  return (
    <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)] transition-all flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className="w-12 h-12 flex items-center justify-center text-base font-extrabold rounded-xl shrink-0"
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
            <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
              {route.route_desc.split('•')[0].trim()}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onView}
        className="w-full py-2.5 rounded-xl border border-[var(--border-color)] text-sm font-semibold hover:bg-[var(--accent-glow)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
      >
        Картадан ачуу
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function StepCard({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="relative p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-md overflow-hidden">
      <div className="absolute top-3 right-4 text-6xl font-black text-[var(--accent)] opacity-[0.08] select-none leading-none">
        0{n}
      </div>
      <div className="relative">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-glow)] text-[var(--accent)] flex items-center justify-center text-sm font-extrabold mb-3">
          {n}
        </div>
        <h3 className="text-base font-bold">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{text}</p>
      </div>
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
        className="w-full p-4 md:p-5 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-[var(--bg-elevated)]"
      >
        <span className="text-sm md:text-base font-bold text-[var(--text-primary)]">
          {question}
        </span>
        <span
          className={`w-7 h-7 rounded-lg border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] transition-transform shrink-0 ${
            open ? 'rotate-45 text-[var(--accent)] border-[var(--accent)]/40 bg-[var(--accent-glow)]' : ''
          }`}
        >
          <Plus className="w-4 h-4" />
        </span>
      </button>
      {open && (
        <div className="px-4 md:px-5 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed">
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
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] transition-all">
      <div className="w-10 h-10 rounded-lg bg-[var(--accent-glow)] text-[var(--accent)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
          {label}
        </div>
        <div className="text-sm font-bold text-[var(--text-primary)] truncate mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
  return href ? <a href={href} className="block">{content}</a> : content;
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
      className="p-5 md:p-7 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-md flex flex-col gap-4"
      style={{ boxShadow: '0 12px 40px var(--shadow-color)' }}
    >
      <div>
        <h3 className="text-lg md:text-xl font-extrabold">Кайтарым байланыш формасы</h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Кабарыңыз түз долбоордун командасына барат.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Атыңыз"
          className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)] transition-colors"
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Телефон же email"
          className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Сунушуңузду же көйгөйүңүздү жазыңыз..."
        rows={4}
        className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)] resize-none transition-colors"
      />

      <button
        type="submit"
        disabled={!message.trim() || sending}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Жөнөтүү
      </button>

      {sent && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Рахмат! Пикириңиз кабыл алынды.
        </div>
      )}
    </form>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 px-4 rounded-xl border border-dashed border-[var(--border-color)] text-center flex flex-col items-center gap-2 text-[var(--text-muted)]">
      <Search className="w-5 h-5" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

function RouteRow({ route, onClick }: { route: Route; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)] flex items-center gap-3 cursor-pointer transition-all"
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
          <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
            {route.route_desc.split('•')[0].trim()}
          </div>
        )}
      </div>
      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
    </button>
  );
}

function BusesModalContent({ onPickRoute }: { onPickRoute: (routeId: string) => void }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  useEffect(() => {
    setRoutes(getAllRoutes());
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="p-3.5 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent)]/20 text-sm text-[var(--text-secondary)] flex items-start gap-3">
        <Bus className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
        <span>
          Ош шаарынын автобустары{' '}
          <b className="text-[var(--text-primary)]">{routes.length}</b> маршрутта иштейт.
          Картадагы автобустарды көрүү үчүн маршрутту басыңыз.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <BusInfoCell tone="emerald" label="Бош" hint="жашыл индикатор" />
        <BusInfoCell tone="amber" label="Орточо" hint="сары индикатор" />
        <BusInfoCell tone="rose" label="Толгон" hint="кызыл индикатор" />
        <BusInfoCell tone="blue" label="GPS LIVE" hint="онлайн-кыймыл" />
      </div>

      <div className="border-t border-[var(--border-color)] pt-3">
        <div className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Автобус паркы
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
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200'
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
      <div className="text-[11px] mt-1 opacity-80">{hint}</div>
    </div>
  );
}

const FAQ = [
  {
    q: 'Кызмат акылуубу?',
    a: 'Жок. OshAuto жүргүнчүлөр үчүн толугу менен бекер.'
  },
  {
    q: 'Каттоодон өтүү керекпи?',
    a: 'Жок, каттоо талап кылынбайт. Сайтты ачыңыз да пайдаланыңыз.'
  },
  {
    q: 'Онлайн-карта эмнени көрсөтөт?',
    a: 'Маршруттарды, аялдамаларды жана автобустардан GPS-маалымат келип турса, шаардык транспорттун кыймылын реалдуу убакытта.'
  },
  {
    q: 'Өзүмдүн маршрутумду кошсо болобу?',
    a: 'Ооба. Админ-панелге өтүп, картага басып же координаттарды кол менен жазып аялдамаларды кошуңуз, сактаңыз — маршрут сайтта пайда болот.'
  },
  {
    q: 'Гео-чалгыч кантип иштейт?',
    a: 'Маршрутту ачып, баруучу аялдаманы тандап, чалгычты кошуңуз — жакындаганда колдонмо сизди эскертет.'
  }
];
