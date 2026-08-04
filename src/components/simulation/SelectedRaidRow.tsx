import React, { useState } from 'react';
import type { SelectedRaid } from '../../data/raidGold';
import { bonusKey, completedKey } from '../../utils/simulationKeys';

interface SelectedRaidRowProps {
  readonly raid: SelectedRaid;
  readonly characterName: string;
  readonly formatGold: (gold: number) => string;
  readonly dimmed: boolean;
  readonly available: boolean;
  readonly bonusSelections: Set<string>;
  readonly completedRaids: Set<string>;
  readonly onToggleBonus: (raidName: string, difficulty: string, gate: number) => void;
  readonly onToggleComplete: (raidName: string, difficulty: string) => void;
}

const SelectedRaidRow: React.FC<SelectedRaidRowProps> = ({
  raid,
  characterName,
  formatGold,
  dimmed,
  available,
  bonusSelections,
  completedRaids,
  onToggleBonus,
  onToggleComplete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const raidBonusCost = raid.gates.reduce((sum, gate) => {
    const key = bonusKey(characterName, raid.raidName, raid.difficulty, gate.gate);
    return sum + (bonusSelections.has(key) ? gate.bonusCost : 0);
  }, 0);
  const hasCores = raid.gates.some((gate) => gate.coreReward > 0);
  const completed = completedRaids.has(completedKey(characterName, raid.raidName, raid.difficulty));
  const toggleExpanded = (): void => {
    if (!dimmed) setExpanded((current) => !current);
  };

  return (
    <article>
      <div
        className={`flex min-h-24 min-w-0 overflow-hidden rounded-xl border bg-white shadow-sm transition-colors dark:bg-la-dark-card sm:min-h-28 ${
          raid.isBound
            ? 'border-sky-200/80 dark:border-sky-700/40'
            : 'border-yellow-200/80 dark:border-yellow-700/40'
        }`}
      >
        <div
          className={`relative w-28 flex-none overflow-hidden sm:w-44 ${dimmed ? 'cursor-default' : 'cursor-pointer'}`}
          onClick={toggleExpanded}
        >
          <img
            src={raid.imagePath}
            alt={`${raid.raidName} 레이드`}
            width={352}
            height={224}
            className={`h-full w-full object-cover transition-[filter,opacity] duration-200 ${completed ? 'grayscale opacity-60' : ''}`}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-white/95 dark:to-la-dark-card"
          />
          <span className="absolute left-2 top-2 rounded-md border border-white/20 bg-black/55 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
            {raid.difficulty}
          </span>
          {!dimmed && (
            <button
              type="button"
              aria-label={`${raid.raidName} ${raid.difficulty} 완료`}
              aria-pressed={completed}
              onClick={(event) => {
                event.stopPropagation();
                onToggleComplete(raid.raidName, raid.difficulty);
              }}
              className={`absolute bottom-2 left-2 flex min-h-10 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold shadow-sm backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/70 ${
                completed
                  ? 'border-green-200 bg-green-700 text-white'
                  : 'border-white/40 bg-black/55 text-white hover:border-la-gold/80 hover:bg-black/70'
              }`}
            >
              <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  completed ? 'border-white bg-white/20' : 'border-white/70 bg-white/10'
                }`}
              >
                {completed && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {completed ? '완료됨' : '완료'}
            </button>
          )}
        </div>

        <button
          type="button"
          aria-expanded={expanded}
          onClick={toggleExpanded}
          disabled={dimmed}
          className={`flex min-w-0 flex-1 flex-col justify-between gap-2 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-la-gold/50 disabled:cursor-default sm:flex-row sm:items-center sm:gap-4 sm:px-4 ${completed ? 'opacity-60' : ''}`}
        >
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="flex min-w-0 items-center gap-2">
              {!dimmed && (
                <svg
                  aria-hidden="true"
                  className={`h-4 w-4 flex-none text-gray-400 transition-transform duration-200 dark:text-gray-500 ${expanded ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              <span className={`min-w-0 truncate text-sm font-bold text-gray-900 dark:text-white sm:text-base ${completed ? 'line-through' : ''}`}>
                {raid.raidName}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5 pl-0 sm:pl-6">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                  raid.isBound
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                    : 'bg-la-gold/15 text-la-gold-deep dark:text-la-gold'
                }`}
              >
                {raid.isBound ? '귀속 골드 포함' : '거래 가능 골드'}
              </span>
              {hasCores && (
                <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                  코어
                </span>
              )}
              {!available && (
                <span className="rounded-md bg-gray-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                  참여 불가
                </span>
              )}
            </span>
          </span>

          <span className="flex flex-none items-end justify-between gap-3 pl-0 sm:flex-col sm:items-end sm:justify-center">
            {available && raidBonusCost > 0 && (
              <span className="text-[11px] font-semibold text-red-500 dark:text-red-400">
                더보기 -{formatGold(raidBonusCost)}G
              </span>
            )}
            <span className={`flex flex-col leading-tight sm:items-end ${completed ? 'line-through' : ''}`}>
              <span className="text-base font-black tabular-nums text-gray-900 dark:text-white sm:text-lg">
                {formatGold(raid.totalGold)}G
              </span>
              {raid.boundGold > 0 && raid.boundGold < raid.totalGold && (
                <span className="mt-1 text-[10px] font-semibold tabular-nums">
                  <span className="text-la-gold-deep dark:text-la-gold">{formatGold(raid.totalGold - raid.boundGold)}</span>
                  <span className="text-gray-400 dark:text-gray-500"> + </span>
                  <span className="text-sky-600 dark:text-sky-400">{formatGold(raid.boundGold)}</span>
                </span>
              )}
            </span>
          </span>
        </button>
      </div>

      {expanded && !dimmed && available && (
        <div className="mt-1.5 space-y-1 sm:ml-44">
          {raid.gates.map((gate) => {
            const gateKey = bonusKey(characterName, raid.raidName, raid.difficulty, gate.gate);
            const checked = bonusSelections.has(gateKey);
            return (
              <div
                key={gate.gate}
                className="flex items-center justify-between rounded-lg border border-gray-200/60 bg-gray-50/70 px-3 py-2 text-sm dark:border-white/5 dark:bg-white/[0.03]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 flex-none text-xs font-semibold text-gray-500 dark:text-gray-400">G{gate.gate}</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatGold(gate.gold)}G</span>
                  {gate.coreReward > 0 && (
                    <span className="text-[10px] text-purple-500 dark:text-purple-400">
                      코어 {gate.coreReward}{checked ? `+${gate.coreReward}` : ''}
                    </span>
                  )}
                </div>
                <label className="flex cursor-pointer select-none items-center gap-2">
                  <span className={`text-xs ${checked ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    더보기 {checked ? `-${formatGold(gate.bonusCost)}G` : `${formatGold(gate.bonusCost)}G`}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleBonus(raid.raidName, raid.difficulty, gate.gate)}
                    className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-400 dark:border-gray-600 dark:bg-white/5"
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};

export default SelectedRaidRow;
