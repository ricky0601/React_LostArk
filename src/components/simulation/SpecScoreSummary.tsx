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
      <div ref={cockpitRef} className="spec-lab-card overflow-hidden">
        <div className="border-b border-gray-200/70 px-4 py-3 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-la-gold-dark dark:text-la-gold">
                Live result
              </p>
              <h2 className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">전투력 콕핏</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasMods ? 'spec-chip' : 'spec-chip border-gray-200 bg-gray-100 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400'}>
                변경 {changedCount}개
              </span>
              {hasMods && (
                <button type="button" onClick={onReset} className="spec-mini-button min-h-9 px-3">
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          <div className="relative overflow-hidden rounded-xl border border-la-gold/30 bg-gradient-to-br from-la-gold/15 via-la-gold/10 to-transparent px-4 py-4">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-la-gold/10 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-la-gold-dark/80 dark:text-la-gold/80">
                  시뮬레이션 전투력
                </p>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                  현재 기준 대비
                </span>
              </div>
              <p className={`mt-2 text-2xl font-black leading-none tracking-tight tabular-nums sm:text-3xl ${hasMods ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-500 dark:text-gray-400'}`}>
                {sim ? formatNumber(sim.simulated) : '-'}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-la-gold/20 pt-2">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">현재 전투력</span>
                <span className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-200">
                  {sim ? formatNumber(sim.current) : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-gray-200/70 bg-gray-50/80 p-3 dark:border-white/10 dark:bg-black/20">
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">전투력 변화</p>
              <p className={`mt-1.5 text-lg font-black leading-none tabular-nums sm:text-xl ${deltaColor}`}>
                {delta > 0 ? '+' : ''}
                {formatNumber(delta)}
              </p>
              <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                {hasMods ? '선택 옵션 반영' : '변경 없음'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200/70 bg-gray-50/80 p-3 dark:border-white/10 dark:bg-black/20">
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">아이템 레벨</p>
              <p className={`mt-1.5 text-lg font-black leading-none tabular-nums sm:text-xl ${hasMods ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                {simulatedItemLevel.toFixed(2)}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                <span className="tabular-nums text-gray-400 dark:text-gray-500">{currentItemLevel.toFixed(2)}</span>
                <span className={`font-bold tabular-nums ${itemLevelDeltaColor}`}>
                  {itemLevelDelta > 0 ? '+' : ''}{itemLevelDelta.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-la-gold/20 bg-la-gold/10 px-3 py-2.5 dark:bg-la-gold/10">
            <div className="flex items-center justify-between gap-3">
              <span className="flex-shrink-0 text-[10px] font-bold text-la-gold-dark dark:text-la-gold">다음 액션</span>
              <span className="text-right text-xs font-semibold text-gray-700 dark:text-gray-200">{nextActionLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`spec-mobile-scorebar transition-all duration-200 xl:hidden ${isCockpitVisible ? 'pointer-events-none translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}
        aria-label="모바일 전투력 변화 요약"
      >
        <div className="flex-shrink-0">
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
          <button type="button" onClick={onReset} className="spec-mini-button min-h-10 flex-shrink-0 px-3">
            초기화
          </button>
        )}
      </div>
    </>
  );
};;
