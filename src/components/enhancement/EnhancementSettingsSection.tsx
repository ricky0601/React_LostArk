import React from 'react';
import type { AdvTurnOption } from '../../data/enhancement';
import GlassCard from '../GlassCard';
import { ADV_TURN_OPTION_LABELS, ADV_TURN_OPTIONS } from './enhancementModel';
import type { EnhancementPageModel } from './useEnhancementPage';

const Toggle: React.FC<{
  label: string;
  active: boolean;
  badge?: string;
  color?: 'gold' | 'blue';
  onClick: () => void;
}> = ({ label, active, badge, color = 'gold', onClick }) => {
  const activeClass =
    color === 'blue'
      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40'
      : 'bg-la-gold/20 text-la-gold-dark dark:text-la-gold border-la-gold/40';
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
        active
          ? activeClass
          : 'bg-transparent text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10'
      }`}
    >
      {label}
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-green-500 text-white rounded-full px-1 leading-4">
          {badge}
        </span>
      )}
    </button>
  );
};
const EnhancementSettingsSection: React.FC<{ model: EnhancementPageModel }> = ({ model }) => {
  const {
    advTargetMap,
    useBook,
    setUseBook,
    useBreath,
    setUseBreath,
    costMode,
    setCostMode,
    advNormalOpt,
    setAdvNormalOpt,
    advAncestorOpt,
    setAdvAncestorOpt,
    advEnhancedOpt,
    setAdvEnhancedOpt,
    cheapest,
    activeAdvSlots,
    cheapestAdv,
    applyCheapestAdv,
    hasPrices,
    isCheapest,
    hasBookSteps,
    hasResult,
    hasAdvResult,
    hasAnyAdvSlotAvailable,
  } = model;
  return (
    <>
        {/* ── 일반 재련 설정 ── */}
        {hasResult && (
          <GlassCard className="p-4">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">일반 재련 설정</h2>
            <div className="flex flex-wrap items-center gap-3">
              {hasBookSteps && (
                <Toggle
                  label={`책 ${useBook ? 'ON' : 'OFF'}`}
                  active={useBook}
                  color="gold"
                  badge={hasPrices && isCheapest(true, useBreath) && !useBook ? '최적' : undefined}
                  onClick={() => setUseBook((b) => !b)}
                />
              )}
              <Toggle
                label={`숨결 ${useBreath ? 'ON' : 'OFF'}`}
                active={useBreath}
                color="blue"
                badge={hasPrices && isCheapest(useBook, true) && !useBreath ? '최적' : undefined}
                onClick={() => setUseBreath((b) => !b)}
              />
              {hasPrices && (
                <button
                  onClick={() => { setUseBook(cheapest.useBook); setUseBreath(cheapest.useBreath); }}
                  className="text-xs text-green-600 dark:text-green-400 underline underline-offset-2 hover:opacity-70"
                >
                  최적 세팅 (책 {cheapest.useBook ? 'ON' : 'OFF'} / 숨결 {cheapest.useBreath ? 'ON' : 'OFF'})
                </button>
              )}
              <div className="ml-auto inline-flex rounded-full border border-gray-200 dark:border-white/10 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setCostMode('average')}
                  className={`px-3 py-1.5 transition-colors ${
                    costMode === 'average'
                      ? 'bg-la-gold/20 text-la-gold-dark dark:text-la-gold'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  평균
                </button>
                <button
                  onClick={() => setCostMode('ceiling')}
                  className={`px-3 py-1.5 transition-colors ${
                    costMode === 'ceiling'
                      ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  장기백
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* ── 상급 재련 설정 ── */}
        {hasAnyAdvSlotAvailable && (() => {
          const hasEnhancedStage = activeAdvSlots.some((s) => (advTargetMap[s] ?? 0) > 20);
          const rows: { label: string; opt: AdvTurnOption; set: (v: AdvTurnOption) => void; optimal: AdvTurnOption }[] = [
            { label: '일반턴',  opt: advNormalOpt,   set: setAdvNormalOpt,   optimal: cheapestAdv.normalOpt   },
            { label: '선조턴',  opt: advAncestorOpt, set: setAdvAncestorOpt, optimal: cheapestAdv.ancestorOpt },
            ...(hasEnhancedStage
              ? [{ label: '강화선조', opt: advEnhancedOpt, set: setAdvEnhancedOpt, optimal: cheapestAdv.enhancedOpt }]
              : []),
          ];
          return (
            <GlassCard className="p-4">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">상급 재련 설정</h2>
              <div className="space-y-2">
                {rows.map(({ label, opt, set, optimal }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-14 shrink-0">{label}</span>
                    <div className="flex gap-1">
                      {ADV_TURN_OPTIONS.map((o) => (
                        <button
                          key={o}
                          onClick={() => set(o)}
                          className={`relative px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                            opt === o
                              ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40'
                              : 'bg-transparent text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10'
                          }`}
                        >
                          {ADV_TURN_OPTION_LABELS[o]}
                          {hasPrices && optimal === o && opt !== o && (
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-green-500 text-white rounded-full px-1 leading-4">최적</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {hasPrices && hasAdvResult && (
                <button
                  onClick={applyCheapestAdv}
                  className="mt-3 text-xs text-green-600 dark:text-green-400 underline underline-offset-2 hover:opacity-70"
                >
                  최적 세팅 적용 (일반{ADV_TURN_OPTION_LABELS[cheapestAdv.normalOpt]} / 선조{ADV_TURN_OPTION_LABELS[cheapestAdv.ancestorOpt]}{hasEnhancedStage ? ` / 강화선조${ADV_TURN_OPTION_LABELS[cheapestAdv.enhancedOpt]}` : ''})
                </button>
              )}
            </GlassCard>
          );
        })()}
    </>
  );
};

export default EnhancementSettingsSection;
