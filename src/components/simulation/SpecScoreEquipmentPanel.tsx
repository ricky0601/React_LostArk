import type { ReactElement } from 'react';
import type { EquipSlot } from '../../data/specScore/lopecCoefficients';
import type { EquipmentState } from '../../utils/equipmentState';
import type { EquipMod } from './specScoreSimulatorTypes';

interface SpecScoreEquipmentPanelProps {
  readonly visible: boolean;
  readonly equipment: Partial<Record<EquipSlot, EquipmentState>>;
  readonly equipmentMods: Partial<Record<EquipSlot, EquipMod>>;
  readonly equipmentCount: number;
  readonly changedCount: number;
  readonly summaryLabel: string;
  readonly onEquipmentChange: (slot: EquipSlot, patch: EquipMod) => void;
  readonly onApplyBulkEquipment: (patch: EquipMod) => void;
}

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '무기',
  helmet: '투구',
  shoulder: '어깨',
  armor: '상의',
  pants: '하의',
  gloves: '장갑',
};

const SLOT_ORDER: EquipSlot[] = ['weapon', 'helmet', 'shoulder', 'armor', 'pants', 'gloves'];
const TIER_OPTIONS = ['유물', '고대', '전율'];

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

export const SpecScoreEquipmentPanel = ({
  visible,
  equipment,
  equipmentMods,
  equipmentCount,
  changedCount,
  summaryLabel,
  onEquipmentChange,
  onApplyBulkEquipment,
}: SpecScoreEquipmentPanelProps): ReactElement | null => {
  if (!visible || equipmentCount <= 0) return null;

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            장비 ({equipmentCount}개)
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{summaryLabel}</p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {changedCount > 0 && <span className="spec-chip mr-1">변경 {changedCount}</span>}
          <span className="text-[10px] text-gray-400">일괄</span>
          <button
            type="button"
            onClick={() => onApplyBulkEquipment({ normalLevel: 25 })}
            className="spec-touch-control px-2 py-0.5 text-[11px] rounded border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-la-gold/50 hover:text-la-gold-dark dark:hover:text-la-gold"
          >
            +25 강화
          </button>
          <button
            type="button"
            onClick={() => onApplyBulkEquipment({ advancedLevel: 40 })}
            className="spec-touch-control px-2 py-0.5 text-[11px] rounded border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-la-gold/50 hover:text-la-gold-dark dark:hover:text-la-gold"
          >
            X40 상재
          </button>
          <button
            type="button"
            onClick={() => onApplyBulkEquipment({ tier: '전율' })}
            className="spec-touch-control px-2 py-0.5 text-[11px] rounded border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-la-gold/50 hover:text-la-gold-dark dark:hover:text-la-gold"
          >
            전율
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {SLOT_ORDER.map((slot) => {
          const cur = equipment[slot];
          if (!cur) return null;
          const m = equipmentMods[slot];
          const curNormal = m?.normalLevel ?? cur.normalLevel;
          const curAdvanced = cur.isInherited ? cur.advancedLevel : (m?.advancedLevel ?? cur.advancedLevel);
          const curTier = m?.tier ?? cur.tier;
          const advancedOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40];
          // 품질 추출 (tooltip JSON의 ItemTitle.qualityValue)
          const quality = extractQuality(cur.raw.Tooltip);
          return (
            <div
              key={slot}
              className="flex flex-col gap-2 border-b border-gray-100 py-2 dark:border-white/5 last:border-0 sm:flex-row sm:items-stretch"
            >
              {/* 좌측: 아이콘 + 품질 뱃지 */}
              <div className="relative w-14 flex-shrink-0">
                <img
                  src={cur.raw.Icon}
                  alt=""
                  className="w-14 h-14 rounded border border-gray-200 dark:border-white/10"
                />
                <span className="absolute top-0.5 left-0.5 text-[9px] font-bold text-white bg-black/70 rounded px-1 leading-tight">
                  {SLOT_LABEL[slot]}
                </span>
                {quality !== null && (
                  <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[9px] font-bold text-amber-300 bg-black/70 rounded text-center leading-tight">
                    품질 {quality}
                  </span>
                )}
              </div>
              {/* 우측: 2×2 grid selects */}
              <div className="grid flex-1 grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
                <select
                  value={curTier}
                  onChange={(ev) => onEquipmentChange(slot, { tier: ev.target.value })}
                  className="spec-touch-control bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5"
                >
                  {TIER_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      T4 {t}
                    </option>
                  ))}
                </select>
                <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 text-center text-gray-500">
                  품질 {quality ?? '-'}
                </div>
                <label className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5">
                  <span className="text-gray-400 text-[10px]">+</span>
                  <select
                    value={curNormal}
                    onChange={(ev) =>
                      onEquipmentChange(slot, { normalLevel: Number(ev.target.value) })
                    }
                    className="spec-touch-control flex-1 bg-transparent outline-none"
                  >
                    {Array.from({ length: 26 }, (_, i) => i).map((lv) => (
                      <option key={lv} value={lv}>
                        {lv}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className={`flex items-center gap-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 ${
                    cur.isInherited ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  title={cur.isInherited ? '세르카 계승 장비는 상급 재련 시뮬레이션을 지원하지 않습니다' : undefined}
                >
                  <span className="text-gray-400 text-[10px]">상재</span>
                  <select
                    value={curAdvanced}
                    disabled={cur.isInherited}
                    onChange={(ev) =>
                      onEquipmentChange(slot, { advancedLevel: Number(ev.target.value) })
                    }
                    className="spec-touch-control flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                  >
                    {advancedOptions.map((lv) => (
                      <option key={lv} value={lv}>
                        X{lv}
                      </option>
                    ))}
                  </select>
                  {cur.isInherited && (
                    <span className="text-[9px] text-amber-600 dark:text-amber-300 whitespace-nowrap">
                      계승 제외
                    </span>
                  )}
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
