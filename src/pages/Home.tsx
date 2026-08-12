import React, { useState, useEffect, useMemo } from 'react';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import { SkeletonBlock } from '../components/Loading';
import HomeDashboardIntro from '../components/home/HomeDashboardIntro';
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
const EVENT_LINK_ALLOWED_HOSTS = ['lostark.game.onstove.com', 'onstove.com'] as const;

function getSafeEventLink(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.protocol !== 'https:') return null;
    const hostname = url.hostname.toLowerCase();
    const allowed = EVENT_LINK_ALLOWED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
    return allowed ? url.toString() : null;
  } catch (error) {
    if (error && typeof error === 'object' && 'message' in error) return null;
    throw error;
  }
}

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
        <HomeDashboardIntro
          activeEventCount={activeEvents.length}
          calendarGroupCount={calendarGroups.size}
          loadingEvents={loadingEvents}
          loadingCalendar={loadingCalendar}
        />

        {/* Today's Calendar - 카테고리별 접기, 기본 접힘 */}
        <section className="animate-fade-in" aria-labelledby="home-calendar-title">
          <div className="mb-4">
            <h2 id="home-calendar-title" className="text-xl font-bold text-gray-900 dark:text-white">오늘의 일정</h2>
            <p className="mt-1 break-keep text-sm text-gray-500 dark:text-gray-400">카테고리를 열어 오늘 참여 가능한 시간을 확인하세요.</p>
          </div>
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
                      aria-label={`${category} 일정 ${isExpanded ? '접기' : '펼치기'}`}
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
        <section className="animate-fade-in" aria-labelledby="home-events-title">
          <div className="mb-4">
            <h2 id="home-events-title" className="text-xl font-bold text-gray-900 dark:text-white">진행 중인 이벤트</h2>
            <p className="mt-1 break-keep text-sm text-gray-500 dark:text-gray-400">이벤트를 선택하면 공식 안내 페이지가 새 탭에서 열립니다.</p>
          </div>
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
              {activeEvents.map((event, i) => {
                const safeLink = getSafeEventLink(event.Link);
                const eventCardClassName = 'glass-card overflow-hidden transition-all duration-300 hover:shadow-gold-glow hover:border-la-gold/30 dark:hover:border-la-gold/20 group';
                const eventCard = (
                  <>
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={event.Thumbnail}
                      alt={event.Title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 break-words text-sm font-bold leading-snug text-gray-900 dark:text-white">
                      {event.Title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {formatShortDate(event.StartDate)} ~ {formatShortDate(event.EndDate)}
                    </p>
                  </div>
                  </>
                );

                return safeLink ? (
                  <a
                    key={i}
                    href={safeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={eventCardClassName}
                  >
                    {eventCard}
                  </a>
                ) : (
                  <article key={i} className={eventCardClassName} aria-label={`${event.Title} 이벤트 안내 링크 없음`}>
                    {eventCard}
                  </article>
                );
              })}
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
