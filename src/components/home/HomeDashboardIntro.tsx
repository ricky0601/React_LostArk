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
    <section className="glass-card p-4 animate-fade-in sm:p-5" aria-labelledby="home-dashboard-title">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-la-gold-dark dark:text-la-gold">
            로아 성장 관리 대시보드
          </span>
          <h1 id="home-dashboard-title" className="mt-1 break-keep text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl">
            성장에 필요한 도구를 한곳에
          </h1>
          <p className="mt-2 max-w-2xl break-keep text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            시세, 골드, 캐릭터 비교, 재련 계산까지 필요한 순간 바로 확인하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-gray-400 lg:justify-end" aria-label="오늘의 요약">
          <p>진행 중 이벤트 <span className="ml-1 text-base font-bold tabular-nums text-gray-950 dark:text-white">{loadingEvents ? '-' : activeEventCount}</span></p>
          <p>오늘 일정 <span className="ml-1 text-base font-bold tabular-nums text-gray-950 dark:text-white">{loadingCalendar ? '-' : calendarGroupCount}</span></p>
        </div>
      </div>
    </section>

    <QuickMenu />
  </>
);

export default HomeDashboardIntro;
