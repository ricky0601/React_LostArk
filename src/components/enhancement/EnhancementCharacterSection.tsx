import React from 'react';
import GlassCard from '../GlassCard';
import SelectMenu from '../SelectMenu';
import StateFeedback from '../StateFeedback';
import {
  ADV_TARGET_OPTIONS,
  ALL_SLOTS,
  NORMAL_BULK_TARGET_OPTIONS,
  supportsAdvancedHoning,
} from './enhancementModel';
import type { EnhancementPageModel } from './useEnhancementPage';

const EnhancementCharacterSection: React.FC<{ model: EnhancementPageModel }> = ({ model }) => {
  const {
    charInput,
    setCharInput,
    charInputRef,
    slotIconMap,
    slotInheritedMap,
    advLevelMap,
    advTargetMap,
    charItemLevel,
    charLoading,
    charError,
    targetMap,
    slotCurrentLevel,
    slotHasData,
    handleSearch,
    handleResetCharSearch,
    handleTargetChange,
    targetTotalItemLevel,
    handleAdvTargetChange,
    hasAnyAdvSlotAvailable,
  } = model;
  return (
    <>
        {/* ── 헤더 ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            로아 강화 계산기
          </h1>
          <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400 mt-1">
            일반 재련과 상급 재련 목표를 설정하면 재료 시세를 반영한 로스트아크 강화 비용과 필요한 재료 견적을 계산합니다.
          </p>
        </div>

        {/* ── 캐릭터 검색 ── */}
        <GlassCard className="p-4">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
            캐릭터 강화 현황
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              ref={charInputRef}
              type="text"
              value={charInput}
              onChange={(e) => setCharInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="캐릭터명 입력"
              className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-la-gold/40"
            />
            <button
              onClick={handleSearch}
              disabled={charLoading}
              className="px-4 py-2 bg-la-gold/20 hover:bg-la-gold/30 text-la-gold-dark dark:text-la-gold rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {charLoading ? '조회 중…' : '조회'}
            </button>
          </div>

          {charError && (
            <StateFeedback
              tone="error"
              title="캐릭터 강화 현황 조회에 실패했습니다"
              description={`${charError} 닉네임을 확인한 뒤 다시 검색해 주세요.`}
              action={{ label: '닉네임 다시 입력', onClick: handleResetCharSearch }}
              compact
              className="mb-3"
            />
          )}

          {/* 슬롯 카드 - 현재 강화 수치 표시 */}
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {ALL_SLOTS.map((slot) => {
              const hasData = slotHasData[slot];
              const level = slotCurrentLevel[slot];
              const isActive = targetMap[slot] != null;
              return (
                <div
                  key={slot}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all duration-200 ${
                    isActive
                      ? 'border-la-gold/60 bg-la-gold/10 dark:bg-la-gold/10'
                      : hasData
                        ? 'border-gray-200/60 dark:border-white/10 bg-gray-50/60 dark:bg-white/5'
                        : 'border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/3 opacity-40'
                  }`}
                >
                  {slotIconMap[slot]
                    ? (
                      <div className="relative w-8 h-8">
                        <img src={slotIconMap[slot]} alt={slot} className="w-8 h-8 rounded-lg" />
                        {slotInheritedMap[slot] && (
                          <img
                            src="https://cdn-lostark.game.onstove.com/2018/obt/assets/images/common/game/bg_equipment_petBorder.png?cf40f871847e238f7644"
                            alt=""
                            className="absolute inset-0 w-8 h-8 pointer-events-none"
                          />
                        )}
                      </div>
                    )
                    : <span className="text-xs text-gray-500 dark:text-gray-400">{slot}</span>
                  }
                  <span className={`text-sm font-bold leading-none ${
                    isActive
                      ? 'text-la-gold-dark dark:text-la-gold'
                      : hasData
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-300 dark:text-gray-600'
                  }`}>
                    {hasData ? `+${level}` : '—'}
                  </span>
                  {supportsAdvancedHoning(slot) && !slotInheritedMap[slot] && hasData && (
                    <span className={`text-[10px] leading-none ${
                      advTargetMap[slot] != null
                        ? 'text-purple-500 dark:text-purple-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {advLevelMap[slot] ? `상급 ${advLevelMap[slot]}` : '상급 —'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 일반 재련 일괄 + 목표 선택 */}
          <div className="flex items-center gap-2 mt-2 mb-1">
            <span className="text-xs text-gray-400 dark:text-gray-500 w-8">일괄</span>
            <SelectMenu
              value={undefined}
              options={NORMAL_BULK_TARGET_OPTIONS}
              placeholder="일반 재련 일괄"
              ariaLabel="일반 재련 일괄 목표 선택"
              panelTitle="일반 재련 일괄 목표"
              onChange={(val) => {
                if (val === undefined) return;
                const targetLevel = Number(val);
                ALL_SLOTS.forEach((slot) => {
                  if (slotCurrentLevel[slot] < targetLevel) handleTargetChange(slot, targetLevel);
                });
              }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {ALL_SLOTS.map((slot) => {
              const currentLvl = slotCurrentLevel[slot];
              const targetOptions = Array.from({ length: 25 - currentLvl }, (_, i) => {
                const level = currentLvl + i + 1;
                return { value: level, label: `${level}강` };
              });
              return (
                <SelectMenu
                  key={slot}
                  value={targetMap[slot]}
                  options={targetOptions}
                  placeholder="목표"
                  ariaLabel={`${slot} 일반 재련 목표 선택`}
                  panelTitle={`${slot} 일반 재련 목표`}
                  onChange={(val) => handleTargetChange(slot, val === undefined ? undefined : Number(val))}
                  fullWidth
                  compact
                  align="center"
                  clearable
                />
              );
            })}
          </div>

          {hasAnyAdvSlotAvailable && (
            <>
              <div className="flex items-center gap-2 mt-2 mb-1">
                <span className="text-xs text-gray-400 dark:text-gray-500 w-8">일괄</span>
                <SelectMenu
                  value={undefined}
                  options={ADV_TARGET_OPTIONS}
                  placeholder="상급 재련 일괄"
                  ariaLabel="상급 재련 일괄 목표 선택"
                  panelTitle="상급 재련 일괄 목표"
                  variant="purple"
                  onChange={(val) => {
                    if (val === undefined) return;
                    const targetLevel = Number(val);
                    ALL_SLOTS.forEach((slot) => {
                      if (supportsAdvancedHoning(slot) && !slotInheritedMap[slot] && (advLevelMap[slot] ?? 0) < targetLevel) {
                        handleAdvTargetChange(slot, targetLevel);
                      }
                    });
                  }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                {ALL_SLOTS.map((slot) => {
                  if (!supportsAdvancedHoning(slot) || slotInheritedMap[slot]) {
                    return <div key={slot} />;
                  }
                  const currentAdv = advLevelMap[slot] ?? 0;
                  const availableTargets = ADV_TARGET_OPTIONS.filter((option) => option.value > currentAdv);
                  return (
                    <SelectMenu
                      key={slot}
                      value={advTargetMap[slot]}
                      options={availableTargets}
                      placeholder="상급"
                      ariaLabel={`${slot} 상급 재련 목표 선택`}
                      panelTitle={`${slot} 상급 재련 목표`}
                      onChange={(val) => handleAdvTargetChange(slot, val === undefined ? undefined : Number(val))}
                      variant="purple"
                      fullWidth
                      compact
                      align="center"
                      clearable
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* 종합 아이템 레벨 요약 */}
          {charItemLevel != null && (
            <div className="mt-2 text-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">종합 아이템 레벨 </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {charItemLevel.toFixed(2)}
              </span>
              {targetTotalItemLevel != null && (
                <>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="font-semibold text-la-gold-dark dark:text-la-gold">
                    {targetTotalItemLevel.toFixed(2)}
                  </span>
                  <span className="text-green-500 dark:text-green-400 ml-1 text-xs">
                    (+{(targetTotalItemLevel - charItemLevel).toFixed(2)})
                  </span>
                </>
              )}
            </div>
          )}

        </GlassCard>
    </>
  );
};

export default EnhancementCharacterSection;
