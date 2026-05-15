import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CharacterGoldResult, RaidColumn, SelectedRaid } from '../../data/raidGold';
import { bonusKey, completedKey } from '../../utils/simulationKeys';

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
  const [expandedRaids, setExpandedRaids] = useState<Set<string>>(new Set());
  const [showRaidPicker, setShowRaidPicker] = useState(false);

  const toggleExpand = (raidKey: string): void => {
    setExpandedRaids((prev) => {
      const next = new Set(prev);
      if (next.has(raidKey)) {
        next.delete(raidKey);
      } else {
        next.add(raidKey);
      }
      return next;
    });
  };

  const getRaidBonusCost = (raid: SelectedRaid): number => {
    return raid.gates.reduce((sum, g) => {
      const key = bonusKey(result.characterName, raid.raidName, raid.difficulty, g.gate);
      return sum + (bonusSelections.has(key) ? g.bonusCost : 0);
    }, 0);
  };

  const characterBoundGold = result.selectedRaids.reduce((sum, r) => sum + r.boundGold, 0);
  const characterTradeableGold = result.totalGold - characterBoundGold;
  const netTotal = result.totalGold - characterBonusCost;
  const netBound = Math.max(0, characterBoundGold - characterBonusCost);
  const netTradeable = netTotal - netBound;

  return (
    <div
      className={`glass-card p-4 md:p-5 animate-slide-up overflow-x-hidden ${dimmed ? 'opacity-50' : ''}`}
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
    >
      <div className="flex flex-col md:flex-row md:items-start gap-4 min-w-0">
        <div className="flex items-center gap-3 md:w-56 flex-shrink-0">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 flex-shrink-0">
            <img
              src={result.characterImage}
              alt={result.characterName}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="min-w-0">
            <Link
              to={`/character?nickname=${encodeURIComponent(result.characterName)}`}
              className="block hover:opacity-80 transition-opacity"
            >
              <h3 className="font-bold text-gray-900 dark:text-white truncate">{result.characterName}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{result.characterClass}</p>
            </Link>
            <div className="flex flex-col items-start gap-1 mt-1">
              <span className="text-xs bg-la-gold/20 text-la-gold-dark dark:text-la-gold px-2 py-0.5 rounded font-medium">
                Lv.{result.itemLevel.toFixed(2)}
              </span>
              {coreData && coreData.base > 0 && (
                <span className="text-xs bg-purple-500/15 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded font-medium">
                  코어 {coreData.base}{coreData.bonus > 0 ? `+${coreData.bonus}` : ''}
                </span>
              )}
              {result.selectedRaids.length > 0 && !dimmed && (
                <button
                  onClick={onToggleAllCharBonus}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all duration-200 cursor-pointer border ${
                    isAllCharBonusSelected
                      ? 'bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-red-400/50 hover:text-red-500 dark:bg-white/5 dark:border-white/10 dark:text-gray-400 dark:hover:text-red-400'
                  }`}
                >
                  {isAllCharBonusSelected ? '더보기 해제' : '일괄 더보기'}
                </button>
              )}
              {!dimmed && result.availableRaids.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRaidPicker((p) => !p)}
                  className="px-2 py-0.5 rounded text-[11px] font-medium border bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/15 cursor-pointer"
                >
                  {showRaidPicker ? '레이드 선택 닫기' : '레이드 변경'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {result.selectedRaids.map((raid) => {
            const raidKey = `${raid.raidName}::${raid.difficulty}`;
            const isRaidAvailable = result.availableRaids.some((r) => r.raidName === raid.raidName && r.difficulty === raid.difficulty);
            const isExpanded = expandedRaids.has(raidKey);
            const raidBonusCost = getRaidBonusCost(raid);
            const raidHasCores = raid.gates.some((g) => g.coreReward > 0);
            const isCompleted = completedRaids.has(completedKey(result.characterName, raid.raidName, raid.difficulty));

            return (
              <div key={raidKey}>
                <div
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    dimmed ? 'cursor-default' : 'cursor-pointer'
                  } ${isCompleted ? 'opacity-60' : ''} ${
                    raid.isBound
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300'
                      : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                  }`}
                >
                  <div className="flex items-center gap-2" onClick={() => !dimmed && toggleExpand(raidKey)}>
                    {!dimmed && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(raid.raidName, raid.difficulty);
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                          isCompleted
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                    {!dimmed && (
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    <span className={`font-medium ${isCompleted ? 'line-through' : ''}`}>{raid.raidName}</span>
                    <span className="text-xs opacity-70">{raid.difficulty}</span>
                    {raidHasCores && (
                      <span className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">
                        코어
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={() => !dimmed && toggleExpand(raidKey)}>
                    {isRaidAvailable && raidBonusCost > 0 && (
                      <span className="text-xs text-red-500 dark:text-red-400">-{formatGold(raidBonusCost)}</span>
                    )}
                    <div className={`flex flex-col items-end leading-tight ${isCompleted ? 'line-through' : ''}`}>
                      <span className="font-bold">{formatGold(raid.totalGold)}G</span>
                      {raid.boundGold > 0 && raid.boundGold < raid.totalGold && (
                        <span className="text-[10px]">
                          <span className="text-la-gold-dark dark:text-la-gold">{formatGold(raid.totalGold - raid.boundGold)}</span>
                          <span className="text-gray-400 dark:text-gray-500"> + </span>
                          <span className="text-sky-600 dark:text-sky-400">{formatGold(raid.boundGold)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && !dimmed && isRaidAvailable && (
                  <div className="mt-1 ml-5 space-y-1">
                    {raid.gates.map((gate) => {
                      const gateKey = bonusKey(result.characterName, raid.raidName, raid.difficulty, gate.gate);
                      const isChecked = bonusSelections.has(gateKey);
                      return (
                        <div
                          key={gate.gate}
                          className="flex items-center justify-between px-3 py-1.5 rounded-md bg-gray-50/50 dark:bg-white/[0.02] text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-6">G{gate.gate}</span>
                            <span className="text-gray-700 dark:text-gray-300">{formatGold(gate.gold)}G</span>
                            {gate.coreReward > 0 && (
                              <span className="text-[10px] text-purple-500 dark:text-purple-400">
                                코어 {gate.coreReward}{isChecked ? `+${gate.coreReward}` : ''}
                              </span>
                            )}
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <span className={`text-xs ${isChecked ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              더보기 {isChecked ? `-${formatGold(gate.bonusCost)}G` : `${formatGold(gate.bonusCost)}G`}
                            </span>
                            <div
                              onClick={(e) => {
                                e.preventDefault();
                                onToggleBonus(raid.raidName, raid.difficulty, gate.gate);
                              }}
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                                isChecked
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-red-400'
                              }`}
                            >
                              {isChecked && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {result.selectedRaids.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">참여 가능한 레이드가 없습니다</p>
          )}

          {!dimmed && showRaidPicker && allRaids.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">전체 레이드 자유 선택 (체크한 것 중 참여 가능한 레이드 골드 상위 3개가 적용)</p>
              {hasCustomRaids && (
                <button
                  type="button"
                  onClick={onResetRaidSelection}
                  className="mb-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer underline"
                >
                  기본값(골드 높은 순 3개)으로 되돌리기
                </button>
              )}
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                {allRaids.map((col) => {
                  const key = `${col.raidName}::${col.difficulty}`;
                  const available = result.availableRaids.some((r) => r.raidName === col.raidName && r.difficulty === col.difficulty);
                  const checked = selectedRaidKeys.includes(key);
                  const toggle = () => {
                    const next = checked
                      ? selectedRaidKeys.filter((k) => k !== key)
                      : [...selectedRaidKeys, key];
                    onRaidSelectionChange(next);
                  };
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer border transition-colors ${
                        available
                          ? checked
                            ? 'bg-la-gold/20 border-la-gold/50 text-la-gold-dark dark:text-la-gold'
                            : 'border-gray-200 dark:border-white/10 hover:border-la-gold/30'
                          : checked
                            ? 'bg-gray-200 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-600 dark:text-gray-400'
                            : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={toggle}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="font-medium">{col.raidName}</span>
                      <span className="opacity-80">{col.difficulty}</span>
                      {!available && <span className="text-[10px]">Lv.{col.requiredLevel}</span>}
                      <span className={available ? 'text-la-gold-dark dark:text-la-gold' : 'text-la-gold-dark/70 dark:text-la-gold/70'}>
                        {formatGold(col.totalGold)}G
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">제한 없이 체크 가능 · 골드는 참여 가능한 레이드 중 골드 상위 3개만 적용</p>
            </div>
          )}
        </div>

        <div className="md:w-40 text-right flex-shrink-0 min-w-0">
          <p className="text-xs text-gray-400 dark:text-gray-500">주간 골드</p>
          {characterBoundGold > 0 ? (
            <p className="text-base md:text-lg font-bold leading-tight">
              <span className={`inline-block whitespace-nowrap ${dimmed ? 'text-gray-400 dark:text-gray-600' : 'text-la-gold-dark dark:text-la-gold'}`}>
                {formatGold(characterTradeableGold)}
              </span>
              <span className="text-gray-400 dark:text-gray-500"> + </span>
              <span className={`inline-block whitespace-nowrap ${dimmed ? 'text-gray-400 dark:text-gray-600' : 'text-sky-600 dark:text-sky-400'}`}>
                {formatGold(characterBoundGold)}
              </span>
            </p>
          ) : (
            <p className={`text-xl font-bold ${dimmed ? 'text-gray-400 dark:text-gray-600' : 'text-la-gold-dark dark:text-la-gold'}`}>
              {formatGold(result.totalGold)}G
            </p>
          )}
          {characterBonusCost > 0 && (
            <>
              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">더보기 -{formatGold(characterBonusCost)}G</p>
              {characterBoundGold > 0 ? (
                <p className="text-xs md:text-sm font-bold border-t border-gray-200 dark:border-white/10 mt-1 pt-1 leading-tight">
                  <span className="inline-block whitespace-nowrap text-la-gold-dark dark:text-la-gold">{formatGold(netTradeable)}</span>
                  <span className="text-gray-400 dark:text-gray-500"> + </span>
                  <span className="inline-block whitespace-nowrap text-sky-600 dark:text-sky-400">{formatGold(netBound)}</span>
                </p>
              ) : (
                <p className="text-sm font-bold text-la-gold-dark dark:text-la-gold border-t border-gray-200 dark:border-white/10 mt-1 pt-1">
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
