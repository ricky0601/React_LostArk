import React from 'react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/raid-composition', label: '공대 시너지', end: true },
  { to: '/raid-composition/applicants', label: '신청자 사사게 조회', end: false },
] as const;

const RaidCompositionTabs: React.FC = () => (
  <nav aria-label="공대 편성 기능" className="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-la-dark">
    <div className="mx-auto flex w-full max-w-5xl gap-1 px-4">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            isActive
              ? 'border-la-gold text-la-gold-dark dark:text-la-gold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default RaidCompositionTabs;
