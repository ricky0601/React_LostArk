import type { EquipmentItem } from '../types/lostark';
import {
  EQUIP_TYPE_TO_SLOT,
  extractEquipTier,
  type EquipSlot,
} from '../data/specScore/lopecCoefficients';

/** 시뮬레이션 가능한 슬롯의 현재 상태 */
export interface EquipmentState {
  slot: EquipSlot;
  /** 일반 강화 단계 (0~25) */
  normalLevel: number;
  /** 상급 재련 단계 (0~40) */
  advancedLevel: number;
  /** T4 등급 ("유물" | "고대" | "전율" | "에스더") */
  tier: string;
  /** 세르카 계승 장비 여부 — 상급 재련 시뮬레이션 불가 */
  isInherited: boolean;
  /** 원본 아이템 (UI 표시용) */
  raw: EquipmentItem;
}

const stripHtml = (s: string): string => s.replace(/<[^>]+>/g, '');

/** 이름에서 "+19 ..." 형태의 강화 레벨 추출 */
const parseNormalLevel = (name: string): number => {
  const m = name.match(/\+(\d{1,2})\s/);
  return m ? parseInt(m[1], 10) : 0;
};

/** Tooltip JSON에서 "[상급 재련] N단계" 형태의 상재 레벨 추출 */
const parseAdvancedLevel = (tooltipJson: string): number => {
  try {
    const obj = JSON.parse(tooltipJson);
    for (const key of Object.keys(obj)) {
      const el = obj[key];
      if (!el || typeof el !== 'object') continue;
      // SingleTextBox 타입의 텍스트에서 매칭
      if (el.type === 'SingleTextBox' && typeof el.value === 'string') {
        const text = stripHtml(el.value);
        const m = text.match(/\[상급\s*재련\]\s+(\d+)\s*단계/);
        if (m) return parseInt(m[1], 10);
      }
    }
  } catch {
    // ignore
  }
  return 0;
};

/** Enhancement 페이지와 동일한 tooltip heuristic으로 세르카/계승 장비 감지 */
const parseIsInherited = (tooltipJson: string): boolean => {
  try {
    const obj = JSON.parse(tooltipJson);
    return obj?.Element_001?.value?.slotData?.petBorder === 6;
  } catch {
    return false;
  }
};

/**
 * Lost Ark API EquipmentItem → 시뮬레이션용 EquipmentState
 * 무기/방어구 6슬롯만 반환, 장신구/스톤/팔찌는 null.
 */
export const parseEquipmentState = (item: EquipmentItem): EquipmentState | null => {
  const slot = EQUIP_TYPE_TO_SLOT[item.Type];
  if (!slot) return null;
  return {
    slot,
    normalLevel: parseNormalLevel(item.Name),
    advancedLevel: parseAdvancedLevel(item.Tooltip),
    tier: extractEquipTier(item.Grade),
    isInherited: parseIsInherited(item.Tooltip),
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
