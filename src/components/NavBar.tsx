import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import ChangelogBell from './ChangelogBell';
import { getNavItemClass, MORE_NAV_LINKS, NavLinks, PRIMARY_NAV_LINKS } from './nav/NavLinks';

const NavBar: React.FC = () => {
  const { pathname } = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [moreMenuPosition, setMoreMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement>(null);
  const restoreMobileMenuFocusRef = useRef<'trigger' | 'desktop'>('trigger');

  useBodyScrollLock(isMobileMenuOpen);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const closeOnDesktopResize = () => {
      if (window.innerWidth < 768) return;
      restoreMobileMenuFocusRef.current = 'desktop';
      setIsMobileMenuOpen(false);
    };

    closeOnDesktopResize();
    window.addEventListener('resize', closeOnDesktopResize);

    return () => {
      window.removeEventListener('resize', closeOnDesktopResize);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const focusableSelector = 'a[href], button:not([disabled])';
    const panel = mobileMenuPanelRef.current;
    panel?.querySelector<HTMLElement>(focusableSelector)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    const toggleButton = mobileMenuButtonRef.current;
    const themeButton = themeButtonRef.current;

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreMobileMenuFocusRef.current === 'desktop') {
        themeButton?.focus();
        restoreMobileMenuFocusRef.current = 'trigger';
      } else {
        toggleButton?.focus();
      }
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMoreMenuOpen) return;

    const updateMoreMenuPosition = () => {
      if (window.innerWidth < 768) {
        setIsMoreMenuOpen(false);
        setMoreMenuPosition(null);
        return;
      }

      const rect = moreButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMoreMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (moreButtonRef.current?.contains(target) || moreMenuRef.current?.contains(target)) return;
      setIsMoreMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMoreMenuOpen(false);
      moreButtonRef.current?.focus();
    };

    updateMoreMenuPosition();
    window.addEventListener('resize', updateMoreMenuPosition);
    window.addEventListener('scroll', updateMoreMenuPosition, true);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updateMoreMenuPosition);
      window.removeEventListener('scroll', updateMoreMenuPosition, true);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreMenuOpen]);

  const isMoreActive = MORE_NAV_LINKS.some((link) => link.path === pathname);
  const moreButtonClass = getNavItemClass(isMoreActive);

  const themeToggleLabel = isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환';

  const mobileMenu = isMobileMenuOpen && typeof document !== 'undefined'
    ? createPortal(
        <div className="md:hidden">
          <div
            data-testid="mobile-menu-scrim"
            className="fixed inset-x-0 top-14 bottom-0 z-40 bg-black/50"
            aria-hidden
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            id="navbar-mobile-menu"
            ref={mobileMenuPanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="모바일 메뉴"
            className="fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-gray-200/50 bg-white px-4 pb-4 shadow-lg shadow-black/10 dark:border-white/5 dark:bg-la-dark dark:shadow-black/30"
          >
            <div className="flex flex-col gap-3 pt-3">
              <section aria-labelledby="mobile-primary-links-title" className="rounded-xl bg-gray-50/80 p-2 dark:bg-white/5">
                <h2 id="mobile-primary-links-title" className="px-3 pb-1 text-xs font-bold tracking-wide text-gray-400 dark:text-gray-500">
                  주요 메뉴
                </h2>
                <div className="flex flex-col gap-1">
                  <NavLinks links={PRIMARY_NAV_LINKS} pathname={pathname} />
                </div>
              </section>
              <section aria-labelledby="mobile-more-links-title" className="rounded-xl bg-gray-50/80 p-2 dark:bg-white/5">
                <h2 id="mobile-more-links-title" className={`px-3 pb-1 text-xs font-bold tracking-wide ${isMoreActive ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-400 dark:text-gray-500'}`}>
                  기타 메뉴
                </h2>
                <div className="flex flex-col gap-1">
                  <NavLinks links={MORE_NAV_LINKS} pathname={pathname} />
                </div>
              </section>
              <div
                role="status"
                aria-label="현재 화면 테마"
                className="flex items-center justify-between rounded-xl border border-gray-200/60 px-4 py-3 text-xs dark:border-white/10"
              >
                <span className="font-medium text-gray-500 dark:text-gray-400">현재 테마</span>
                <span className="font-bold text-gray-900 dark:text-white">{isDarkMode ? '다크 모드' : '라이트 모드'}</span>
              </div>
              <button
                type="button"
                aria-label="모바일 메뉴 닫기"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                닫기
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  const moreMenu = isMoreMenuOpen && moreMenuPosition && typeof document !== 'undefined'
    ? createPortal(
        <div
          id="navbar-more-links"
          ref={moreMenuRef}
          className="fixed z-50 min-w-32 rounded-xl border border-gray-200/70 bg-white p-1.5 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-la-dark dark:shadow-black/30"
          style={{
            top: moreMenuPosition?.top ?? 0,
            right: moreMenuPosition?.right ?? 0,
          }}
        >
          <div className="flex flex-col gap-1">
            <NavLinks links={MORE_NAV_LINKS} pathname={pathname} />
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-la-dark/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="text-lg font-bold bg-gradient-to-r from-la-gold to-la-gold-light bg-clip-text text-transparent">
          Lokki
        </Link>
        <div className="hidden md:flex items-center gap-2">
          <NavLinks links={PRIMARY_NAV_LINKS} pathname={pathname} />
          <div className="relative">
            <button
              ref={moreButtonRef}
              type="button"
              className={moreButtonClass}
              aria-controls={isMoreMenuOpen ? 'navbar-more-links' : undefined}
              aria-expanded={isMoreMenuOpen}
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
            >
              <span>더보기</span>
              <svg className={`h-3.5 w-3.5 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ChangelogBell />
          <button
            ref={themeButtonRef}
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-la-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-la-gold-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            ref={mobileMenuButtonRef}
            type="button"
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-controls={isMobileMenuOpen ? 'navbar-mobile-menu' : undefined}
            aria-expanded={isMobileMenuOpen}
            onClick={() => {
              setIsMobileMenuOpen((prev) => !prev);
              setIsMoreMenuOpen(false);
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </nav>
    {mobileMenu}
    {moreMenu}
    </>
  );
};

export default NavBar;
