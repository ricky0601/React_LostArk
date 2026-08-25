import React from 'react';
import QuickMenu from './QuickMenu';

interface HomeDashboardIntroProps {
  readonly activeEventCount: number;
  readonly calendarGroupCount: number;
  readonly loadingEvents: boolean;
  readonly loadingCalendar: boolean;
}

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

    <QuickMenu />
  </>
);

export default HomeDashboardIntro;
