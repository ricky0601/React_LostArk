import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NavBar: React.FC = () => {
  const { pathname } = useLocation();

  const linkClass = (path: string) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
      pathname === path
        ? 'bg-la-gold/20 text-la-gold-dark dark:text-la-gold'
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
    }`;

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-la-dark/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold bg-gradient-to-r from-la-gold to-la-gold-light bg-clip-text text-transparent">
          LostArk
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/" className={linkClass('/')}>
            홈
          </Link>
          <Link to="/simulation" className={linkClass('/simulation')}>
            주간 골드 계산
          </Link>
          <Link to="/arkgrid" className={linkClass('/arkgrid')}>
            아크그리드
          </Link>
          <Link to="/character" className={linkClass('/character')}>
            캐릭터
          </Link>
          <Link to="/compare" className={linkClass('/compare')}>
            비교
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
