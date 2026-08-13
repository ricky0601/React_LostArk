import React from 'react';
import { Link } from 'react-router-dom';

interface HomeDashboardIntroProps {
  readonly activeEventCount: number;
  readonly calendarGroupCount: number;
  readonly loadingEvents: boolean;
  readonly loadingCalendar: boolean;
}

const QUICK_ACTIONS = [
  {
    to: '/simulation',
    title: '주간 골드 계산',
    description: '주간 골드와 숙제 현황',
    action: '계산하기',
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-700 dark:text-amber-400',
    ctaText: 'text-amber-700 dark:text-amber-400',
    path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    featured: true,
  },
  {
    to: '/enhancement',
    title: '재련 계산',
    description: '재료 시세 기반 강화 비용',
    action: '계산하기',
    iconBg: 'bg-emerald-500/15',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    ctaText: 'text-emerald-600 dark:text-emerald-400',
    path: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M19 14.5l-2.14 3.21a2.25 2.25 0 01-1.873 1.002H9.013A2.25 2.25 0 017.14 17.71L5 14.5m14 0H5',
    featured: false,
  },
  {
    to: '/market',
    title: '시세 랭킹',
    description: '각인서·보석 최저가 순위',
    action: '랭킹 보기',
    iconBg: 'bg-la-gold/20',
    iconText: 'text-la-gold-dark dark:text-la-gold',
    ctaText: 'text-la-gold-dark dark:text-la-gold',
    path: 'M3 10h18M7 15h1m4 0h1m4 0h1M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z',
    featured: false,
  },
  {
    to: '/compare',
    title: '캐릭터 비교',
    description: '두 캐릭터 스펙 비교',
    action: '비교하기',
    iconBg: 'bg-sky-500/15',
    iconText: 'text-sky-600 dark:text-sky-400',
    ctaText: 'text-sky-600 dark:text-sky-400',
    path: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
    featured: false,
  },
] as const;

const HomeDashboardIntro: React.FC<HomeDashboardIntroProps> = ({
  activeEventCount,
  calendarGroupCount,
  loadingEvents,
  loadingCalendar,
}) => (
  <>
    <section className="glass-card relative overflow-hidden p-5 animate-fade-in sm:p-8" aria-labelledby="home-dashboard-title">
      <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-la-gold/20 blur-3xl" aria-hidden />
      <div className="absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div className="min-w-0">
          <span className="inline-flex rounded-full border border-la-gold/20 bg-la-gold/10 px-3 py-1 text-xs font-bold text-la-gold-dark dark:text-la-gold">
            로아 성장 관리 대시보드
          </span>
          <h1 id="home-dashboard-title" className="mt-4 break-keep text-3xl font-black tracking-tight text-gray-950 dark:text-white sm:text-4xl md:text-5xl">
            성장에 필요한 도구를 한곳에
          </h1>
          <p className="mt-4 max-w-2xl break-keep text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
            시세, 골드, 캐릭터 비교, 재련 계산까지 필요한 순간 바로 확인하세요.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3" aria-label="오늘의 요약">
          <div className="rounded-2xl border border-la-gold/20 bg-la-gold/10 p-4">
            <p className="text-xs font-bold tracking-wider text-la-gold-dark dark:text-la-gold">이벤트</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-gray-950 dark:text-white">{loadingEvents ? '-' : activeEventCount}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">진행 중</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/60 p-4 dark:bg-white/5">
            <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">일정</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-gray-950 dark:text-white">{loadingCalendar ? '-' : calendarGroupCount}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">오늘 일정</p>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="home-quick-menu-title" className="animate-fade-in">
      <div className="mb-4">
        <h2 id="home-quick-menu-title" className="text-xl font-bold text-gray-900 dark:text-white">빠른 메뉴</h2>
        <p className="mt-1 break-keep text-sm text-gray-500 dark:text-gray-400">자주 쓰는 성장 도구로 바로 이동합니다.</p>
      </div>
      <nav aria-label="빠른 메뉴" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`glass-card group cursor-pointer p-5 text-left transition-all duration-300 hover:border-la-gold/30 hover:shadow-gold-glow dark:hover:border-la-gold/20 ${action.featured ? 'ring-1 ring-la-gold/20' : ''}`}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${action.iconBg}`}>
                <svg className={`h-5 w-5 ${action.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={action.path} />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{action.title}</h3>
            </div>
            <p className="break-keep text-sm leading-relaxed text-gray-500 dark:text-gray-400">{action.description}</p>
            <div className={`mt-3 flex items-center gap-1 text-sm font-medium opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 ${action.ctaText}`}>
              <span>{action.action}</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </nav>
    </section>
  </>
);

export default HomeDashboardIntro;
