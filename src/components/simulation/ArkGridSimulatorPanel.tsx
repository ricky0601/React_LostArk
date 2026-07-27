import type { Dispatch, ReactElement, SetStateAction } from 'react';
import type { ArkGridData } from '../../types/lostark';
import { gradeFrame } from '../../utils/equipmentColors';
import {
  ARK_GRID_CORE_GRADE_OPTIONS,
  ARK_GRID_SUMMARY_OPTIONS,
  getArkGridChaosOptionGroup,
  getArkGridGemEffects,
  getArkGridGemState,
  isChaosArkGridSlot,
  resolveArkGridChaosOptionName,
  type ArkGridCoreMod,
  type ArkGridGemEditTarget,
  type ArkGridGemMod,
} from './arkGridSimulatorState';
import { ArkGridGemEditorModal } from './ArkGridGemEditorModal';

interface ArkGridSimulatorPanelProps {
  rawArkGrid: ArkGridData | null;
  modifiedArkGrid: ArkGridData | null | undefined;
  arkGridMods: Record<number, ArkGridCoreMod>;
  editingArkGridGem: ArkGridGemEditTarget | null;
  arkGridGemDraft: Required<ArkGridGemMod> | null;
  setEditingArkGridGem: Dispatch<SetStateAction<ArkGridGemEditTarget | null>>;
  setArkGridGemDraft: Dispatch<SetStateAction<Required<ArkGridGemMod> | null>>;
  updateArkGridCore: (slotIndex: number, patch: ArkGridCoreMod) => void;
  updateArkGridGem: (
    target: ArkGridGemEditTarget,
    baseState: Required<ArkGridGemMod>,
    patch: ArkGridGemMod,
  ) => void;
}

