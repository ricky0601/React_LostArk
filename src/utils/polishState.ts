import type { EquipmentItem } from '../types/lostark';
import {
  BRACELET_OPTIONS,
  EMPTY_BRACELET_STAT,
  POLISH_OPTIONS,
  findBraceletOption,
  findBraceletOptionByEffect,
  findPolishOption,
  type AccessorySlot,
  type BraceletOption,
  type BraceletStatOption,
  type BraceletStatType,
  type PolishOption,
} from '../data/specScore/polishOptions';

/** 한 장신구의 3개 polish 효과 + 등급 */
export interface AccessoryState {
  slot: AccessorySlot;
  grade: string; // 유물/고대 등
  polishOptions: [PolishOption, PolishOption, PolishOption];
  raw: EquipmentItem;
}

const stripHtml = (s: string): string =>
  s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const NO_OPTION = POLISH_OPTIONS[0]; // '없음'
const NO_BRACELET_OPTION = BRACELET_OPTIONS[0];

const parsePolishOptionLine = (line: string): PolishOption | null => {
  const clean = line.trim();
  if (!clean) return null;
  const m = clean.match(/^(.+?)\s*([+-]?\d+(?:\.\d+)?)(%?)\s*$/);
  if (!m) return null;

  const [, rawType, valStr, pctMark] = m;
  const value = parseFloat(valStr);
  const typeKey = rawType.trim();
  const label = pctMark
    ? `${typeKey} +${value.toFixed(value < 10 ? 2 : 1)}${value.toFixed(2).endsWith('00') ? '' : ''}%`
    : `${typeKey} +${value}`;
  const direct = findPolishOption(label);
  if (direct) return direct;

  const effectType = pctMark ? typeKey : `${typeKey}_abs`;
  return POLISH_OPTIONS.find((o) => o.type === effectType && Math.abs(o.value - value) < 0.01) ?? null;
};

const parseBraceletNumericText = (value: string): number => Number(value.replace(/,/g, ''));

const parseBraceletOptionLine = (line: string): BraceletOption | null => {
  const clean = line.trim();
  if (!clean) return null;

  const conditionalWeaponAttackSentence = clean.match(
    /^체력\s*이\s*50(?:\.0+)?\s*%\s*이상(?:\s*일\s*경우)?\s*무기\s*공격력\s*이\s*([\d,]+(?:\.\d+)?)\s*증가(?:한다)?\.?$/,
  );
  if (conditionalWeaponAttackSentence) {
    return findBraceletOptionByEffect(
      '체력 조건 무공 버프',
      parseBraceletNumericText(conditionalWeaponAttackSentence[1]),
    ) ?? null;
  }
  const baseWeaponAttackSentence = clean.match(
    /^무기\s*공격력\s*이\s*([\d,]+(?:\.\d+)?)\s*증가(?:한다)?\.?$/,
  );
  if (baseWeaponAttackSentence) {
    return findBraceletOptionByEffect(
      '무기 공격력',
      parseBraceletNumericText(baseWeaponAttackSentence[1]),
    ) ?? null;
  }

  const enemyDamageSentence = clean.match(/적에게\s*주는\s*피해(?:가)?\s*(\d+(?:\.\d+)?)%\s*증가/);
  if (enemyDamageSentence) {
    return findBraceletOptionByEffect('적에게 주는 피해', parseFloat(enemyDamageSentence[1])) ?? null;
  }
  const critRateSentence = clean.match(/치명타\s*적중률(?:이)?\s*(\d+(?:\.\d+)?)%\s*증가/);
  if (critRateSentence) {
    return findBraceletOptionByEffect('치명타 적중률', parseFloat(critRateSentence[1])) ?? null;
  }
  const critDamageSentence = clean.match(/치명타\s*피해(?:량|가)?\s*(\d+(?:\.\d+)?)%\s*증가/);
  if (critDamageSentence) {
    return findBraceletOptionByEffect('치명타 피해', parseFloat(critDamageSentence[1])) ?? null;
  }
  const additionalDamageSentence = clean.match(/추가\s*피해(?:가)?\s*(\d+(?:\.\d+)?)%\s*증가/);
  if (additionalDamageSentence) {
    return findBraceletOptionByEffect('추가 피해', parseFloat(additionalDamageSentence[1])) ?? null;
  }

  const m = clean.match(/^(.+?)\s*([+-]?\d+(?:\.\d+)?)(%?)\s*$/);
  if (!m) return null;

  const [, rawType, valStr, pctMark] = m;
  const value = parseFloat(valStr);
  const typeKey = rawType.trim();
  const label = pctMark
    ? `${typeKey} +${value.toFixed(value < 10 ? 2 : 1)}${value.toFixed(2).endsWith('00') ? '' : ''}%`
    : `${typeKey} +${value}`;
  return findBraceletOption(label) ?? findBraceletOptionByEffect(pctMark ? typeKey : `${typeKey}_abs`, value) ?? null;
};

