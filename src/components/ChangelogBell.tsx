import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CHANGELOG, formatChangelogDate } from '../data/changelog';
import { markChangelogSeen, readUnseenEntries } from '../utils/changelogState';
import { ROUTES, normalizePathname } from '../utils/routes';

const PREVIEW_COUNT = 3;

/** NavBar 우측의 업데이트 알림 버튼.
 *  확인 상태를 이 컴포넌트가 소유한다. Changelog 페이지에서 확인 처리를 하면
 *  effect 실행 순서(자식 → 부모)상 NavBar가 먼저 계산을 끝내 배지가 갱신되지 않으므로,
 *  "페이지 진입"과 "드롭다운 열기" 두 시점을 모두 여기서 확인 처리한다.
 *
 *  패널은 포털이 아니라 버튼 바로 옆 DOM에 absolute로 렌더한다.
 *  포털을 쓰면 document.body 끝에 붙어 Tab 순서가 버튼과 끊기고, 그걸 메우려면
 *  non-modal 위젯에 modal용 focus trap을 씌워야 한다. DOM 순서를 읽기 순서와
 *  일치시키면 Tab이 버튼 → 패널로 자연히 이어져 trap도 포커스 복원도 필요 없다. */
const ChangelogBell: React.FC = () => {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [unseenIds, setUnseenIds] = useState<readonly string[]>([]);
  // 드롭다운을 열면 배지는 즉시 사라지지만, 패널 안에서는 어떤 항목이 새 것이었는지 계속 보여야 한다.
  const [highlightIds, setHighlightIds] = useState<readonly string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsOpen(false);

    if (normalizePathname(pathname) === ROUTES.changelog) {
      markChangelogSeen();
      setUnseenIds([]);
      setHighlightIds([]);
      return;
    }

    setUnseenIds(readUnseenEntries().map((entry) => entry.id));
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      setHighlightIds([]);
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    // Escape는 사용자가 패널 안에 있을 수 있는 유일한 닫기 경로다.
    // 바깥 클릭이나 링크 이동에서 포커스를 되돌리면 사용자가 방금 고른 대상을 빼앗는다.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const unseenCount = unseenIds.length;
  const previewEntries = CHANGELOG.slice(0, PREVIEW_COUNT);

  const handleToggle = () => {
    const willOpen = !isOpen;

    // 벨을 여는 행위를 "최근 소식을 확인했다"로 본다. 프리뷰에 보이는 항목만 읽음 처리하면
    // 미확인이 PREVIEW_COUNT를 넘길 때 배지가 영구히 남는다.
    // setState updater는 순수해야 하며 StrictMode에서 두 번 호출된다. 저장은 updater 밖에서 한 번만.
    if (willOpen && unseenCount > 0) {
      setHighlightIds(unseenIds);
      markChangelogSeen();
      setUnseenIds([]);
    }

    setIsOpen(willOpen);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={unseenCount > 0 ? `업데이트 알림, 새 소식 ${unseenCount}건` : '업데이트 알림, 새 소식 없음'}
        aria-controls={isOpen ? 'navbar-changelog-panel' : undefined}
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1h6z"
          />
        </svg>
        {unseenCount > 0 && (
          <span
            aria-hidden
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-la-gold ring-2 ring-white dark:ring-la-dark"
          />
        )}
      </button>
      {/* 버튼 기준(absolute right-0)으로 두면 벨 오른쪽에 테마·메뉴 버튼이 있어
          좁은 화면에서 패널이 왼쪽 화면 밖으로 밀려난다(320px에서 left: -72px).
          sticky nav는 상단 전폭이므로 fixed의 기준 박스가 nav든 뷰포트든 결과가 같다. */}
      {isOpen && (
        <div
          id="navbar-changelog-panel"
          role="region"
          aria-label="최근 업데이트"
          className="fixed right-2 top-16 z-50 max-h-[calc(100dvh-4.5rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-gray-200/70 bg-white p-2 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-la-dark dark:shadow-black/30"
        >
          <p className="px-2 pb-1 pt-1 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
            최근 업데이트
          </p>
          {previewEntries.length === 0 ? (
            <p className="px-2 py-3 text-sm text-gray-600 dark:text-gray-300">
              아직 등록된 업데이트 내역이 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col">
              {previewEntries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    to={ROUTES.changelog}
                    className="flex flex-col gap-0.5 rounded-lg px-2 py-2 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:hover:bg-white/5"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="break-keep text-sm font-medium text-gray-800 dark:text-gray-200">
                        {entry.title}
                      </span>
                      {highlightIds.includes(entry.id) && (
                        <span className="rounded-full border border-la-gold/25 bg-la-gold/10 px-1.5 py-0.5 text-[9px] font-bold leading-none text-la-gold-deep dark:text-la-gold">
                          새 소식
                        </span>
                      )}
                    </span>
                    <time dateTime={entry.date} className="text-xs text-gray-600 dark:text-gray-300">
                      {formatChangelogDate(entry.date)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {previewEntries.length > 0 && (
            <Link
              to={ROUTES.changelog}
              className="mt-1 block rounded-lg px-2 py-2 text-center text-xs font-bold text-la-gold-deep transition-colors hover:bg-la-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-la-gold"
            >
              전체 업데이트 내역 보기
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default ChangelogBell;
