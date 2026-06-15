import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import { SkeletonBlock } from '../components/Loading';
import { fetchEvents, fetchCalendar } from '../utils/api';
import type { GameEvent, CalendarItem } from '../types/lostark';

/** YYYY-MM-DD 포맷터 (Date 객체 기준) */
function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 게임 일일 리셋(06:00 KST) 기준으로 "오늘"에 해당하는 KST 날짜 두 개 반환
 *  - today: 게임 하루의 시작일 (06:00 ~ 23:59가 속한 날짜)
 *  - tomorrow: 다음 날 (00:00 ~ 06:00 새벽이 속한 날짜)
 *  현재 KST 06시 이전이면 today는 어제 날짜가 됨 (게임 하루는 어제 06시에 시작)
 *
 *  타임존 보정 노트: 입력이 epoch ms(`new Date()`)이므로 모든 로컬 TZ에서 동작.
 *  `kst`의 epoch ms를 "로컬 TZ로 읽을 때 KST 값이 나오는 ms"로 시프트해
 *  `getHours()`/`getDate()`가 KST 컴포넌트를 반환하게 함.
 *  (getTodayTimes는 입력이 KST 문자열이라 슬라이싱이 더 직관적이라 다른 방식을 씀) */
function getGameDayKST(): { today: string; tomorrow: string } {
  const now = new Date();
  const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
  if (kst.getHours() < 6) kst.setDate(kst.getDate() - 1);
  const today = formatYMD(kst);
  const tomorrow = formatYMD(new Date(kst.getTime() + 86400000));
  return { today, tomorrow };
}

/** 날짜 문자열에서 MM.DD 형식 추출 */
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/** 이벤트가 현재 진행 중인지 확인 */
function isEventActive(event: GameEvent): boolean {
  const now = new Date();
  const end = new Date(event.EndDate);
  return end >= now;
}

/** 캘린더 아이템에서 게임 일일(오늘 06:00 ~ 익일 06:00) 범위의 시작 시간만 필터.
 *  API는 타임존 표기 없는 KST 문자열(YYYY-MM-DDTHH:MM:SS)을 내려줌. 문자열 슬라이싱만으로 처리해
 *  로컬 타임존 영향을 받지 않게 한다 (필터·표시 모두 입력 문자열의 KST 시·분을 그대로 사용). */
function getTodayTimes(startTimes: string[] | null): string[] {
  if (!startTimes) return [];
  const { today, tomorrow } = getGameDayKST();
  return startTimes
    .filter((t) => {
      const datePart = t.substring(0, 10);
      const hour = parseInt(t.substring(11, 13), 10);
      if (datePart === today && hour >= 6) return true;
      if (datePart === tomorrow && hour < 6) return true;
      return false;
    })
    .map((t) => t.substring(11, 16));
}

const CALENDAR_CATEGORIES = ['모험 섬', '카오스게이트', '필드보스', '항해'];

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
  },
];

