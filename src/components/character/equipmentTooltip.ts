import { type EffectSegment, stripHtml, htmlColorToGrade, parseBraceletLine } from '../../utils/tooltipParser';

export interface EquipmentEffect { grade: string | null; text: string; segments?: EffectSegment[] }

/* ── 장비 툴팁 파싱 (품질 + 강화레벨 + 초월 + 추가효과) ── */
export interface ParsedEquipmentInfo {
  quality: number | null;
  enchantLevel: number | null;
  transcendenceLevel: number | null;
  effects: EquipmentEffect[];
}

/** item.Name 에서 강화레벨 파싱 (+20 운명의... → 20) */
export function parseEnchantFromName(name: string): number | null {
  const m = name.match(/^\+(\d+)\s/);
  return m ? parseInt(m[1], 10) : null;
}

export function parseEquipmentInfo(itemName: string, tooltip: string): ParsedEquipmentInfo {
  const enchantLevel = parseEnchantFromName(itemName);
  try {
    const obj = JSON.parse(tooltip);
    let quality: number | null = null;
    let transcendenceLevel: number | null = null;
    const effects: EquipmentEffect[] = [];

    for (const key of Object.keys(obj)) {
      const el = obj[key];

      if (el?.type === 'ItemTitle') {
        const qv: number | undefined = el.value?.qualityValue;
        quality = (qv != null && qv >= 0) ? qv : null;
      }

      // 초월 단계: SingleTextBox 에 "[상급 재련] 40단계" 형식
      if (el?.type === 'SingleTextBox' && typeof el.value === 'string') {
        const text = stripHtml(el.value);
        const tm = text.match(/\[상급 재련\]\s+(\d+)단계/);
        if (tm) transcendenceLevel = parseInt(tm[1], 10);
      }

      if (el?.type === 'ItemPartBox' && el.value) {
        const headText = stripHtml(el.value.Element_000 || '');
        const contentHtml: string = el.value.Element_001 || '';
        // 연마 효과(장신구)만 등급 배지 표시, 팔찌/방어구 효과는 텍스트만
        const withGrade = headText.includes('연마 효과');
        const isBracelet = headText.includes('팔찌 효과');
        const isEffectSection = withGrade || isBracelet ||
          headText.includes('추가 효과');
        if (isEffectSection) {
          const lines = contentHtml.split(/<br\s*\/?>/gi);
          for (const line of lines) {
            const text = stripHtml(line).trim();
            if (!text) continue;
            if (isBracelet || withGrade) {
              effects.push({ grade: withGrade ? htmlColorToGrade(line) : null, text, segments: parseBraceletLine(line) });
            } else {
              effects.push({ grade: null, text });
            }
          }
        }
      }

      // 어빌리티 스톤 각인 효과 (IndentStringGroup)
      if (el?.type === 'IndentStringGroup' && el.value) {
        for (const vk of Object.keys(el.value)) {
          const group = el.value[vk];
          const topStr = stripHtml(group?.topStr || '');
          if (!topStr.includes('각인')) continue;
          const contentObj = group?.contentStr;
          if (!contentObj || typeof contentObj !== 'object') continue;
          for (const ck of Object.keys(contentObj)) {
            const entry = (contentObj as Record<string, { contentStr?: string }>)[ck];
            const raw = entry?.contentStr || '';
            const text = stripHtml(raw).trim();
            if (text) effects.push({ grade: null, text, segments: parseBraceletLine(raw) });
          }
        }
      }
    }
    return { quality, enchantLevel, transcendenceLevel, effects };
  } catch {
    return { quality: null, enchantLevel, transcendenceLevel: null, effects: [] };
  }
}
