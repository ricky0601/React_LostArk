import type { ArkGridData, CharacterProfile, EngravingData, EquipmentItem, GemData } from '../../types/lostark';
import { type EffectSegment, stripHtml, parseBraceletLine } from '../../utils/tooltipParser';
import { COMBAT_EQUIPMENT_TYPES } from '../../utils/characterEquipment';

export interface CompareData {
  profile: CharacterProfile;
  equipment: EquipmentItem[];
  gems: GemData | null;
  engravings: EngravingData | null;
  arkGrid: ArkGridData | null;
}

/* ================================================================
   Utilities
   ================================================================ */

export function parseQuality(tooltip: string): number {
  try {
    const obj = JSON.parse(tooltip);
    return obj?.Element_001?.value?.qualityValue ?? -1;
  } catch {
    return -1;
  }
}

export function parseItemLevel(str: string): number {
  return parseFloat(str.replace(/,/g, '')) || 0;
}

export function shortCoreName(fullName: string | null): string {
  if (!fullName) return '이름 없음';
  const m = fullName.match(/^(.+?)\s*코어/);
  return m ? m[1].trim() : fullName;
}

export interface DetailLine { text: string; segments?: EffectSegment[] }

/** 장비 슬롯 순서 */
export const ARMOR_SLOTS = COMBAT_EQUIPMENT_TYPES;
export const ACCESSORY_SLOTS = ['목걸이', '귀걸이', '귀걸이', '반지', '반지'];
export const EXTRA_SLOTS = ['어빌리티 스톤', '팔찌'];

/** 악세/스톤/팔찌 상세 정보 파싱 */
export const DETAIL_TYPES = new Set(['목걸이', '귀걸이', '반지', '어빌리티 스톤', '팔찌']);

export function parseEquipDetails(tooltip: string, type: string): DetailLine[] {
  try {
    const obj = JSON.parse(tooltip);
    const lines: DetailLine[] = [];

    for (const key of Object.keys(obj)) {
      const el = obj[key];
      if (!el) continue;

      if (el.type === 'ItemPartBox') {
        const label = stripHtml(el.value?.Element_000 || '');
        const contentHtml: string = el.value?.Element_001 || '';
        if (label.includes('기본 효과') || label.includes('세공 단계')) continue;
        if (!label || !contentHtml) continue;

        // 팔찌·악세사리 연마효과: 줄별로 분리해서 인라인 색상 세그먼트로 파싱
        const hasColoredLines =
          label.includes('팔찌 효과') ||
          label.includes('연마 효과') ||
          label.includes('추가 효과');
        if (hasColoredLines) {
          for (const rawLine of contentHtml.split(/<br\s*\/?>/gi)) {
            const text = stripHtml(rawLine).trim();
            if (text) lines.push({ text, segments: parseBraceletLine(rawLine) });
          }
        } else {
          lines.push({ text: stripHtml(contentHtml) });
        }
      }

      // 어빌리티 스톤 — 세공 각인 (IndentStringGroup)
      if (el.type === 'IndentStringGroup' && type === '어빌리티 스톤') {
        const group = el.value?.Element_000?.contentStr;
        if (group && typeof group === 'object') {
          for (const gKey of Object.keys(group)) {
            const item = (group as Record<string, { contentStr?: string }>)[gKey];
            if (item?.contentStr) {
              const raw = item.contentStr;
              lines.push({ text: stripHtml(raw), segments: parseBraceletLine(raw) });
            }
          }
        }
      }
    }

    return lines;
  } catch {
    return [];
  }
}

export function findEquipBySlots(items: EquipmentItem[], slots: readonly string[]): (EquipmentItem | null)[] {
  const remaining = [...items];
  return slots.map((slot) => {
    const idx = remaining.findIndex((i) => i.Type === slot);
    if (idx === -1) return null;
    return remaining.splice(idx, 1)[0];
  });
}