export const ArkGridSimulatorPanel = ({
  rawArkGrid,
  modifiedArkGrid,
  arkGridMods,
  editingArkGridGem,
  arkGridGemDraft,
  setEditingArkGridGem,
  setArkGridGemDraft,
  updateArkGridCore,
  updateArkGridGem,
}: ArkGridSimulatorPanelProps): ReactElement => {
  const displayedArkGrid = modifiedArkGrid ?? rawArkGrid;
  const arkGridSlots = displayedArkGrid?.Slots ?? [];
  const arkGridEffects = displayedArkGrid?.Effects ?? [];
  const arkGridTotalPoint = arkGridSlots.reduce((total, slot) => total + slot.Point, 0);
  const originalArkGridEffectByName = new Map(
    (rawArkGrid?.Effects ?? []).map((effect) => [effect.Name.replace(/\s+/g, ''), effect]),
  );
  const arkGridEffectByName = new Map(
    arkGridEffects.map((effect) => [effect.Name.replace(/\s+/g, ''), effect]),
  );
  return (
    <div className="glass-card overflow-hidden p-5">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-200/40 pb-3 dark:border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">아크 그리드</h3>
        </div>
        <div className="rounded-xl border border-la-gold/20 bg-la-gold/10 px-3 py-2 text-right">
          <p className="text-[10px] text-la-gold-dark/70 dark:text-la-gold/70">총 포인트</p>
          <p className="text-lg font-bold leading-none tabular-nums text-la-gold-dark dark:text-la-gold">
            {arkGridTotalPoint}P
          </p>
        </div>
      </div>

      {arkGridSlots.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {arkGridSlots.map((slot) => {
              const coreMod = arkGridMods[slot.Index];
              const slotGems = slot.Gems ?? [];
              const displayGrade = coreMod?.grade ?? slot.Grade;
              const displayName = coreMod?.coreName ?? slot.Name;
              const isChaos = isChaosArkGridSlot(slot.Index);
              const chaosOptionGroup = isChaos ? getArkGridChaosOptionGroup(slot.Index) : undefined;
              const selectedChaosName = isChaos ? resolveArkGridChaosOptionName(slot.Index, displayName) : displayName;
              const coreFrame = gradeFrame(displayGrade, 'bg');
              return (
                <div
                  key={slot.Index}
                  className="rounded-xl border border-gray-200/70 bg-white/50 p-2.5 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2.5">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`h-16 w-16 overflow-hidden rounded-xl border shadow-inner ${coreFrame.className}`}
                        style={coreFrame.style}
                      >
                        <div className="relative h-full w-full overflow-hidden rounded-[10px] bg-gray-100 dark:bg-black/30">
                          {slot.Icon ? (
                            <img src={slot.Icon} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-gray-100 dark:bg-white/5" />
                          )}
                          <div className="pointer-events-none absolute inset-0 rounded-[10px] ring-1 ring-inset ring-white/30 dark:ring-white/10" />
                        </div>
                      </div>
                      <span className="min-w-12 rounded-full border border-la-gold/30 bg-black/75 px-2 py-0.5 text-center text-[11px] font-bold leading-tight text-la-gold shadow-sm">
                        {slot.Point}P
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <select
                        value={displayGrade}
                        onChange={(event) => updateArkGridCore(slot.Index, { grade: event.target.value })}
                        className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 text-[11px] font-medium text-gray-600 outline-none transition-colors hover:border-la-gold/50 focus:border-la-gold dark:border-white/10 dark:bg-black/20 dark:text-gray-300"
                        aria-label={`${slot.Name} 코어 등급`}
                      >
                        {ARK_GRID_CORE_GRADE_OPTIONS.map((grade) => (
                          <option key={grade} value={grade}>{grade} 코어</option>
                        ))}
                      </select>
                      {isChaos ? (
                        <select
                          value={selectedChaosName}
                          onChange={(event) => updateArkGridCore(slot.Index, { coreName: event.target.value })}
                          className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 text-[11px] font-semibold text-gray-700 outline-none transition-colors hover:border-la-gold/50 focus:border-la-gold dark:border-white/10 dark:bg-black/20 dark:text-gray-200"
                          aria-label={`${slot.Name} 혼돈 코어 선택`}
                        >
                          {chaosOptionGroup?.options.map((name) => (
                            <option key={`${chaosOptionGroup.group}-${name}`} value={name}>{name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex h-8 items-center rounded-lg border border-gray-200 bg-gray-50 px-2 text-[11px] font-semibold text-gray-500 dark:border-white/10 dark:bg-black/20 dark:text-gray-400">
                          질서 코어
                        </div>
                      )}
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                        {Array.from({ length: 4 }, (_, gemIndex) => {
                          const gem = slotGems[gemIndex];
                          const gemMod = coreMod?.gems?.[gem?.Index ?? gemIndex];
                          const gemEffects = gemMod?.effects ?? getArkGridGemEffects(gem);
                          const gemState = {
                            ...getArkGridGemState(gem),
                            ...gemMod,
                            effects: gemEffects,
                          };
                          const gemTitle = gemEffects
                            .map((effect) => `${effect.option} Lv.${effect.level}`)
                            .join(' / ');
                          return gem || gemMod ? (
                            <button
                              key={`${slot.Index}-gem-${gem?.Index ?? gemIndex}`}
                              type="button"
                              onClick={() => {
                                setEditingArkGridGem({ slotIndex: slot.Index, gemIndex: gem?.Index ?? gemIndex });
                                setArkGridGemDraft(gemState);
                              }}
                              className={`relative aspect-square overflow-hidden rounded-md border bg-gray-100 outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-la-gold dark:bg-black/30 ${
                                gem?.IsActive || gemMod
                                  ? 'border-la-gold/60 shadow-[0_0_10px_rgba(245,197,66,0.18)]'
                                  : 'border-gray-200 opacity-60 dark:border-white/10'
                              }`}
                              title={gemTitle || `${gem?.Grade ?? '시뮬'} #${gem?.Index ?? gemIndex}`}
                            >
                              {gem?.Icon ? (
                                <img src={gem.Icon} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-la-gold/10 text-[10px] font-bold text-la-gold-dark dark:bg-la-gold/15 dark:text-la-gold">
                                  SIM
                                </div>
                              )}
                            </button>
                          ) : (
                            <button
                              key={`${slot.Index}-empty-gem-${gemIndex}`}
                              type="button"
                              onClick={() => {
                                const emptyState = getArkGridGemState(undefined);
                                setEditingArkGridGem({ slotIndex: slot.Index, gemIndex });
                                setArkGridGemDraft(emptyState);
                              }}
                              className="flex aspect-square items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50/70 text-lg font-semibold text-gray-400 outline-none transition-colors hover:border-la-gold/60 hover:bg-la-gold/10 hover:text-la-gold-dark focus-visible:ring-2 focus-visible:ring-la-gold dark:border-white/10 dark:bg-black/20 dark:text-gray-500 dark:hover:border-la-gold/60 dark:hover:bg-la-gold/15 dark:hover:text-la-gold"
                              aria-label={`${slot.Name} 빈 젬 ${gemIndex + 1} 추가`}
                              title="아크 그리드 젬 추가"
                            >
                              +
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border border-gray-200/70 bg-white/45 p-3 dark:border-white/10 dark:bg-black/20">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {ARK_GRID_SUMMARY_OPTIONS.map((label) => {
                const effectKey = label.replace(/\s+/g, '');
                const effect = arkGridEffectByName.get(effectKey);
                const originalEffect = originalArkGridEffectByName.get(effectKey);
                const effectLevel = effect?.Level ?? 0;
                const effectDelta = effectLevel - (originalEffect?.Level ?? 0);
                return (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200/70 bg-gray-50 px-2 py-1.5 text-[11px] dark:border-white/10 dark:bg-white/5"
                    title={effect?.Tooltip ?? label}
                  >
                    <span className="truncate font-medium text-gray-700 dark:text-gray-300">{label}</span>
                    <span className="flex shrink-0 items-center gap-1 font-bold text-la-gold-dark dark:text-la-gold">
                      <span>{`Lv.${effectLevel}`}</span>
                      {effectDelta !== 0 && (
                        <span className={effectDelta > 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
                          {effectDelta > 0 ? '+' : ''}{effectDelta}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <ArkGridGemEditorModal
            arkGridSlots={arkGridSlots}
            arkGridMods={arkGridMods}
            editingArkGridGem={editingArkGridGem}
            arkGridGemDraft={arkGridGemDraft}
            setEditingArkGridGem={setEditingArkGridGem}
            setArkGridGemDraft={setArkGridGemDraft}
            updateArkGridGem={updateArkGridGem}
          />
        </>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">아크 그리드 정보 없음</p>
      )}
      <div className="mt-3 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
        영웅~고대 코어와 딜러 젬 옵션(공격력·추가 피해·보스 피해) 실측 계수만 전투력에 반영됩니다. 무기 코어와 미확정 옵션은 반영하지 않습니다.
      </div>
    </div>
  );
};
