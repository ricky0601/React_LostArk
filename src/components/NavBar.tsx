import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NavBar: React.FC = () => {
  const { pathname } = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const linkClass = (path: string) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 inline-flex items-center gap-1.5 ${
      pathname === path
        ? 'bg-la-gold/20 text-la-gold-dark dark:text-la-gold'
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
    }`;

  const navLinks = (
    <>
      <Link to="/" className={linkClass('/')}>
        홈
      </Link>
      <Link to="/simulation" className={linkClass('/simulation')}>
        주간 골드 계산
      </Link>
      <Link to="/spec-simulator" className={linkClass('/spec-simulator')} aria-label="전투력 점수 시뮬레이터 Beta">
        <span>점수 시뮬레이터</span>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold leading-none text-amber-600 dark:text-amber-400">
          Beta
        </span>
      </Link>
      <Link to="/character" className={linkClass('/character')}>
        캐릭터
      </Link>
      <Link to="/expedition" className={linkClass('/expedition')}>
        원정대
      </Link>
      <Link to="/compare" className={linkClass('/compare')}>
        비교
      </Link>
      <Link to="/enhancement" className={linkClass('/enhancement')}>
        재련
      </Link>
      <Link to="/spending" className={linkClass('/spending')}>
        결제 내역
      </Link>
    </>
  );

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-la-dark/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="text-lg font-bold bg-gradient-to-r from-la-gold to-la-gold-light bg-clip-text text-transparent">
          Lokki
        </Link>
        <div className="hidden md:flex items-center gap-2">
          {navLinks}
        </div>
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
          aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
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
      {isMobileMenuOpen && (
        <div className="md:hidden px-4 pb-4 border-t border-gray-200/50 dark:border-white/5 bg-white/95 dark:bg-la-dark/95 backdrop-blur-xl">
          <div className="flex flex-col gap-2 pt-3">
            {navLinks}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
