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
  <section className="spec-lab-card overflow-hidden p-3" aria-labelledby="workbench-navigation-title">
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-la-gold-dark dark:text-la-gold">
          Workbench modes
        </p>
        <h2 id="workbench-navigation-title" className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
          조정할 영역 선택
        </h2>
      </div>
      <p className="hidden text-[11px] font-medium text-gray-400 dark:text-gray-500 sm:block">
        선택한 영역만 집중 편집
      </p>
    </div>
    <nav aria-label="시뮬레이션 편집 영역" className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex w-max min-w-full snap-x gap-1.5 rounded-xl bg-gray-100/80 p-1 dark:bg-black/20">
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onCategoryChange(category.id)}
              className={`group min-h-12 flex-none snap-start rounded-lg border px-3 py-2 text-left whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 ${
                isActive
                  ? 'border-la-gold/40 bg-white text-gray-950 shadow-sm shadow-gray-900/5 dark:bg-la-dark-card dark:text-white'
                  : 'border-transparent text-gray-500 hover:border-gray-200/80 hover:bg-white/65 dark:text-gray-400 dark:hover:border-white/10 dark:hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-bold">
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-la-gold' : 'bg-gray-300 group-hover:bg-la-gold/60 dark:bg-gray-600'}`} />
                {category.label}
                {category.changedCount !== undefined && category.changedCount > 0 && (
                  <span className="rounded-md bg-la-gold/15 px-1.5 py-0.5 text-[10px] text-la-gold-dark dark:text-la-gold">
                    변경 {category.changedCount}
                  </span>
                )}
              </span>
              <span className={`mt-1 block text-[10px] font-medium ${isActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {category.summaryLabel ?? (category.count !== undefined && category.count > 0 ? `${category.countLabel ?? category.count}개 항목` : '대기')}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  </section>
);
