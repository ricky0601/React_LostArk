import type { ReactElement } from 'react';
import type { ActiveCategory, SpecScoreCategory } from './specScoreSimulatorTypes';

interface SpecScoreCategoryTabsProps {
  readonly categories: readonly SpecScoreCategory[];
  readonly activeCategory: ActiveCategory;
  readonly onCategoryChange: (category: ActiveCategory) => void;
}

export const SpecScoreCategoryTabs = ({
  categories,
  activeCategory,
  onCategoryChange,
}: SpecScoreCategoryTabsProps): ReactElement => (
  <div className="spec-lab-card p-2">
    <div className="flex snap-x gap-1.5 overflow-x-auto pb-1">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onCategoryChange(c.id)}
          className={`snap-start rounded-xl border px-3 py-2 text-left text-xs font-bold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/30 ${
            activeCategory === c.id
              ? 'border-la-gold/50 bg-la-gold/20 text-la-gold-dark shadow-sm shadow-la-gold/10 dark:text-la-gold'
              : 'border-transparent text-gray-500 hover:border-gray-200/70 hover:bg-white/65 dark:text-gray-400 dark:hover:border-white/10 dark:hover:bg-white/5'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {c.label}
            {c.changedCount !== undefined && c.changedCount > 0 && (
              <span className="rounded-full bg-la-gold/20 px-1.5 py-0.5 text-[10px] text-la-gold-dark dark:text-la-gold">변경 {c.changedCount}</span>
            )}
          </span>
          <span className="mt-0.5 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
            {c.summaryLabel ?? (c.count !== undefined && c.count > 0 ? `${c.countLabel ?? c.count}개 항목` : '대기')}
          </span>
        </button>
      ))}
    </div>
  </div>
);
