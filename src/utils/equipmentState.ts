import type { EquipmentItem } from '../types/lostark';
import type { ArmorStatDeltaByLevel, StatDelta } from '../data/specScore/equipmentPowerTables';
import {
  EGIR_ARMOR_STAT_DELTA_BY_SLOT,
  EGIR_WEAPON_ATTACK_DELTA_BY_LEVEL,
  SERKA_ARMOR_STAT_DELTA_BY_SLOT,
  SERKA_WEAPON_ATTACK_DELTA_BY_LEVEL,
  ARMLET_POWER_BY_LEVEL,
  ARMLET_UNEQUIPPED_LEVEL,
  resolveArmletPower,
} from '../data/specScore/equipmentPowerTables';
import {
  EQUIP_TYPE_TO_SLOT,
  extractEquipTier,
  type EquipSlot,
} from '../data/specScore/lopecCoefficients';

export type EquipmentFamily = 'egir' | 'serka';
export type EquipmentTier = '유물' | '업화' | '전율';

export type EquipmentNormalHoningDelta =
  | { readonly kind: 'weapon'; readonly weaponAttack: number }
  | { readonly kind: 'armor'; readonly stats: StatDelta }
  | { readonly kind: 'armlet'; readonly weaponAttack: number; readonly mainStat: number; readonly baseAttack: number; readonly baseAttackPercent: number };

/** 시뮬레이션 가능한 슬롯의 현재 상태 */
export interface EquipmentState {
  slot: EquipSlot;
  /** 일반 강화 단계 (0~25) */
  normalLevel: number;
  /** 상급 재련 단계 (0~40) */
  advancedLevel: number;
  /** 시뮬레이션 장비 티어: 유물, 업화(에기르), 전율(세르카) */
  tier: EquipmentTier | string;
  /** 일반 재련 표 계열: 에기르 또는 세르카 계승 */
  equipmentFamily: EquipmentFamily;
  /** 현재 일반 강화 단계가 tooltip/API stat에 더한 원시 증가량 */
  normalHoningDelta?: EquipmentNormalHoningDelta;
  /** 세르카 계승 장비 여부 — 상급 재련 시뮬레이션 불가 */
  isInherited: boolean;
  /** 원본 아이템 (UI 표시용) */
  raw: EquipmentItem;
}