const Home: React.FC = () => {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  /** 카테고리별 접기 상태. 기본 모두 접힘 */
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  // race 가드: 마운트 직후 빠르게 라우트가 바뀌어 unmount 되어도 setState 경고가 나지 않도록 cancelled 체크.
  useEffect(() => {
    let cancelled = false;
    setLoadingEvents(true);
    setLoadingCalendar(true);

    fetchEvents()
      .then((data) => { if (!cancelled) setEvents(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setEvents([]); })
      .finally(() => { if (!cancelled) setLoadingEvents(false); });

    fetchCalendar()
      .then((data) => { if (!cancelled) setCalendar(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setCalendar([]); })
      .finally(() => { if (!cancelled) setLoadingCalendar(false); });

    return () => { cancelled = true; };
  }, []);

  const activeEvents = useMemo(() => events.filter(isEventActive), [events]);

  /** 오늘 일정이 있는 캘린더 아이템을 카테고리별로 그룹핑 */
  const calendarGroups = useMemo(() => {
    const groups = new Map<string, { item: CalendarItem; times: string[] }[]>();
    for (const item of calendar) {
      if (!CALENDAR_CATEGORIES.includes(item.CategoryName)) continue;
      const times = getTodayTimes(item.StartTimes);
      if (times.length === 0) continue;
      const group = groups.get(item.CategoryName) || [];
      group.push({ item, times });
      groups.set(item.CategoryName, group);
    }
    return groups;
  }, [calendar]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
      <NavBar />
      <PullToRefresh>
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Dashboard Hero */}
        <section className="glass-card relative overflow-hidden p-6 sm:p-8 animate-fade-in">
          <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-la-gold/20 blur-3xl" aria-hidden />
          <div className="absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <span className="inline-flex rounded-full border border-la-gold/20 bg-la-gold/10 px-3 py-1 text-xs font-bold text-la-gold-dark dark:text-la-gold">
                로아 성장 관리 대시보드
              </span>
              <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-950 dark:text-white">
                성장에 필요한 도구를 한곳에
              </h1>
              <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-gray-500 dark:text-gray-400">
                시세, 골드, 캐릭터 비교, 재련 계산까지 필요한 순간 바로 확인하세요.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-la-gold/20 bg-la-gold/10 p-4">
                <p className="text-xs font-bold tracking-wider text-la-gold-dark dark:text-la-gold">이벤트</p>
                <p className="mt-2 text-3xl font-black text-gray-950 dark:text-white">
                  {loadingEvents ? '-' : activeEvents.length}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">진행 중</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/60 p-4 dark:bg-white/5">
                <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">일정</p>
                <p className="mt-2 text-3xl font-black text-gray-950 dark:text-white">
                  {loadingCalendar ? '-' : calendarGroups.size}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">오늘 일정</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={`glass-card p-5 text-left transition-all duration-300 group cursor-pointer hover:shadow-gold-glow hover:border-la-gold/30 dark:hover:border-la-gold/20 ${action.featured ? 'ring-1 ring-la-gold/20' : ''}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <svg className={`w-5 h-5 ${action.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.path} />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{action.title}</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {action.description}
              </p>
              <div className={`mt-3 flex items-center gap-1 text-sm font-medium ${action.ctaText} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <span>{action.action}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </section>

        {/* Today's Calendar - 카테고리별 접기, 기본 접힘 */}
        <section className="animate-fade-in">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">오늘의 일정</h2>
          {loadingCalendar ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card p-4">
                  <SkeletonBlock className="h-5 w-24 mb-3" />
                  <div className="flex gap-3">
                    <SkeletonBlock className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <SkeletonBlock className="h-4 w-3/4" />
                      <SkeletonBlock className="h-3 w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : calendarGroups.size > 0 ? (
            <div className="space-y-4">
              {Array.from(calendarGroups.entries()).map(([category, items]) => {
                const isExpanded = expandedCategories[category] ?? false;
                return (
                  <div key={category} className="glass-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between text-left p-4 hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
                      aria-expanded={isExpanded}
                    >
                      <h3 className="text-sm font-bold text-la-gold-dark dark:text-la-gold">{category}</h3>
                      <span
                        className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-3 space-y-3 border-t border-gray-200/50 dark:border-white/10">
                        {items.map(({ item, times }, i) => (
                          <div key={i} className="flex items-start gap-3">
                            {item.ContentsIcon && (
                              <img
                                src={item.ContentsIcon}
                                alt={item.ContentsName}
                                className="w-10 h-10 rounded-lg flex-shrink-0 bg-gray-100 dark:bg-white/5"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {item.ContentsName}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {item.MinItemLevel > 0 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Lv.{item.MinItemLevel}
                                  </span>
                                )}
                                {times.map((time, j) => (
                                  <span
                                    key={j}
                                    className="text-xs px-1.5 py-0.5 rounded bg-la-gold/10 text-la-gold-dark dark:text-la-gold"
                                  >
                                    {time}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">오늘의 일정이 없습니다.</p>
            </div>
          )}
        </section>

        {/* Events Section */}
        <section className="animate-fade-in">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">진행 중인 이벤트</h2>
          {loadingEvents ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card overflow-hidden">
                  <SkeletonBlock className="h-36 w-full" />
                  <div className="p-4 space-y-2">
                    <SkeletonBlock className="h-5 w-3/4" />
                    <SkeletonBlock className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEvents.map((event, i) => (
                <a
                  key={i}
                  href={event.Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card overflow-hidden transition-all duration-300 hover:shadow-gold-glow hover:border-la-gold/30 dark:hover:border-la-gold/20 group"
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={event.Thumbnail}
                      alt={event.Title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                      {event.Title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {formatShortDate(event.StartDate)} ~ {formatShortDate(event.EndDate)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">진행 중인 이벤트가 없습니다.</p>
            </div>
          )}
        </section>

      </main>
      </PullToRefresh>
    </div>
  );
};

export default Home;
