import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { CHANGELOG, formatChangelogDate } from '../data/changelog';
import { markChangelogSeen, readUnseenEntries } from '../utils/changelogState';

const CHANGELOG_PATH = '/changelog';
const PREVIEW_COUNT = 3;

/** NavBar 우측의 업데이트 알림 버튼.
 *  확인 상태를 이 컴포넌트가 소유한다. Changelog 페이지에서 확인 처리를 하면
 *  effect 실행 순서(자식 → 부모)상 NavBar가 먼저 계산을 끝내 배지가 갱신되지 않으므로,
 *  "페이지 진입"과 "드롭다운 열기" 두 시점을 모두 여기서 확인 처리한다. */
const ChangelogBell: React.FC = () => {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const [unseenIds, setUnseenIds] = useState<readonly string[]>([]);
  // 드롭다운을 열면 배지는 즉시 사라지지만, 패널 안에서는 어떤 항목이 새 것이었는지 계속 보여야 한다.
  const [highlightIds, setHighlightIds] = useState<readonly string[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsOpen(false);

    if (pathname === CHANGELOG_PATH) {
      markChangelogSeen();
      setUnseenIds([]);
      setHighlightIds([]);
      return;
    }

    setUnseenIds(readUnseenEntries().map((entry) => entry.id));
  }, [pathname]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setHighlightIds([]);
      setPosition(null);
      return;
    }

    const panel = panelRef.current;
    if (!(panel instanceof HTMLElement)) return;

    const focusableSelector = 'a[href], button:not([disabled])';
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 8;
      const maxRight = Math.max(viewportPadding, window.innerWidth - panel.offsetWidth - viewportPadding);
      setPosition({
        top: rect.bottom + viewportPadding,
        right: Math.min(Math.max(window.innerWidth - rect.right, viewportPadding), maxRight),
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target) || panel.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      const first = focusables.at(0);
      const last = focusables.at(-1);
      if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    updatePosition();
    panel.querySelector<HTMLElement>(focusableSelector)?.focus();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    const toggleButton = buttonRef.current;
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      toggleButton?.focus();
    };
  }, [isOpen]);

  const unseenCount = unseenIds.length;
  const previewEntries = CHANGELOG.slice(0, PREVIEW_COUNT);

  const handleToggle = () => {
    const willOpen = !isOpen;

    // setState updater는 순수해야 하며 StrictMode에서 두 번 호출된다. 저장은 updater 밖에서 한 번만.
    const visibleUnseenIds = previewEntries
      .map((entry) => entry.id)
      .filter((id) => unseenIds.includes(id));

    if (willOpen && visibleUnseenIds.length > 0) {
      setHighlightIds(visibleUnseenIds);
      markChangelogSeen(visibleUnseenIds);
      setUnseenIds(unseenIds.filter((id) => !visibleUnseenIds.includes(id)));
    }

    setIsOpen(willOpen);
  };

  const panel = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          id="navbar-changelog-panel"
          ref={panelRef}
          role="dialog"
          aria-label="최근 업데이트"
          className="fixed z-50 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-gray-200/70 bg-white p-2 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-la-dark dark:shadow-black/30"
          style={{ top: position?.top ?? 0, right: position?.right ?? 8 }}
        >
          <p className="px-2 pb-1 pt-1 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            최근 업데이트
          </p>
          {previewEntries.length === 0 ? (
            <p className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">등록된 내역이 없습니다.</p>
          ) : (
            <ul className="flex flex-col">
              {previewEntries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    to={CHANGELOG_PATH}
                    className="flex flex-col gap-0.5 rounded-lg px-2 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {entry.title}
                      </span>
                      {highlightIds.includes(entry.id) && (
                        <span className="rounded-full border border-la-gold/25 bg-la-gold/10 px-1.5 py-0.5 text-[9px] font-bold leading-none text-la-gold-dark dark:text-la-gold">
                          NEW
                        </span>
                      )}
                    </span>
                    <time dateTime={entry.date} className="text-xs text-gray-400 dark:text-gray-500">
                      {formatChangelogDate(entry.date)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={CHANGELOG_PATH}
            className="mt-1 block rounded-lg px-2 py-2 text-center text-xs font-bold text-la-gold-dark transition-colors hover:bg-la-gold/10 dark:text-la-gold"
          >
            전체 업데이트 내역 보기
          </Link>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={unseenCount > 0 ? `업데이트 알림, 새 소식 ${unseenCount}건` : '업데이트 알림, 새 소식 없음'}
        aria-haspopup="dialog"
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
      {panel}
    </>
  );
};

export default ChangelogBell;
