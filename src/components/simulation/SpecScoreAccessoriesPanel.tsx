import type { ReactElement } from 'react';
import {
  ACCESSORY_SLOTS,
  BRACELET_OPTIONS,
  BRACELET_STAT_TYPES,
  POLISH_OPTIONS,
  findBraceletOption,
  findPolishOption,
  type AccessorySlot,
  type BraceletStatOption,
  type BraceletStatType,
  type PolishOption,
} from '../../data/specScore/polishOptions';
import type { AccessoryState, BraceletState } from '../../utils/polishState';
import { SpecSelect, type SpecSelectItem } from './SpecSelect';
import type { BraceletMod, PolishMod } from './specScoreSimulatorTypes';

interface SpecScoreAccessoriesPanelProps {
  readonly visible: boolean;
  readonly accessories: Partial<Record<AccessorySlot, AccessoryState>>;
  readonly bracelet: BraceletState | null;
  readonly polishMods: Partial<Record<AccessorySlot, PolishMod>>;
  readonly braceletMod: BraceletMod | undefined;
  readonly accessoryCount: number;
  readonly changedCount: number;
  readonly summaryLabel: string;
  readonly onPolishChange: (slot: AccessorySlot, optionIndex: 0 | 1 | 2, label: string) => void;
  readonly onBraceletChange: (optionIndex: 0 | 1 | 2 | 3, label: string) => void;
  readonly onBraceletStatChange: (statIndex: 0 | 1 | 2 | 3, patch: Partial<BraceletStatOption>) => void;
}

const ACCESSORY_OPTION_INDEXES = [0, 1, 2] as const;
const BRACELET_OPTION_INDEXES = [0, 1, 2, 3] as const;

const POLISH_SELECT_ITEMS: readonly SpecSelectItem<string>[] = POLISH_OPTIONS
  .filter((option) => !option.label.startsWith('__'))
  .flatMap((option, optionIndex, options): SpecSelectItem<string>[] => {
    const previous = options[optionIndex - 1];
    const optionItem = { value: option.label, label: option.label };
    if (optionIndex > 0 && previous?.type !== option.type) {
      return [
        { separator: true, key: `polish-${option.type}-${optionIndex}`, label: option.type },
        optionItem,
      ];
    }
    return [optionItem];
  });

const BRACELET_SELECT_ITEMS: readonly SpecSelectItem<string>[] = BRACELET_OPTIONS
  .flatMap((option, optionIndex): SpecSelectItem<string>[] => {
    const previous = BRACELET_OPTIONS[optionIndex - 1];
    const optionItem = { value: option.label, label: option.label };
    if (optionIndex > 1 && previous?.type !== option.type) {
      return [
        { separator: true, key: `bracelet-${option.type}-${optionIndex}`, label: option.type },
        optionItem,
      ];
    }
    return [optionItem];
  });

const isBraceletStatType = (value: string): value is BraceletStatType =>
  BRACELET_STAT_TYPES.some((type) => type === value);

const getPolishGradeColor = (grade: PolishOption['grade']): string => {
  if (grade === '상') return 'text-amber-400 bg-amber-500/15';
  if (grade === '중') return 'text-purple-400 bg-purple-500/15';
  return 'text-blue-400 bg-blue-500/15';
};

const extractQuality = (tooltip: string): number | null => {
  let quality: number | null = null;
  try {
    const tt = JSON.parse(tooltip);
    for (const k of Object.keys(tt)) {
      const el = tt[k];
      if (el?.type === 'ItemTitle' && typeof el.value?.qualityValue === 'number') {
        quality = el.value.qualityValue >= 0 ? el.value.qualityValue : null;
        break;
      }
    }
  } catch {
    // ignore
  }
  return quality;
};

