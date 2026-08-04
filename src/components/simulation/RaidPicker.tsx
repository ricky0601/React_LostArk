import React from 'react';
import type { RaidColumn, SelectedRaid } from '../../data/raidGold';

interface RaidPickerProps {
  readonly allRaids: RaidColumn[];
  readonly availableRaids: SelectedRaid[];
  readonly selectedRaidKeys: string[];
  readonly hasCustomRaids: boolean;
  readonly formatGold: (gold: number) => string;
  readonly onRaidSelectionChange: (keys: string[]) => void;
  readonly onResetRaidSelection: () => void;
}

const RaidPicker: React.FC<RaidPickerProps> = ({
  allRaids,
  availableRaids,
  selectedRaidKeys,
  hasCustomRaids,
  formatGold,
  onRaidSelectionChange,
  onResetRaidSelection,
}) => (
  <section className="mt-4 min-w-0 border-t border-gray-200 pt-4 dark:border-white/10" aria-label="레이드 선택">
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">참여 레이드 선택</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
          체크한 레이드 중 참여 가능한 골드 상위 3개가 적용됩니다.
        </p>
      </div>
      {hasCustomRaids && (
        <button
          type="button"
          onClick={onResetRaidSelection}
          className="w-fit rounded-lg border border-gray-200 bg-white/70 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:border-la-gold/50 hover:text-la-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:text-la-gold"
        >
          기본값(골드 높은 순 3개)으로 되돌리기
        </button>
      )}
    </div>

    <div className="grid max-h-96 min-w-0 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
      {allRaids.map((raid) => {
        const key = `${raid.raidName}::${raid.difficulty}`;
        const available = availableRaids.some(
          (candidate) => candidate.raidName === raid.raidName && candidate.difficulty === raid.difficulty,
        );
        const checked = selectedRaidKeys.includes(key);
        return (
          <label
            key={key}
            className={`group relative min-h-28 min-w-0 cursor-pointer overflow-hidden rounded-xl border bg-la-dark text-white shadow-sm transition-[border-color,box-shadow,opacity] duration-200 focus-within:ring-2 focus-within:ring-la-gold/60 active:opacity-90 ${
              available
                ? checked
                  ? 'border-la-gold shadow-gold-glow ring-1 ring-inset ring-la-gold/70'
                  : 'border-gray-700 hover:border-la-gold/60 dark:border-white/10'
                : checked
                  ? 'border-gray-400/70 ring-1 ring-inset ring-gray-300/40 dark:border-white/20'
                  : 'border-gray-700/70 hover:border-gray-500 dark:border-white/10'
            }`}
          >
            <img
              src={raid.imagePath}
              alt={`${raid.raidName} 레이드`}
              width={480}
              height={224}
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-[filter,opacity,transform] duration-300 group-hover:scale-105 ${
                available ? (checked ? 'opacity-95' : 'opacity-80') : 'opacity-30 grayscale'
              }`}
            />
            <span
              aria-hidden="true"
              className={`absolute inset-0 bg-gradient-to-r ${
                available
                  ? 'from-black/90 via-black/55 to-black/10'
                  : 'from-black via-black/80 to-black/55'
              }`}
            />
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />

            <span className="relative z-10 flex min-h-28 min-w-0 flex-col justify-between p-3">
              <span className="flex items-start justify-between gap-2">
                <span
                  className={`rounded-md border px-2 py-1 text-[10px] font-bold backdrop-blur-sm ${
                    available
                      ? 'border-white/20 bg-black/45 text-white'
                      : 'border-gray-400/30 bg-black/60 text-gray-300'
                  }`}
                >
                  {available ? raid.difficulty : `참여 불가 · Lv.${raid.requiredLevel}`}
                </span>
                <input
                  type="checkbox"
                  aria-label={`${raid.raidName} ${raid.difficulty} 선택`}
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selectedRaidKeys.filter((selectedKey) => selectedKey !== key)
                      : [...selectedRaidKeys, key];
                    onRaidSelectionChange(next);
                  }}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 shadow-sm backdrop-blur-md transition-colors ${
                    checked
                      ? available
                        ? 'border-la-gold bg-la-gold text-la-dark'
                        : 'border-gray-300 bg-gray-200 text-gray-700'
                      : 'border-white/60 bg-black/35 text-transparent group-hover:border-white'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-black tracking-tight text-white sm:text-base">
                  {raid.raidName}
                </span>
                <span className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className={`font-bold tabular-nums ${available ? 'text-la-gold-light' : 'text-gray-400'}`}>
                    {formatGold(raid.totalGold)}G
                  </span>
                  {checked && (
                    <span className={`font-semibold ${available ? 'text-la-gold-light' : 'text-gray-300'}`}>
                      선택됨
                    </span>
                  )}
                </span>
              </span>
            </span>
          </label>
        );
      })}
    </div>
    <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
      제한 없이 체크 가능 · 참여 레벨 미달 레이드는 선택 상태만 저장됩니다.
    </p>
  </section>
);

export default RaidPicker;
