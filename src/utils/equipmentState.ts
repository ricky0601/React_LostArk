import type { EquipmentItem } from '../types/lostark';
import type { ArmorStatDeltaByLevel, StatDelta } from '../data/specScore/equipmentPowerTables';
import {
  EGIR_ARMOR_STAT_DELTA_BY_SLOT,
  EGIR_WEAPON_ATTACK_DELTA_BY_LEVEL,
  SERKA_ARMOR_STAT_DELTA_BY_SLOT,
  SERKA_WEAPON_ATTACK_DELTA_BY_LEVEL,
} from '../data/specScore/equipmentPowerTables';
import {
  EQUIP_TYPE_TO_SLOT,
  extractEquipTier,
  type EquipSlot,
} from '../data/specScore/lopecCoefficients';

export type EquipmentFamily = 'egir' | 'serka';

export type EquipmentNormalHoningDelta =
  | { readonly kind: 'weapon'; readonly weaponAttack: number }
  | { readonly kind: 'armor'; readonly stats: StatDelta };

/** 시뮬레이션 가능한 슬롯의 현재 상태 */
export interface EquipmentState {
  slot: EquipSlot;
  /** 일반 강화 단계 (0~25) */
  normalLevel: number;
  /** 상급 재련 단계 (0~40) */
  advancedLevel: number;
  /** T4 등급 ("유물" | "고대" | "전율" | "에스더") */
  tier: string;
  /** 일반 재련 표 계열: 에기르(업화) 또는 세르카(전율) */
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

export const resolveNormalHoningDelta = (
  slot: EquipSlot,
  family: EquipmentFamily,
  normalLevel: number,
): EquipmentNormalHoningDelta | undefined => {
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
  const normalLevel = parseNormalLevel(item.Name);
  const isInherited = parseIsInherited(item.Tooltip);
  const equipmentFamily: EquipmentFamily = isInherited ? 'serka' : 'egir';
  const advancedLevel = parseAdvancedLevel(item.Tooltip);
  const tier = extractEquipTier(item.Grade);
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

/** 전체 장비 목록을 슬롯별 state로 변환 */
export const parseEquipmentList = (items: EquipmentItem[]): Partial<Record<EquipSlot, EquipmentState>> => {
  const result: Partial<Record<EquipSlot, EquipmentState>> = {};
  for (const item of items) {
    const state = parseEquipmentState(item);
    if (state) result[state.slot] = state;
  }
  return result;
};