export const SpecScoreAccessoriesPanel = ({
  visible,
  accessories,
  bracelet,
  polishMods,
  braceletMod,
  accessoryCount,
  changedCount,
  summaryLabel,
  onPolishChange,
  onBraceletChange,
  onBraceletStatChange,
}: SpecScoreAccessoriesPanelProps): ReactElement | null => {
  if (!visible || accessoryCount <= 0) return null;

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">악세사리</h3>
          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{summaryLabel}</p>
        </div>
        {changedCount > 0 && <span className="spec-chip">변경 {changedCount}</span>}
      </div>
      <div className="space-y-2">
        {ACCESSORY_SLOTS.map((slot) => {
          const cur = accessories[slot];
          if (!cur) return null;
          const m = polishMods[slot];
          const currentLabels = m?.polishOptions ?? [
            cur.polishOptions[0].label,
            cur.polishOptions[1].label,
            cur.polishOptions[2].label,
          ];
          // accessory 품질 추출 (tooltip ItemTitle.qualityValue)
          const quality = extractQuality(cur.raw.Tooltip);
          return (
            <div
              key={slot}
              className="flex flex-col gap-2 border-b border-gray-100 py-2 dark:border-white/5 last:border-0 sm:flex-row sm:items-stretch"
            >
              {/* 좌측: 아이콘 + 품질 % */}
              <div className="relative w-14 flex-shrink-0">
                <img
                  src={cur.raw.Icon}
                  alt=""
                  className="w-14 h-14 rounded border border-gray-200 dark:border-white/10"
                />
                {quality !== null && (
                  <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[9px] font-bold text-amber-300 bg-black/70 rounded text-center leading-tight">
                    {quality}.00%
                  </span>
                )}
              </div>
              {/* 우측: 3개 polish select (grade prefix) */}
              <div className="flex-1 grid grid-cols-1 gap-1 text-[11px]">
                {ACCESSORY_OPTION_INDEXES.map((idx) => {
                  const curOpt = findPolishOption(currentLabels[idx]) ?? cur.polishOptions[idx];
                  return (
                    <div key={idx} className="flex items-stretch gap-1">
                      <span
                        className={`flex items-center justify-center w-5 rounded text-[10px] font-bold flex-shrink-0 ${getPolishGradeColor(curOpt.grade)}`}
                      >
                        {curOpt.grade}
                      </span>
                      <SpecSelect
                        value={currentLabels[idx]}
                        onChange={(value) =>
                          onPolishChange(slot, idx, value)
                        }
                        items={POLISH_SELECT_ITEMS}
                        ariaLabel={`${slot} 연마 옵션 ${idx + 1}`}
                        className="min-w-0 flex-1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {/* 팔찌 — 인식된 옵션 편집 */}
        {(() => {
          if (!bracelet || (bracelet.effects.length === 0 && !bracelet.options.some((option) => option.label !== '없음'))) return null;
          const braceletStats = braceletMod?.stats ?? bracelet.stats;
          const defaultBraceletLabels: [string, string, string, string] = [
            bracelet.options[0].label,
            bracelet.options[1].label,
            bracelet.options[2].label,
            bracelet.options[3].label,
          ];
          const braceletLabels = braceletMod?.options ?? defaultBraceletLabels;
          return (
          <div className="flex flex-col gap-2 border-b border-gray-100 py-2 dark:border-white/5 last:border-0 sm:flex-row sm:items-stretch">
            <div className="relative w-14 flex-shrink-0">
              <img
                src={bracelet.raw.Icon}
                alt=""
                className="w-14 h-14 rounded border border-gray-200 dark:border-white/10"
              />
              <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[9px] font-bold text-amber-300 bg-black/70 rounded text-center leading-tight">
                팔찌
              </span>
            </div>
            <div className="flex-1 space-y-1 text-[10px] text-gray-600 dark:text-gray-400">
              <div className="grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
                {BRACELET_OPTION_INDEXES.map((idx) => {
                  const stat = braceletStats[idx];
                  return (
                  <div key={idx} className="flex items-stretch gap-1 rounded border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5">
                    <SpecSelect
                      value={stat.type}
                      onChange={(value) => {
                        if (isBraceletStatType(value)) {
                          onBraceletStatChange(idx, { type: value });
                        }
                      }}
                      items={BRACELET_STAT_TYPES.map((type) => ({ value: type, label: type }))}
                      ariaLabel="팔찌 수치 옵션 선택"
                      className="w-20 flex-shrink-0"
                      textAlign="center"
                    />
                    <input
                      type="number"
                      value={stat.value}
                      onChange={(ev) => onBraceletStatChange(idx, { value: Number(ev.target.value) })}
                      className="spec-touch-control min-w-0 flex-1 rounded-r bg-transparent px-1.5 py-0.5 text-right font-semibold text-blue-600 outline-none dark:text-blue-300"
                      title="팔찌 수치 입력"
                    />
                  </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 gap-1 text-[11px]">
                {BRACELET_OPTION_INDEXES.map((idx) => {
                  const label = braceletLabels[idx];
                  const opt = findBraceletOption(label) ?? bracelet.options[idx];
                  return (
                    <div key={idx} className="flex items-stretch gap-1">
                      <span className={`flex w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold ${getPolishGradeColor(opt.grade)}`}>
                        {opt.grade}
                      </span>
                      <SpecSelect
                        value={label}
                        onChange={(value) => onBraceletChange(idx, value)}
                        items={BRACELET_SELECT_ITEMS}
                        ariaLabel="팔찌 옵션 선택"
                        className="min-w-0 flex-1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
};
