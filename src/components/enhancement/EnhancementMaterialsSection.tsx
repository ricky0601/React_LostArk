import React from 'react';
import GlassCard from '../GlassCard';
import StateFeedback from '../StateFeedback';
import { formatGold, MARKET_SEARCH } from './enhancementModel';
import type { EnhancementPageModel } from './useEnhancementPage';

const EnhancementMaterialsSection: React.FC<{ model: EnhancementPageModel }> = ({ model }) => {
  const {
    charInput,
    setCharInput,
    charInputRef,
    armorMap,
    weaponLevel,
    slotIconMap,
    slotInheritedMap,
    advLevelMap,
    advTargetMap,
    setAdvTargetMap,
    charItemLevel,
    charLoading,
    charError,
    targetMap,
    setTargetMap,
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
    prices,
    icons,
    priceLoading,
    priceError,
    loadPrices,
    ownedMaterials,
    setOwnedMaterials,
    showOwnedSection,
    setShowOwnedSection,
    slotCurrentLevel,
    slotHasData,
    activeSlots,
    cheapest,
    handleSearch,
    handleResetCharSearch,
    handleTargetChange,
    perSlotStepData,
    slotTotals,
    totals,
    totalMaterials,
    allMaterials,
    activeAdvSlots,
    cheapestAdv,
    targetTotalItemLevel,
    advSlotData,
    advTotals,
    advTotalMaterials,
    shortfallData,
    shortfallMatGold,
    normalShortfallMatGold,
    handleAdvTargetChange,
    applyCheapestAdv,
    hasPrices,
    isCheapest,
    hasBookSteps,
    hasResult,
    hasAdvResult,
    hasAnyResult,
    hasOwnedInput,
    hasAnyAdvSlotAvailable,
  } = model;
  return (
    <>
        {/* ── 보유 재료 입력 ── */}
        {hasAnyResult && (
          <GlassCard className="p-4">
            <button
              onClick={() => setShowOwnedSection((v) => !v)}
              className="flex items-center justify-between w-full"
            >
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                보유 재료 입력
                <span className="ml-1.5 font-normal text-gray-400 dark:text-gray-500">(선택 사항)</span>
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {showOwnedSection ? '▲' : '▼'}
              </span>
            </button>
            {showOwnedSection && (
              <div className="mt-3 space-y-3 overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                  {Array.from(shortfallData.keys()).map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      {icons[type] && (
                        <img src={icons[type]} alt={type} className="w-6 h-6 rounded shrink-0" />
                      )}
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
                        {type}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={ownedMaterials[type] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                          setOwnedMaterials((prev) => {
                            const next = { ...prev };
                            if (val === undefined) delete next[type];
                            else next[type] = val;
                            return next;
                          });
                        }}
                        placeholder="0"
                        className="w-20 text-xs text-right bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded px-2 py-1 outline-none focus:ring-1 focus:ring-la-gold/40 shrink-0"
                      />
                    </div>
                  ))}
                </div>
                {hasOwnedInput && (
                  <button
                    onClick={() => setOwnedMaterials({})}
                    className="text-xs text-gray-400 hover:text-red-400 dark:hover:text-red-400 transition-colors underline underline-offset-2"
                  >
                    전체 초기화
                  </button>
                )}
              </div>
            )}
          </GlassCard>
        )}

        {/* ── 재료 시세 ── */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              재련 재료 시세
            </h2>
            {priceLoading && <span className="text-xs text-gray-400 animate-pulse">조회 중…</span>}
          </div>
          {priceError && (
            <StateFeedback
              tone="error"
              title="재료 시세 조회에 실패했습니다"
              description={`${priceError} 거래소 요청이 많거나 서버 응답이 지연될 수 있습니다.`}
              action={{ label: '시세 다시 조회', onClick: () => { void loadPrices(); } }}
              compact
              className="mb-3"
            />
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200/40 dark:border-white/8">
                  <th className="text-left py-2 text-xs font-medium text-gray-400">재료</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400">예상 수량</th>
                  {hasOwnedInput && (
                    <>
                      <th className="text-right py-2 text-xs font-medium text-gray-400">보유</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-400">부족</th>
                    </>
                  )}
                  <th className="text-right py-2 text-xs font-medium text-gray-400">단가</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400">
                    {hasOwnedInput ? '추가 구매비' : '재료비'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const combinedTypes = Array.from(
                    new Set([...Array.from(allMaterials.keys()), ...Array.from(advTotalMaterials.keys())])
                  );
                  if (combinedTypes.length === 0) {
                    return (
                      <tr>
                        <td colSpan={hasOwnedInput ? 6 : 4} className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                          장비를 선택하고 목표 강을 설정하면 재료가 표시됩니다
                        </td>
                      </tr>
                    );
                  }
                  return combinedTypes.map((type) => {
                    const normalQty = totalMaterials.get(type) ?? 0;
                    const advQty = advTotalMaterials.get(type) ?? 0;
                    const activeQty = normalQty + advQty;
                    const isActive = activeQty > 0;
                    const displayQty = isActive ? activeQty : (allMaterials.get(type) ?? 0);
                    const isUntradeable = MARKET_SEARCH[type]?.untradeable;
                    const price = prices[type];
                    const hasPrice = price !== undefined && price > 0;
                    const owned = ownedMaterials[type] ?? 0;
                    const shortfall = shortfallData.get(type)?.shortfall ?? activeQty;
                    const costQty = hasOwnedInput ? shortfall : displayQty;
                    const totalCost = isActive && hasPrice ? costQty * price : null;
                    const priceStr = isUntradeable
                      ? '거래불가'
                      : priceLoading
                        ? '…'
                        : hasPrice
                          ? `${price < 1 ? price.toFixed(2) : price < 10 ? price.toFixed(1) : Math.round(price).toLocaleString()}G`
                          : '—';
                    return (
                      <tr key={type} className={`border-b border-gray-100/30 dark:border-white/5 last:border-0 ${!isActive ? 'opacity-35' : ''}`}>
                        <td className="py-2 text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            {icons[type] && <img src={icons[type]} alt={type} className="w-7 h-7 rounded" />}
                            <span>{type}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                          {Math.ceil(displayQty).toLocaleString()}
                        </td>
                        {hasOwnedInput && (
                          <>
                            <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">
                              {isActive ? Math.min(owned, Math.ceil(activeQty)).toLocaleString() : '—'}
                            </td>
                            <td className="py-2 text-right tabular-nums text-orange-500 dark:text-orange-400">
                              {isActive ? Math.ceil(shortfall).toLocaleString() : '—'}
                            </td>
                          </>
                        )}
                        <td className="py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">
                          {priceStr}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium text-la-gold-dark dark:text-la-gold">
                          {priceLoading ? '…' : totalCost != null ? formatGold(totalCost) : '—'}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </GlassCard>
    </>
  );
};

export default EnhancementMaterialsSection;
