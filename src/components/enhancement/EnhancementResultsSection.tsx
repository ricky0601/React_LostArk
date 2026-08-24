import React from 'react';
import GlassCard from '../GlassCard';
import { formatGold, formatSilver } from './enhancementModel';
import type { EnhancementPageModel } from './useEnhancementPage';

const EnhancementResultsSection: React.FC<{ model: EnhancementPageModel }> = ({ model }) => {
  const {
    advLevelMap,
    advTargetMap,
    targetMap,
    priceLoading,
    slotCurrentLevel,
    activeSlots,
    perSlotStepData,
    slotTotals,
    totals,
    activeAdvSlots,
    advSlotData,
    advTotals,
    shortfallMatGold,
    normalShortfallMatGold,
    hasPrices,
    hasResult,
    hasAdvResult,
    hasAnyResult,
    hasOwnedInput,
  } = model;
  return (
    <>
        {hasAnyResult && (
          <>
            {/* ── 합산 견적 ── */}
            <GlassCard className="p-4 border border-la-gold/20">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
                강화 견적 합계{hasOwnedInput && hasPrices && <span className="ml-1 font-normal text-orange-500 dark:text-orange-400">(추가 구매 기준)</span>}
              </h2>
              <div className={`grid gap-4 ${hasResult && hasAdvResult ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {hasResult && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">일반 재련</p>
                    <p className="text-lg font-bold text-la-gold-dark dark:text-la-gold">
                      {hasPrices
                        ? formatGold(totals.directGold + (hasOwnedInput ? normalShortfallMatGold : totals.matGold))
                        : formatGold(totals.directGold)}
                    </p>
                  </div>
                )}
                {hasAdvResult && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">상급 재련</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {hasPrices
                        ? formatGold(advTotals.totalDirectGold + (hasOwnedInput ? shortfallMatGold - normalShortfallMatGold : advTotals.totalMatGold))
                        : formatGold(advTotals.totalDirectGold)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{hasResult && hasAdvResult ? '총합' : '합계'}</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {hasPrices
                      ? formatGold(totals.directGold + advTotals.totalDirectGold + (hasOwnedInput ? shortfallMatGold : totals.matGold + advTotals.totalMatGold))
                      : formatGold(totals.directGold + advTotals.totalDirectGold)}
                  </p>
                  {totals.silver > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      실링 {formatSilver(totals.silver)}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* ── 일반 재련 섹션 ── */}
            {hasResult && (
              <>
            {/* ── 슬롯별 소계 (2개 이상 선택 시) ── */}
            {activeSlots.length >= 2 && (
              <GlassCard className="p-4">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
                  슬롯별 예상 비용
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200/40 dark:border-white/8">
                      <th className="text-left py-2 text-xs font-medium text-gray-400">슬롯</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-400">구간</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-400">기대 시도</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-400">총 비용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSlots.map((slot) => {
                      const t = slotTotals.get(slot);
                      const fromLvl = slotCurrentLevel[slot];
                      if (!t) return null;
                      return (
                        <tr key={slot} className="border-b border-gray-100/30 dark:border-white/5 last:border-0">
                          <td className="py-2 font-medium text-gray-900 dark:text-white">{slot}</td>
                          <td className="py-2 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                            {fromLvl}→{targetMap[slot]}강
                          </td>
                          <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                            {t.exp.toFixed(1)}트
                          </td>
                          <td className="py-2 text-right tabular-nums font-semibold text-la-gold-dark dark:text-la-gold">
                            {hasPrices ? formatGold(t.totalGold) : formatGold(t.directGold)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* 합계 행 */}
                    <tr className="border-t border-gray-200/60 dark:border-white/10 bg-gray-100/80 dark:bg-white/[0.04]">
                      <td colSpan={3} className="py-2 font-semibold text-gray-700 dark:text-gray-300">합계</td>
                      <td className="py-2 text-right tabular-nums font-bold text-la-gold-dark dark:text-la-gold">
                        {hasPrices ? formatGold(totals.totalGold) : formatGold(totals.directGold)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </GlassCard>
            )}

            {/* ── 예상 총 비용 요약 ── */}
            <GlassCard className="p-4">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
                예상 총 비용{activeSlots.length >= 2 ? ' (전체)' : ''}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">총 기대 시도</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {totals.exp.toFixed(1)}
                    <span className="text-sm font-normal text-gray-400 ml-0.5">트</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">직접 골드</p>
                  <p className="text-xl font-bold text-la-gold-dark dark:text-la-gold">
                    {formatGold(totals.directGold)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">
                    {hasOwnedInput ? '추가 재료비' : '재료 비용'}
                  </p>
                  <p className="text-xl font-bold text-la-gold-dark dark:text-la-gold">
                    {hasPrices ? formatGold(hasOwnedInput ? normalShortfallMatGold : totals.matGold) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">합계</p>
                  <p className="text-xl font-bold text-la-gold-dark dark:text-la-gold">
                    {hasPrices ? formatGold(totals.directGold + (hasOwnedInput ? normalShortfallMatGold : totals.matGold)) : '—'}
                  </p>
                  {totals.silver > 0 && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      실링 {formatSilver(Math.round(totals.silver))}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* ── 단계별 테이블 ── */}
            <GlassCard className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200/50 dark:border-white/8">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">단계</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">기대 시도</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">직접 골드</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">재료 비용</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">소계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSlots.map((slot) => {
                      const data = perSlotStepData.get(slot) ?? [];
                      return (
                        <React.Fragment key={slot}>
                          {activeSlots.length > 1 && (
                            <tr className="bg-gray-50/80 dark:bg-white/5">
                              <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {slot} · {slotCurrentLevel[slot]}→{targetMap[slot]}강
                              </td>
                            </tr>
                          )}
                          {data.map(({ step, exp, directGold, matGold, silver, totalGold }) => (
                            <tr
                              key={`${slot}-${step.from}`}
                              className="border-b border-gray-100/40 dark:border-white/5 last:border-0 hover:bg-gray-50/60 dark:hover:bg-white/3 transition-colors"
                            >
                              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                                {step.from}→{step.from + 1}강
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                {exp.toFixed(1)}트
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                <div>{formatGold(directGold)}</div>
                                {silver > 0 && (
                                  <div className="text-xs text-gray-400">{formatSilver(Math.round(silver))} 실링</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                {priceLoading ? <span className="text-gray-300 dark:text-gray-600 animate-pulse">—</span> : formatGold(matGold)}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums font-semibold text-la-gold-dark dark:text-la-gold">
                                {priceLoading ? <span className="text-gray-300 dark:text-gray-600 animate-pulse">—</span> : formatGold(totalGold)}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
              </>
            )}

            {/* ── 상급 재련 섹션 ── */}
            {hasAdvResult && (
              <>
                <GlassCard className="p-4">
                  <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
                    상급 재련 예상 비용
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">총 기대 시도</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {advTotals.totalAttempts.toFixed(1)}
                        <span className="text-sm font-normal text-gray-400 ml-0.5">회</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">직접 골드</p>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {formatGold(advTotals.totalDirectGold)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">재료 비용</p>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {hasPrices ? formatGold(advTotals.totalMatGold) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">합계</p>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {hasPrices ? formatGold(advTotals.totalGold) : '—'}
                      </p>
                    </div>
                  </div>
                  {activeAdvSlots.length >= 2 && (
                    <table className="w-full text-sm mt-2 border-t border-gray-200/40 dark:border-white/8 pt-2">
                      <thead>
                        <tr className="border-b border-gray-200/40 dark:border-white/8">
                          <th className="text-left py-2 text-xs font-medium text-gray-400">슬롯</th>
                          <th className="text-right py-2 text-xs font-medium text-gray-400">구간</th>
                          <th className="text-right py-2 text-xs font-medium text-gray-400">기대 시도</th>
                          <th className="text-right py-2 text-xs font-medium text-gray-400">총 비용</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeAdvSlots.map((slot) => {
                          const d = advSlotData.get(slot);
                          if (!d) return null;
                          return (
                            <tr key={slot} className="border-b border-gray-100/30 dark:border-white/5 last:border-0">
                              <td className="py-2 font-medium text-gray-900 dark:text-white">{slot}</td>
                              <td className="py-2 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                                {advLevelMap[slot] ?? 0}→{advTargetMap[slot]}단계
                              </td>
                              <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                {d.totalAttempts.toFixed(1)}회
                              </td>
                              <td className="py-2 text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400">
                                {hasPrices ? formatGold(d.totalGold) : formatGold(d.totalDirectGold)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </GlassCard>
              </>
            )}
          </>
        )}
    </>
  );
};

export default EnhancementResultsSection;
