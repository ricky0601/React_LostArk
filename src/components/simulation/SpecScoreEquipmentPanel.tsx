import type { ReactElement } from 'react';
import { ARMLET_POWER_BY_LEVEL, ARMLET_SELECT_LEVELS, ARMLET_UNEQUIPPED_LEVEL, resolveArmletLevel, type EquipSlot } from '../../data/specScore/lopecCoefficients';
import type { EquipmentState, EquipmentTier } from '../../utils/equipmentState';
import { gradeFrame } from '../../utils/equipmentColors';
import { SpecSelect } from './SpecSelect';
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
  armlet: '완갑',
};

const SLOT_ORDER: EquipSlot[] = ['weapon', 'armlet', 'helmet', 'shoulder', 'armor', 'pants', 'gloves'];
const TIER_OPTIONS = ['유물', '업화', '전율'] as const;
const TIER_LABELS: Record<(typeof TIER_OPTIONS)[number], string> = {
  유물: '유물',
  업화: '에기르',
  전율: '세르카',
};

const normalizeEditableTier = (tier: EquipmentState['tier']): EquipmentTier => {
  if (tier === '유물' || tier === '업화' || tier === '전율') return tier;
  return '업화';
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
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
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

  const nonArmletTiers = SLOT_ORDER.flatMap((slot) => {
    if (slot === 'armlet') return [];
    const currentEquipment = equipment[slot];
    return currentEquipment
      ? [normalizeEditableTier(equipmentMods[slot]?.tier ?? currentEquipment.tier)]
      : [];
  });
  const allNonArmletEquipmentIsAegir =
    nonArmletTiers.length > 0 && nonArmletTiers.every((tier) => tier === '업화');

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
            onClick={() =>
              onApplyBulkEquipment({ tier: allNonArmletEquipmentIsAegir ? '전율' : '업화' })
            }
            className="spec-touch-control px-2 py-0.5 text-[11px] rounded border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-la-gold/50 hover:text-la-gold-dark dark:hover:text-la-gold"
          >
            {allNonArmletEquipmentIsAegir ? '세르카' : '에기르'}
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
          const curTier = normalizeEditableTier(m?.tier ?? cur.tier);
          const advancedOptions = Array.from({ length: 41 }, (_, level) => level);
          const quality = extractQuality(cur.raw.Tooltip);
          if (slot === 'armlet') {
            const armletLevel = resolveArmletLevel(curNormal);
            const armletPower = armletLevel === null ? null : ARMLET_POWER_BY_LEVEL[armletLevel];
            const armletIsUnequipped = curNormal === ARMLET_UNEQUIPPED_LEVEL;
            // 등급/아이콘 출처는 API가 권위다. 값이 실제로 달라진 경우에만 계수 테이블로 넘어간다.
            const armletIsModified = curNormal !== cur.normalLevel;
            const armletGrade = armletIsUnequipped
              ? ARMLET_POWER_BY_LEVEL[ARMLET_UNEQUIPPED_LEVEL].grade
              : armletIsModified && armletPower !== null
                ? armletPower.grade
                : cur.raw.Grade;
            const armletIcon = armletIsUnequipped
              ? ARMLET_POWER_BY_LEVEL[ARMLET_UNEQUIPPED_LEVEL].icon
              : armletIsModified && armletPower !== null
                ? armletPower.icon
                : cur.raw.Icon;
            const armletFrame = gradeFrame(armletGrade, 'bg');
            return (
              <div
                key={slot}
                className="flex flex-col gap-2 border-b border-gray-100 py-2 dark:border-white/5 last:border-0 sm:flex-row sm:items-stretch"
              >
                <div className="relative w-14 flex-shrink-0">
                  <div
                    className={`h-14 w-14 overflow-hidden rounded border ${armletFrame.className}`}
                    style={armletFrame.style}
                  >
                    <img
                      src={armletIcon}
                      alt=""
                      className={`h-full w-full object-contain ${armletIsUnequipped ? 'opacity-45 grayscale' : ''}`}
                    />
                  </div>
                  <span className="absolute top-0.5 left-0.5 rounded bg-black/70 px-1 text-[9px] font-bold leading-tight text-white">
                    완갑
                  </span>
                  <span className="absolute bottom-0.5 left-0.5 right-0.5 rounded bg-black/70 text-center text-[9px] font-bold leading-tight text-amber-300">
                    {armletGrade}
                  </span>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
                  <div className="flex min-w-0 items-center gap-1">
                    <SpecSelect
                      value={curNormal}
                      onChange={(value) => onEquipmentChange(slot, { normalLevel: Number(value) })}
                      items={ARMLET_SELECT_LEVELS.map((level) => ({
                        value: level,
                        label: level === ARMLET_UNEQUIPPED_LEVEL ? '미착용' : String(level),
                      }))}
                      ariaLabel={`완갑 레벨 ${armletIsUnequipped ? '미착용' : curNormal}`}
                      className="w-20 flex-shrink-0"
                    />
                  </div>
                </div>
              </div>
            );
          }
          const frame = gradeFrame(cur.raw.Grade, 'bg');
          return (
            <div
              key={slot}
              className="flex flex-col gap-2 border-b border-gray-100 py-2 dark:border-white/5 last:border-0 sm:flex-row sm:items-stretch"
            >
              <div className="relative w-14 flex-shrink-0">
                <div className={`h-14 w-14 overflow-hidden rounded border ${frame.className}`} style={frame.style}>
                  <img src={cur.raw.Icon} alt="" className="h-full w-full object-contain" />
                </div>
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
              <div className="grid flex-1 grid-cols-1 gap-0.5 text-[11px] sm:grid-cols-2">
                <SpecSelect
                  value={curTier}
                  onChange={(value) => onEquipmentChange(slot, { tier: value })}
                  items={TIER_OPTIONS.map((tier) => ({ value: tier, label: TIER_LABELS[tier] }))}
                  ariaLabel={`${SLOT_LABEL[slot]} 티어`}
                  className="w-20 flex-shrink-0"
                />
                <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 text-center text-gray-500">
                  품질 {quality ?? '-'}
                </div>
                <div className="flex min-w-0 items-center gap-1">
                  <SpecSelect
                    value={curNormal}
                    onChange={(value) =>
                      onEquipmentChange(slot, { normalLevel: Number(value) })
                    }
                    items={Array.from({ length: 26 }, (_, i) => 25 - i).map((level) => ({
                      value: level,
                      label: String(level),
                    }))}
                    ariaLabel={`${SLOT_LABEL[slot]} 일반 재련 레벨`}
                    className="w-20 flex-shrink-0"
                  />
                </div>
                <div
                  className={`flex min-w-0 items-center gap-1 ${
                    cur.isInherited ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  title={cur.isInherited ? '세르카 계승 장비는 상급 재련 시뮬레이션을 지원하지 않습니다' : undefined}
                >
                  <span className="text-gray-400 text-[10px]">상재</span>
                  <SpecSelect
                    value={curAdvanced}
                    disabled={cur.isInherited}
                    onChange={(value) =>
                      onEquipmentChange(slot, { advancedLevel: Number(value) })
                    }
                    items={advancedOptions.map((level) => ({ value: level, label: `X${level}` }))}
                    ariaLabel={`${SLOT_LABEL[slot]} 상급 재련 레벨`}
                    className="w-20 flex-shrink-0"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
