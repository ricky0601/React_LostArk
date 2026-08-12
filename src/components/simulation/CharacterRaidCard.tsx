import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CharacterGoldResult, RaidColumn } from '../../data/raidGold';
import FallbackImage from '../FallbackImage';
import RaidPicker from './RaidPicker';
import SelectedRaidRow from './SelectedRaidRow';

export interface CharacterRaidCardProps {
  result: CharacterGoldResult;
  index: number;
  formatGold: (gold: number) => string;
  dimmed?: boolean;
  bonusSelections: Set<string>;
  onToggleBonus: (raidName: string, difficulty: string, gate: number) => void;
  onToggleAllCharBonus: () => void;
  isAllCharBonusSelected: boolean;
  characterBonusCost: number;
  coreData?: { base: number; bonus: number };
  completedRaids: Set<string>;
  onToggleComplete: (raidName: string, difficulty: string) => void;
  selectedRaidKeys: string[];
  onRaidSelectionChange: (keys: string[]) => void;
  onResetRaidSelection: () => void;
  hasCustomRaids: boolean;
  allRaids: RaidColumn[];
}

const CharacterRaidCard: React.FC<CharacterRaidCardProps> = ({
  result,
  index,
  formatGold,
  dimmed,
  bonusSelections,
  onToggleBonus,
  onToggleAllCharBonus,
  isAllCharBonusSelected,
  characterBonusCost,
  coreData,
  completedRaids,
  onToggleComplete,
  selectedRaidKeys,
  onRaidSelectionChange,
  onResetRaidSelection,
  hasCustomRaids,
  allRaids,
}) => {
  const [showRaidPicker, setShowRaidPicker] = useState(false);
  const raidPickerButtonRef = useRef<HTMLButtonElement>(null);
  const wasRaidPickerOpenRef = useRef(false);

  useEffect(() => {
    if (showRaidPicker) {
      wasRaidPickerOpenRef.current = true;
      return;
    }

    if (!wasRaidPickerOpenRef.current) return;
    wasRaidPickerOpenRef.current = false;
    raidPickerButtonRef.current?.focus();
  }, [showRaidPicker]);

  useEffect(() => {
    if (!showRaidPicker) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setShowRaidPicker(false);
    };
    let wasMobileViewport = window.innerWidth < 768;
    const handleResize = (): void => {
      const isMobileViewport = window.innerWidth < 768;
      if (wasMobileViewport !== isMobileViewport) setShowRaidPicker(false);
      wasMobileViewport = isMobileViewport;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [showRaidPicker]);

  const characterBoundGold = result.selectedRaids.reduce((sum, r) => sum + r.boundGold, 0);
  const characterTradeableGold = result.totalGold - characterBoundGold;
  const netTotal = result.totalGold - characterBonusCost;
  const netBound = Math.max(0, characterBoundGold - characterBonusCost);
  const netTradeable = netTotal - netBound;

  return (
    <div
      className={`glass-card overflow-x-hidden p-4 animate-slide-up md:p-5 ${dimmed ? 'opacity-50' : ''}`}
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
    >
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="min-w-0 rounded-xl border border-gray-200/80 bg-gray-50/70 p-3 shadow-sm shadow-gray-900/5 dark:border-white/10 dark:bg-black/20 dark:shadow-black/20 lg:w-60 lg:flex-none">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-16 w-16 flex-none overflow-hidden rounded-xl border border-white/50 bg-gray-100 shadow-sm dark:border-white/10 dark:bg-white/5">
              <FallbackImage
                src={result.characterImage}
                alt={result.characterName}
                width={128}
                height={128}
                fallbackLabel={`${result.characterName} 캐릭터 이미지 없음`}
                className="h-full w-full object-cover object-top"
              />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/45 to-transparent" />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                to={`/character?nickname=${encodeURIComponent(result.characterName)}`}
                className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/50"
              >
                <h3 className="truncate font-bold text-gray-900 transition-colors group-hover:text-la-gold-deep dark:text-white dark:group-hover:text-la-gold">
                  {result.characterName}
                </h3>
                <p className="mt-0.5 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                  {result.characterClass}
                </p>
              </Link>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="rounded-md bg-la-gold/15 px-1.5 py-1 text-[10px] font-bold tabular-nums text-la-gold-deep dark:text-la-gold">
                  Lv.{result.itemLevel.toFixed(2)}
                </span>
                {coreData && coreData.base > 0 && (
                  <span className="rounded-md bg-purple-500/15 px-1.5 py-1 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                    코어 {coreData.base}{coreData.bonus > 0 ? `+${coreData.bonus}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!dimmed && (result.selectedRaids.length > 0 || allRaids.length > 0) && (
            <div className="mt-3 flex min-w-0 gap-1.5 border-t border-gray-200/70 pt-2.5 dark:border-white/10">
              {result.selectedRaids.length > 0 && (
                <button
                  type="button"
                  onClick={onToggleAllCharBonus}
                  className={`min-h-9 min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 ${
                    isAllCharBonusSelected
                      ? 'border-red-400/50 bg-red-500/15 text-red-600 dark:text-red-400'
                      : 'border-gray-200 bg-white/70 text-gray-600 hover:border-red-400/50 hover:text-red-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:text-red-400'
                  }`}
                >
                  {isAllCharBonusSelected ? '더보기 해제' : '일괄 더보기'}
                </button>
              )}
              {allRaids.length > 0 && (
                <button
                  ref={raidPickerButtonRef}
                  type="button"
                  aria-expanded={showRaidPicker}
                  aria-label={showRaidPicker ? '레이드 변경 패널 열림' : '레이드 변경'}
                  onClick={() => setShowRaidPicker((current) => !current)}
                  className={`min-h-9 min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 ${
                    showRaidPicker
                      ? 'border-la-gold/50 bg-la-gold/15 text-la-gold-deep dark:text-la-gold'
                      : 'border-gray-200 bg-white/70 text-gray-600 hover:border-la-gold/50 hover:text-la-gold-deep dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:text-la-gold'
                  }`}
                >
                  {showRaidPicker ? '레이드 선택 중' : '레이드 변경'}
                </button>
              )}
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1 space-y-2">
          {result.selectedRaids.map((raid) => {
            const raidKey = `${raid.raidName}::${raid.difficulty}`;
            const available = result.availableRaids.some(
              (candidate) => candidate.raidName === raid.raidName && candidate.difficulty === raid.difficulty,
            );
            return (
              <SelectedRaidRow
                key={raidKey}
                raid={raid}
                characterName={result.characterName}
                formatGold={formatGold}
                dimmed={Boolean(dimmed)}
                available={available}
                bonusSelections={bonusSelections}
                completedRaids={completedRaids}
                onToggleBonus={onToggleBonus}
                onToggleComplete={onToggleComplete}
              />
            );
          })}
          {result.selectedRaids.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-white/10 dark:text-gray-500">
              참여 가능한 레이드가 없습니다
            </p>
          )}

          {!dimmed && showRaidPicker && allRaids.length > 0 && (
            <RaidPicker
              allRaids={allRaids}
              availableRaids={result.availableRaids}
              selectedRaidKeys={selectedRaidKeys}
              hasCustomRaids={hasCustomRaids}
              characterName={result.characterName}
              currentRaidNames={result.selectedRaids.map((raid) => `${raid.raidName} ${raid.difficulty}`)}
              formatGold={formatGold}
              onClose={() => setShowRaidPicker(false)}
              onRaidSelectionChange={onRaidSelectionChange}
              onResetRaidSelection={onResetRaidSelection}
            />
          )}
        </div>

        <div className="min-w-0 flex-none rounded-xl border border-gray-200/80 bg-gray-50/70 px-3 py-3 text-right dark:border-white/10 dark:bg-black/20 lg:w-40">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">주간 골드</p>
          {characterBoundGold > 0 ? (
            <p className="mt-1 text-base font-black leading-tight md:text-lg">
              <span className={`inline-block whitespace-nowrap ${dimmed ? 'text-gray-400 dark:text-gray-600' : 'text-la-gold-deep dark:text-la-gold'}`}>
                {formatGold(characterTradeableGold)}
              </span>
              <span className="text-gray-400 dark:text-gray-500"> + </span>
              <span className={`inline-block whitespace-nowrap ${dimmed ? 'text-gray-400 dark:text-gray-600' : 'text-sky-600 dark:text-sky-400'}`}>
                {formatGold(characterBoundGold)}
              </span>
            </p>
          ) : (
            <p className={`mt-1 text-xl font-black tabular-nums ${dimmed ? 'text-gray-400 dark:text-gray-600' : 'text-la-gold-deep dark:text-la-gold'}`}>
              {formatGold(result.totalGold)}G
            </p>
          )}
          {characterBonusCost > 0 && (
            <>
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">더보기 -{formatGold(characterBonusCost)}G</p>
              {characterBoundGold > 0 ? (
                <p className="mt-2 border-t border-gray-200 pt-2 text-xs font-bold leading-tight dark:border-white/10 md:text-sm">
                  <span className="inline-block whitespace-nowrap text-la-gold-deep dark:text-la-gold">{formatGold(netTradeable)}</span>
                  <span className="text-gray-400 dark:text-gray-500"> + </span>
                  <span className="inline-block whitespace-nowrap text-sky-600 dark:text-sky-400">{formatGold(netBound)}</span>
                </p>
              ) : (
                <p className="mt-2 border-t border-gray-200 pt-2 text-sm font-bold text-la-gold-deep dark:border-white/10 dark:text-la-gold">
                  {formatGold(netTotal)}G
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterRaidCard;
