import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ScoreSimulation } from './specScoreSimulatorTypes';

interface SpecScoreSummaryProps {
  readonly sim: ScoreSimulation | null;
  readonly hasMods: boolean;
  readonly deltaColor: string;
  readonly currentItemLevel: number;
  readonly simulatedItemLevel: number;
  readonly itemLevelDelta: number;
  readonly changedCount: number;
  readonly nextActionLabel: string;
  readonly onReset: () => void;
}

const formatNumber = (value: number): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SpecScoreSummary = ({
  sim,
  hasMods,
  deltaColor,
  currentItemLevel,
  simulatedItemLevel,
  itemLevelDelta,
  changedCount,
  nextActionLabel,
  onReset,
}: SpecScoreSummaryProps): ReactElement => {
  const cockpitRef = useRef<HTMLDivElement>(null);
  const [isCockpitVisible, setIsCockpitVisible] = useState(true);
  const delta = sim?.delta ?? 0;
  const itemLevelDeltaColor =
    itemLevelDelta > 0
      ? 'text-green-600 dark:text-green-400'
      : itemLevelDelta < 0
        ? 'text-red-500 dark:text-red-400'
        : 'text-gray-400 dark:text-gray-600';

  useEffect(() => {
    const cockpit = cockpitRef.current;
    if (!cockpit || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCockpitVisible(entry?.isIntersecting ?? true);
      },
      { threshold: 0 },
    );

    observer.observe(cockpit);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={cockpitRef} className="spec-lab-card overflow-hidden p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">전투력 콕핏</p>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">현재 → 시뮬 결과</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={hasMods ? 'spec-chip' : 'spec-chip border-gray-200 bg-gray-100 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400'}>
              변경 {changedCount}개
            </span>
            {hasMods && (
              <button
                type="button"
                onClick={onReset}
                className="spec-mini-button min-h-9 px-3"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        <div className="mb-3 rounded-xl border border-la-gold/20 bg-la-gold/10 px-3 py-2 dark:bg-la-gold/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-la-gold-dark dark:text-la-gold">다음 액션</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{nextActionLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-1">
          <div className="rounded-2xl border border-gray-200/70 bg-white/55 px-4 py-3 shadow-inner dark:border-white/10 dark:bg-black/20">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">현재 기준</p>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">전투력</span>
                <span className="text-lg font-black tabular-nums text-gray-950 dark:text-white sm:text-xl">
                  {sim ? formatNumber(sim.current) : '-'}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">아이템 레벨</span>
                <span className="text-lg font-black tabular-nums text-gray-700 dark:text-gray-300 sm:text-xl">
                  {currentItemLevel.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-la-gold/30 bg-la-gold/10 px-4 py-3 shadow-inner shadow-la-gold/5 dark:bg-la-gold/10">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-la-gold-dark/80 dark:text-la-gold/80">시뮬레이션 결과</p>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">전투력</span>
                <span className={`text-lg font-black tabular-nums sm:text-xl ${hasMods ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-400 dark:text-gray-600'}`}>
                  {sim ? formatNumber(sim.simulated) : '-'}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">아이템 레벨</span>
                <span className={`text-lg font-black tabular-nums sm:text-xl ${hasMods ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-400 dark:text-gray-600'}`}>
                  {simulatedItemLevel.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200/70 bg-white/55 px-4 py-3 shadow-inner dark:border-white/10 dark:bg-black/20">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">변화량</p>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">전투력</span>
                <span className={`text-lg font-black tabular-nums sm:text-xl ${deltaColor}`}>
                  {delta > 0 ? '+' : ''}
                  {formatNumber(delta)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">아이템 레벨</span>
                <span className={`text-lg font-black tabular-nums sm:text-xl ${itemLevelDeltaColor}`}>
                  {itemLevelDelta > 0 ? '+' : ''}
                  {itemLevelDelta.toFixed(2)}
                </span>
              </div>
            </div>
            {!hasMods && (
              <p className="mt-3 text-right text-[10px] text-gray-400 dark:text-gray-600">변경 없음</p>
            )}
          </div>
        </div>
      </div>

      <div
        className={`spec-mobile-scorebar transition-all duration-200 xl:hidden ${isCockpitVisible ? 'pointer-events-none translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}
        aria-label="모바일 전투력 변화 요약"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">변화량</p>
          <p className={`text-base font-black tabular-nums ${deltaColor}`}>
            {delta > 0 ? '+' : ''}{formatNumber(delta)}
          </p>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-[10px] font-bold text-gray-500 dark:text-gray-400">
            변경 {changedCount}개 · Lv {itemLevelDelta > 0 ? '+' : ''}{itemLevelDelta.toFixed(2)}
          </p>
          <p className="truncate text-xs font-semibold text-gray-700 dark:text-gray-200">{nextActionLabel}</p>
        </div>
        {hasMods && (
          <button type="button" onClick={onReset} className="spec-mini-button min-h-10 px-3">
            초기화
          </button>
        )}
      </div>
    </>
  );
};;
