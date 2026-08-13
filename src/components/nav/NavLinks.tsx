import React from 'react';
import { Link } from 'react-router-dom';

type NavLinkItem = {
  readonly path: string;
  readonly label: string;
};

type NavLinksProps = {
  readonly links: readonly NavLinkItem[];
  readonly pathname: string;
};

export const PRIMARY_NAV_LINKS = [
  { path: '/', label: '홈' },
  { path: '/simulation', label: '주간골드' },
  { path: '/enhancement', label: '재련견적' },
  { path: '/market', label: '시세' },
  { path: '/compare', label: '비교' },
  { path: '/character', label: '캐릭터' },
  { path: '/spec-simulator', label: '전투력 시뮬' },
] as const;

export const MORE_NAV_LINKS = [
  { path: '/expedition', label: '원정대' },
  { path: '/spending', label: '결제 내역' },
] as const;

export const getNavItemClass = (isActive: boolean): string =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 inline-flex items-center gap-1.5 ${
    isActive
      ? 'bg-la-gold/20 text-la-gold-dark dark:text-la-gold'
      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
  }`;

export const NavLinks: React.FC<NavLinksProps> = ({ links, pathname }) => (
  <>
    {links.map((link) => (
      <Link key={link.path} to={link.path} className={getNavItemClass(pathname === link.path)}>
        {link.label}
      </Link>
    ))}
  </>
);
