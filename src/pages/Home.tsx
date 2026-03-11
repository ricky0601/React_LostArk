import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import { fetchEvents, fetchCalendar } from '../utils/api';
import type { GameEvent, CalendarItem } from '../types/lostark';

/** KST 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

/** 캘린더 아이템에서 오늘 시작 시간만 필터 */
function getTodayTimes(startTimes: string[] | null): string[] {
  if (!startTimes) return [];
  const today = getTodayKST();
  return startTimes
    .filter((t) => t.startsWith(today))
    .map((t) => {
      const d = new Date(t);
      const kst = new Date(d.getTime() + (d.getTimezoneOffset() + 540) * 60000);
      return `${String(kst.getHours()).padStart(2, '0')}:${String(kst.getMinutes()).padStart(2, '0')}`;
    });
}

const CALENDAR_CATEGORIES = ['모험 섬', '카오스게이트', '필드보스', '항해'];

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

  const loadData = useCallback(() => {
    setLoadingEvents(true);
    setLoadingCalendar(true);
    fetchEvents()
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
    fetchCalendar()
      .then((data) => setCalendar(Array.isArray(data) ? data : []))
      .catch(() => setCalendar([]))
      .finally(() => setLoadingCalendar(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
        {/* Hero */}
        <section className="text-center animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-la-gold to-la-gold-light bg-clip-text text-transparent">
            LostArk
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">오늘의 로스트아크 정보</p>
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <Link
            to="/simulation"
            className="glass-card p-5 text-left transition-all duration-300 group cursor-pointer hover:shadow-gold-glow hover:border-la-gold/30 dark:hover:border-la-gold/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-la-gold/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-la-gold-dark dark:text-la-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">주간 골드 계산</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              원정대 레이드별 주간 골드 수입을 계산하고 숙제 진행을 추적합니다
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-medium text-la-gold-dark dark:text-la-gold opacity-0 group-hover:opacity-100 transition-opacity">
              <span>시작하기</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            to="/character"
            className="glass-card p-5 text-left transition-all duration-300 group cursor-pointer hover:shadow-gold-glow hover:border-la-gold/30 dark:hover:border-la-gold/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">캐릭터 프로필</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              캐릭터 장비 레벨, 전투 레벨, 길드 등 상세 정보를 조회합니다
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>조회하기</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            to="/compare"
            className="glass-card p-5 text-left transition-all duration-300 group cursor-pointer hover:shadow-gold-glow hover:border-la-gold/30 dark:hover:border-la-gold/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">캐릭터 비교</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              두 캐릭터의 장비, 보석, 각인을 나란히 비교합니다
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>비교하기</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </section>

        {/* Events Section */}
        <section className="animate-fade-in">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">진행 중인 이벤트</h2>
          {loadingEvents ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card overflow-hidden">
                  <div className="skeleton h-36 w-full" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-5 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">이벤트 정보를 불러올 수 없습니다.</p>
            </div>
          )}
        </section>

        {/* Today's Calendar - 카테고리별 접기, 기본 접힘 */}
        <section className="animate-fade-in">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">오늘의 일정</h2>
          {loadingCalendar ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card p-4">
                  <div className="skeleton h-5 w-24 mb-3" />
                  <div className="flex gap-3">
                    <div className="skeleton h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton h-3 w-1/2" />
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
      </main>
      </PullToRefresh>
    </div>
  );
};

export default Home;
