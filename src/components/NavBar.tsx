import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const NavBar: React.FC = () => {
  const { pathname } = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [moreMenuPosition, setMoreMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [pathname]);

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

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 inline-flex items-center gap-1.5 ${
      pathname === path
        ? 'bg-la-gold/20 text-la-gold-dark dark:text-la-gold'
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
    }`;

  const morePaths = ['/expedition', '/spending'];
  const isMoreActive = morePaths.includes(pathname);
  const moreButtonClass = `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 inline-flex items-center gap-1.5 ${
    isMoreActive
      ? 'bg-la-gold/20 text-la-gold-dark dark:text-la-gold'
      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
  }`;

  const primaryLinks = (
    <>
      <Link to="/" className={linkClass('/')}>
        홈
      </Link>
      <Link to="/simulation" className={linkClass('/simulation')}>
        주간골드
      </Link>
      <Link to="/enhancement" className={linkClass('/enhancement')}>
        재련견적
      </Link>
      <Link to="/market" className={linkClass('/market')}>
        시세
      </Link>
      <Link to="/compare" className={linkClass('/compare')}>
        비교
      </Link>
      <Link to="/character" className={linkClass('/character')}>
        캐릭터
      </Link>
      <Link to="/spec-simulator" className={linkClass('/spec-simulator')} aria-label="전투력 시뮬 Beta">
        <span>전투력 시뮬</span>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold leading-none text-amber-600 dark:text-amber-400">
          Beta
        </span>
      </Link>
    </>
  );

  const moreLinks = (
    <>
      <Link to="/expedition" className={linkClass('/expedition')}>
        원정대
      </Link>
      <Link to="/spending" className={linkClass('/spending')}>
        결제 내역
      </Link>
    </>
  );

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
            {moreLinks}
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
          {primaryLinks}
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
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            aria-label={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
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
            type="button"
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
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
      {isMobileMenuOpen && (
        <div className="md:hidden px-4 pb-4 border-t border-gray-200/50 dark:border-white/5 bg-white/95 dark:bg-la-dark/95 backdrop-blur-xl">
          <div className="flex flex-col gap-2 pt-3">
            {primaryLinks}
            <div className={`px-3 pt-2 text-xs font-bold uppercase tracking-wide ${isMoreActive ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-400 dark:text-gray-500'}`}>
              더보기
            </div>
            {moreLinks}
          </div>
        </div>
      )}
    </nav>
    {moreMenu}
    </>
  );
};

export default NavBar;
