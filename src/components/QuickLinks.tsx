import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface QuickLinkItem {
  to: string;
  title: string;
  description: string;
}

const ALL_LINKS: QuickLinkItem[] = [
  { to: '/simulation', title: '주간 골드 계산', description: '주간 골드와 숙제 현황' },
  { to: '/enhancement', title: '재련 계산', description: '재료 시세 기반 강화 비용' },
  { to: '/market', title: '시세 랭킹', description: '각인서·보석 최저가 순위' },
  { to: '/compare', title: '캐릭터 비교', description: '두 캐릭터 스펙 비교' },
  { to: '/character', title: '캐릭터 프로필', description: '캐릭터 상세 정보 조회' },
  { to: '/expedition', title: '원정대 조회', description: '원정대 캐릭터 목록' },
];

/** 검색 전 빈 화면을 채우는 다른 기능 바로가기. 현재 페이지는 목록에서 제외한다. */
const QuickLinks: React.FC = () => {
  const { pathname } = useLocation();
  const items = ALL_LINKS.filter((item) => item.to !== pathname).slice(0, 3);

  if (items.length === 0) return null;

  return (
    <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3 animate-fade-in">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="glass-card p-4 text-left transition-all duration-300 hover:shadow-gold-glow hover:border-la-gold/30 dark:hover:border-la-gold/20"
        >
          <p className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
        </Link>
      ))}
    </div>
  );
};

export default QuickLinks;