const parseBraceletStatLine = (line: string): BraceletStatOption | null => {
  const m = line.trim().match(/^(힘|민첩|지능|특화|치명|신속|제압|인내|숙련|체력)\s*\+?([\d,]+)/);
  if (!m) return null;
  return { type: m[1] as BraceletStatType, value: parseInt(m[2].replace(/,/g, ''), 10) };
};

const parseBraceletOptions = (lines: string[]): BraceletOption[] => {
  const found: BraceletOption[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] ?? '';
    const critRate = line.match(/치명타\s*적중률(?:이)?\s*(\d+(?:\.\d+)?)%\s*증가/);
    const critDamage = line.match(/치명타\s*피해(?:량|가)?\s*(\d+(?:\.\d+)?)%\s*증가/);
    const critEnemyDamage = nextLine.match(/치명타로\s*적중\s*시\s*적에게\s*주는\s*피해(?:가)?\s*(\d+(?:\.\d+)?)%\s*증가/);
    const baseWeaponAttack = line.match(
      /무기\s*공격력\s*이\s*([\d,]+(?:\.\d+)?)\s*증가/,
    );
    const stackingWeaponAttack = nextLine.match(
      /30초\s*마다\s*120초\s*동안\s*무기\s*공격력\s*이\s*([\d,]+(?:\.\d+)?)\s*증가.*최대\s*30중첩/,
    );
    if (baseWeaponAttack && stackingWeaponAttack) {
      const option = findBraceletOptionByEffect(
        '에테르 포식자 무공 버프',
        parseBraceletNumericText(stackingWeaponAttack[1]) * 30,
      );
      if (option) found.push(option);
      i += 1;
      continue;
    }
    if (critRate && critEnemyDamage) {
      const option = findBraceletOptionByEffect('치명타 적중률+치명타 적주피', parseFloat(critRate[1]));
      if (option) found.push(option);
      i += 1;
      continue;
    }
    if (critDamage && critEnemyDamage) {
      const option = findBraceletOptionByEffect('치명타 피해+치명타 적주피', parseFloat(critDamage[1]));
      if (option) found.push(option);
      i += 1;
      continue;
    }
    const option = parseBraceletOptionLine(line);
    if (option) found.push(option);
  }
  return found;
};

/**
 * Tooltip 내 '연마 효과' Element_001 텍스트에서 3개 옵션 파싱.
 *
 * Element_001 raw text example:
 *   "<img...적에게 주는 피해 <FONT>+1.20%</FONT><br><img...추가 피해 <FONT>+1.60%</FONT><br>...공격력 <FONT>+390</FONT>"
 *
 * 줄별로 effect type + value 추출 → matching PolishOption 찾기.
 */
const parsePolishEffects = (tooltipJson: string): [PolishOption, PolishOption, PolishOption] => {
  const defaults: [PolishOption, PolishOption, PolishOption] = [NO_OPTION, NO_OPTION, NO_OPTION];
  try {
    const obj = JSON.parse(tooltipJson);
    for (const key of Object.keys(obj)) {
      const el = obj[key];
      if (el?.type !== 'ItemPartBox' || !el.value) continue;
      const header = el.value.Element_000 ?? '';
      if (!/연마\s*효과/.test(header)) continue;

      const content: string = el.value.Element_001 ?? '';
      // <br>로 분리
      const lines = content.split(/<br\s*\/?>(?:\s*<img[^>]+>)?/i).map((l) => stripHtml(l));
      const found: PolishOption[] = [];
      for (const line of lines) {
        const option = parsePolishOptionLine(line);
        if (option) found.push(option);
      }
      for (let i = 0; i < Math.min(3, found.length); i++) {
        defaults[i] = found[i];
      }
      break;
    }
  } catch {
    // ignore
  }
  return defaults;
};

/** 어빌리티 스톤 정보 (각인 2개 + 페널티 1개) */
export interface StoneState {
  tier: string;
  /** 활성 각인 2개의 [이름, 단계(0-4)] */
  engravings: Array<{ name: string; level: number }>;
  raw: EquipmentItem;
}

/** 팔찌 정보 (표시 및 시뮬레이션 입력용) */
export interface BraceletState {
  tier: string;
  /** 효과 텍스트 라인들 (가공된 표시용) */
  effects: string[];
  stats: [BraceletStatOption, BraceletStatOption, BraceletStatOption, BraceletStatOption];
  options: [BraceletOption, BraceletOption, BraceletOption, BraceletOption];
  raw: EquipmentItem;
}

const stripHtmlText = (s: string): string =>
  s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** 어빌리티 스톤 tooltip 파싱 — 활성 각인 2개 이름과 Lv 추출 */
