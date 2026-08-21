import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import type { ArkGridSlot } from '../../types/lostark';
import {
  ARK_GRID_GEM_OPTIONS,
  ARK_GRID_GEM_SELECT_NUMBERS,
  getArkGridGemState,
  type ArkGridCoreMod,
  type ArkGridGemEditTarget,
  type ArkGridGemMod,
} from './arkGridSimulatorState';
import { SpecSelect } from './SpecSelect';

interface ArkGridGemEditorModalProps {
  arkGridSlots: readonly ArkGridSlot[];
  arkGridMods: Record<number, ArkGridCoreMod>;
  editingArkGridGem: ArkGridGemEditTarget | null;
  arkGridGemDraft: Required<ArkGridGemMod> | null;
  setEditingArkGridGem: Dispatch<SetStateAction<ArkGridGemEditTarget | null>>;
  setArkGridGemDraft: Dispatch<SetStateAction<Required<ArkGridGemMod> | null>>;
  updateArkGridGem: (
    target: ArkGridGemEditTarget,
    baseState: Required<ArkGridGemMod>,
    patch: ArkGridGemMod,
  ) => void;
}

export const ArkGridGemEditorModal = ({
  arkGridSlots,
  arkGridMods,
  editingArkGridGem,
  arkGridGemDraft,
  setEditingArkGridGem,
  setArkGridGemDraft,
  updateArkGridGem,
}: ArkGridGemEditorModalProps): ReactElement | null => {
  const editingArkGridSlot = editingArkGridGem
    ? arkGridSlots.find((slot) => slot.Index === editingArkGridGem.slotIndex)
    : undefined;
  const editingArkGridGemData = editingArkGridGem
    ? editingArkGridSlot?.Gems?.find((gem) => gem.Index === editingArkGridGem.gemIndex)
    : undefined;
  const editingArkGridGemApiState = getArkGridGemState(editingArkGridGemData);
  const editingArkGridGemMod = editingArkGridGem
    ? arkGridMods[editingArkGridGem.slotIndex]?.gems?.[editingArkGridGem.gemIndex]
    : undefined;
  const editingArkGridGemState: Required<ArkGridGemMod> = {
    willpower: editingArkGridGemMod?.willpower ?? editingArkGridGemApiState.willpower,
    corePoint: editingArkGridGemMod?.corePoint ?? editingArkGridGemApiState.corePoint,
    effects: editingArkGridGemMod?.effects ?? editingArkGridGemApiState.effects,
  };
  const displayedArkGridGemState = arkGridGemDraft ?? editingArkGridGemState;

  if (!editingArkGridGem || !editingArkGridSlot) return null;

  const closeEditor = (): void => {
    setEditingArkGridGem(null);
    setArkGridGemDraft(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-gray-900 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-xl border border-la-gold/40 bg-gray-100 shadow-inner dark:bg-black/30">
              {editingArkGridGemData?.Icon ? (
                <img src={editingArkGridGemData.Icon} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gray-100 dark:bg-white/5" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">젬 옵션 선택</p>
              <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                {editingArkGridGemData?.Grade ?? '아크 그리드'} 젬
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeEditor}
            className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
          >
            닫기
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="block text-[11px] font-medium text-gray-500 dark:text-gray-400">
            필요 의지력
            <SpecSelect
              value={displayedArkGridGemState.willpower}
              onChange={(value) => setArkGridGemDraft((prev) => ({
                ...(prev ?? editingArkGridGemState),
                willpower: Number(value),
              }))}
              items={ARK_GRID_GEM_SELECT_NUMBERS.map((value) => ({
                value,
                label: String(value),
              }))}
              ariaLabel="필요 의지력"
              className="mt-1"
              size="default"
            />
          </div>
          <div className="block text-[11px] font-medium text-gray-500 dark:text-gray-400">
            질서/혼돈 포인트
            <SpecSelect
              value={displayedArkGridGemState.corePoint}
              onChange={(value) => setArkGridGemDraft((prev) => ({
                ...(prev ?? editingArkGridGemState),
                corePoint: Number(value),
              }))}
              items={ARK_GRID_GEM_SELECT_NUMBERS.map((value) => ({
                value,
                label: String(value),
              }))}
              ariaLabel="질서/혼돈 포인트"
              className="mt-1"
              size="default"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {displayedArkGridGemState.effects.map((effect, effectIndex) => (
            <div
              key={`${editingArkGridGem.slotIndex}-${editingArkGridGem.gemIndex}-${effectIndex}`}
              className="rounded-xl border border-gray-200/70 bg-gray-50 p-2 dark:border-white/10 dark:bg-black/20"
            >
              <p className="mb-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                옵션 {effectIndex + 1}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_74px]">
                <SpecSelect
                  value={effect.option}
                  onChange={(value) => setArkGridGemDraft((prev) => {
                    const draft = prev ?? editingArkGridGemState;
                    return {
                      ...draft,
                      effects: draft.effects.map((row, index) =>
                        index === effectIndex ? { ...row, option: value } : row,
                      ),
                    };
                  })}
                  items={ARK_GRID_GEM_OPTIONS.map((option) => ({ value: option, label: option }))}
                  ariaLabel={`아크 그리드 젬 옵션 ${effectIndex + 1}`}
                  size="default"
                />
                <SpecSelect
                  value={effect.level}
                  onChange={(value) => setArkGridGemDraft((prev) => {
                    const draft = prev ?? editingArkGridGemState;
                    return {
                      ...draft,
                      effects: draft.effects.map((row, index) =>
                        index === effectIndex ? { ...row, level: Number(value) } : row,
                      ),
                    };
                  })}
                  items={ARK_GRID_GEM_SELECT_NUMBERS.map((value) => ({
                    value,
                    label: `Lv.${value}`,
                  }))}
                  ariaLabel={`아크 그리드 젬 옵션 ${effectIndex + 1} 레벨`}
                  size="default"
                  textAlign="center"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={closeEditor}
            className="min-h-10 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              updateArkGridGem(editingArkGridGem, editingArkGridGemState, displayedArkGridGemState);
              closeEditor();
            }}
            className="min-h-10 rounded-lg bg-la-gold px-3 py-1.5 text-xs font-bold text-gray-900 hover:bg-la-gold/90"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