const stripHtml = (s: string): string => s.replace(/<[^>]+>/g, '');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseTooltipObject = (tooltipJson: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(tooltipJson);
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

/** 이름에서 "+19 ..." 형태의 강화 레벨 추출 */
const parseNormalLevel = (name: string): number => {
  const m = name.match(/\+(\d{1,2})\s/);
  return m ? parseInt(m[1], 10) : 0;
};

/** Tooltip JSON에서 "[상급 재련] N단계" 형태의 상재 레벨 추출 */
const parseAdvancedLevel = (tooltipJson: string): number => {
  const obj = parseTooltipObject(tooltipJson);
  if (!obj) return 0;

  for (const key of Object.keys(obj)) {
    const el = obj[key];
    if (!isRecord(el)) continue;
    // SingleTextBox 타입의 텍스트에서 매칭
    const value = el.value;
    if (el.type === 'SingleTextBox' && typeof value === 'string') {
      const text = stripHtml(value);
      const m = text.match(/\[상급\s*재련\]\s+(\d+)\s*단계/);
      if (m) return parseInt(m[1], 10);
    }
  }
  return 0;
};

/** Enhancement 페이지와 동일한 tooltip heuristic으로 세르카/계승 장비 감지 */
const parseIsInherited = (tooltipJson: string): boolean => {
  const obj = parseTooltipObject(tooltipJson);
  const element = obj?.Element_001;
  if (!isRecord(element)) return false;
  const value = element.value;
  if (!isRecord(value)) return false;
  const slotData = value.slotData;
  return isRecord(slotData) && slotData.petBorder === 6;
};

const parseEquipmentTier = (item: EquipmentItem): EquipmentTier | string => {
  if (item.Name.includes('운명의 업화')) return '업화';
  if (item.Name.includes('운명의 전율')) return '전율';
  const gradeTier = extractEquipTier(item.Grade);
  return gradeTier === '고대' ? '업화' : gradeTier;
};

export const resolveNormalHoningDelta = (
  slot: EquipSlot,
  family: EquipmentFamily,
  normalLevel: number,
  grade?: string,
): EquipmentNormalHoningDelta | undefined => {
  if (slot === 'armlet') {
    const power = resolveArmletPower({ normalLevel, grade });
    if (power === null) return undefined;
    return {
      kind: 'armlet',
      weaponAttack: power.weaponAttack,
      mainStat: power.mainStat,
      baseAttack: power.baseAttack,
      baseAttackPercent: power.baseAttackPercent,
    };
  }
  if (normalLevel <= 0) return undefined;
  if (slot === 'weapon') {
    const table = family === 'serka'
      ? SERKA_WEAPON_ATTACK_DELTA_BY_LEVEL
      : EGIR_WEAPON_ATTACK_DELTA_BY_LEVEL;
    const weaponAttack = table[normalLevel];
    return weaponAttack === undefined ? undefined : { kind: 'weapon', weaponAttack };
  }

  const table: ArmorStatDeltaByLevel = family === 'serka'
    ? SERKA_ARMOR_STAT_DELTA_BY_SLOT
    : EGIR_ARMOR_STAT_DELTA_BY_SLOT;
  const stats = table[slot]?.[normalLevel];
  return stats === undefined ? undefined : { kind: 'armor', stats };
};

/**
 * Lost Ark API EquipmentItem → 시뮬레이션용 EquipmentState
 * 무기/방어구 6슬롯만 반환, 장신구/스톤/팔찌는 null.
 */
export const parseEquipmentState = (item: EquipmentItem): EquipmentState | null => {
  const slot = EQUIP_TYPE_TO_SLOT[item.Type];
  if (!slot) return null;
  const parsedNormalLevel = parseNormalLevel(item.Name);
  const tier = parseEquipmentTier(item);
  const equipmentFamily: EquipmentFamily = tier === '전율' ? 'serka' : 'egir';
  const isInherited = equipmentFamily === 'serka' && parseIsInherited(item.Tooltip);

  if (slot === 'armlet') {
    const normalLevel = parsedNormalLevel;
    const normalHoningDelta = resolveNormalHoningDelta(slot, equipmentFamily, normalLevel, item.Grade);
    return {
      slot,
      normalLevel,
      advancedLevel: 0,
      tier: normalLevel === ARMLET_UNEQUIPPED_LEVEL ? ARMLET_POWER_BY_LEVEL[ARMLET_UNEQUIPPED_LEVEL].grade : item.Grade,
      equipmentFamily,
      normalHoningDelta,
      isInherited,
      raw: item,
    };
  }

  const normalLevel = parsedNormalLevel;
  const advancedLevel = parseAdvancedLevel(item.Tooltip);
  const normalHoningDelta = resolveNormalHoningDelta(slot, equipmentFamily, normalLevel);
  return {
    slot,
    normalLevel,
    advancedLevel,
    tier,
    equipmentFamily,
    normalHoningDelta,
    isInherited,
    raw: item,
  };
};

export const createEmptyArmletState = (): EquipmentState => ({
  slot: 'armlet',
  normalLevel: ARMLET_UNEQUIPPED_LEVEL,
  advancedLevel: 0,
  tier: ARMLET_POWER_BY_LEVEL[ARMLET_UNEQUIPPED_LEVEL].grade,
  equipmentFamily: 'egir',
  normalHoningDelta: resolveNormalHoningDelta('armlet', 'egir', ARMLET_UNEQUIPPED_LEVEL),
  isInherited: false,
  raw: {
    Type: '완갑',
    Name: '완갑 미착용',
    Icon: ARMLET_POWER_BY_LEVEL[ARMLET_UNEQUIPPED_LEVEL].icon,
    Grade: ARMLET_POWER_BY_LEVEL[ARMLET_UNEQUIPPED_LEVEL].grade,
    Tooltip: '{}',
  },
});

/** 전체 장비 목록을 슬롯별 state로 변환 */
export const parseEquipmentList = (items: EquipmentItem[]): Partial<Record<EquipSlot, EquipmentState>> => {
  const result: Partial<Record<EquipSlot, EquipmentState>> = {};
  for (const item of items) {
    const state = parseEquipmentState(item);
    if (state) result[state.slot] = state;
  }
  if (!result.armlet) result.armlet = createEmptyArmletState();
  return result;
};
