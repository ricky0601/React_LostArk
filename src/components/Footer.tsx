import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/routes';

const Footer: React.FC = () => (
  <footer className="border-t border-gray-200/70 bg-white/70 px-4 py-6 text-gray-500 transition-colors duration-300 dark:border-white/10 dark:bg-la-dark/70 dark:text-gray-400">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 text-center text-xs leading-relaxed sm:text-left">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="font-medium text-gray-700 dark:text-gray-300">
          © 2026 로아끼욧. All rights reserved.
        </p>
        <nav aria-label="푸터 링크" className="flex items-center justify-center gap-4 sm:justify-end">
          <Link
            to={ROUTES.policy}
            className="font-medium text-gray-600 transition-colors hover:text-la-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-gray-300 dark:hover:text-la-gold"
          >
            개인정보처리방침
          </Link>
          <a
            href="https://discord.gg/xRgvcwt6W"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-600 transition-colors hover:text-la-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-gray-300 dark:hover:text-la-gold"
          >
            Discord
          </a>
        </nav>
      </div>
      <div className="space-y-1 border-t border-gray-200/60 pt-4 dark:border-white/5">
        <p>본 사이트는 Smilegate RPG 및 STOVE의 공식 서비스가 아닙니다.</p>
        <p>게임 데이터는 LOST ARK Open API를 기반으로 제공됩니다.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