export const parseStoneState = (item: EquipmentItem | undefined): StoneState | null => {
  if (!item || item.Type !== '어빌리티 스톤') return null;
  try {
    const obj = JSON.parse(item.Tooltip);
    const engravings: Array<{ name: string; level: number }> = [];
    for (const key of Object.keys(obj)) {
      const el = obj[key];
      if (!el?.value) continue;
      // "무작위 각인 효과" IndentStringGroup 구조 안에 각인 정보
      if (el.type === 'IndentStringGroup') {
        for (const subKey of Object.keys(el.value)) {
          const inner = el.value[subKey];
          if (!inner) continue;
          // contentStr가 객체일 수 있음 (Element_000~)
          const contentObj = typeof inner.contentStr === 'object' ? inner.contentStr : null;
          const allContent = contentObj
            ? Object.values(contentObj).map((c: unknown) => {
                if (typeof c === 'string') return c;
                if (c && typeof c === 'object' && 'contentStr' in c) {
                  return String((c as { contentStr: string }).contentStr);
                }
                return '';
              }).join(' ')
            : String(inner.contentStr ?? '');
          const text = stripHtmlText(allContent);
          // pattern: "[ 원한 ] Lv.2" 또는 "[ 예리한 둔기 ] Lv.3"
          const re = /\[\s*(.+?)\s*\]\s*Lv\.?(\d+)/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(text)) !== null) {
            const name = m[1].trim();
            const level = parseInt(m[2], 10);
            // 페널티 각인 (이동속도 감소, 방어력 감소 등) 제외
            if (!/감소/.test(name) && engravings.length < 2) {
              engravings.push({ name, level });
            }
          }
        }
      }
    }
    return { tier: item.Grade, engravings, raw: item };
  } catch {
    return null;
  }
};

/** 팔찌 tooltip 파싱 — 효과 텍스트 라인 추출 (디스플레이 전용) */
export const parseBraceletState = (item: EquipmentItem | undefined): BraceletState | null => {
  if (!item || item.Type !== '팔찌') return null;
  try {
    const obj = JSON.parse(item.Tooltip);
    for (const key of Object.keys(obj)) {
      const el = obj[key];
      if (el?.type !== 'ItemPartBox' || !el.value) continue;
      const header = stripHtmlText(el.value.Element_000 ?? '');
      if (!/팔찌\s*효과/.test(header)) continue;
      const content: string = el.value.Element_001 ?? '';
      // <br>로 분리, 각 라인 정리
      const lines = content.split(/<br\s*\/?>/i).map((l) => stripHtmlText(l)).filter(Boolean);
      const foundStats = lines.map((line) => parseBraceletStatLine(line)).filter((stat): stat is BraceletStatOption => stat !== null);
      const stats: [BraceletStatOption, BraceletStatOption, BraceletStatOption, BraceletStatOption] = [
        EMPTY_BRACELET_STAT,
        EMPTY_BRACELET_STAT,
        EMPTY_BRACELET_STAT,
        EMPTY_BRACELET_STAT,
      ];
      for (let i = 0; i < Math.min(4, foundStats.length); i++) {
        stats[i] = foundStats[i];
      }
      const found = parseBraceletOptions(lines);
      const options: [BraceletOption, BraceletOption, BraceletOption, BraceletOption] = [
        NO_BRACELET_OPTION,
        NO_BRACELET_OPTION,
        NO_BRACELET_OPTION,
        NO_BRACELET_OPTION,
      ];
      for (let i = 0; i < Math.min(4, found.length); i++) {
        options[i] = found[i];
      }
      return { tier: item.Grade, effects: lines, stats, options, raw: item };
    }
  } catch {
    // ignore
  }
  return null;
};

/** 5개 장신구 (목걸이, 귀걸이x2, 반지x2)를 AccessoryState로 변환 */
export const parseAccessoryList = (
  items: EquipmentItem[],
): Partial<Record<AccessorySlot, AccessoryState>> => {
  const result: Partial<Record<AccessorySlot, AccessoryState>> = {};
  let earringIdx = 0;
  let ringIdx = 0;
  for (const item of items) {
    let slot: AccessorySlot | null = null;
    if (item.Type === '목걸이') slot = 'necklace';
    else if (item.Type === '귀걸이') {
      slot = earringIdx === 0 ? 'earring1' : 'earring2';
      earringIdx++;
    } else if (item.Type === '반지') {
      slot = ringIdx === 0 ? 'ring1' : 'ring2';
      ringIdx++;
    }
    if (!slot) continue;
    const polishOptions = parsePolishEffects(item.Tooltip);
    result[slot] = {
      slot,
      grade: item.Grade,
      polishOptions,
      raw: item,
    };
  }
  return result;
};
