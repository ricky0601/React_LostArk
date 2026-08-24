import type { MarketCategory } from '../../utils/api';
import {
  AEGIR_ARMOR_STEPS,
  AEGIR_WEAPON_STEPS,
  SERKA_ARMOR_STEPS,
  SERKA_WEAPON_STEPS,
  ARMLET_STEPS,
  ADV_ARMOR_STAGES,
  ADV_WEAPON_STAGES,
  ADV_STAGE_XP,
  calcExpectedAttempts,
  getCeiling,
  getAttemptMaterials,
  calcAdvExpectedAttempts,
  getAdvAttemptMaterials,
  type MaterialType,
  type AdvTurnOption,
} from '../../data/enhancement';

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

export const ARMOR_SLOTS = ['투구', '어깨', '상의', '하의', '장갑'] as const;
export type ArmorSlot = (typeof ARMOR_SLOTS)[number];
export type SlotName = '무기' | ArmorSlot | '완갑';

export const ALL_SLOTS: SlotName[] = ['무기', '완갑', '투구', '어깨', '상의', '하의', '장갑'];
export const ITEM_LEVEL_SLOTS = ['무기', ...ARMOR_SLOTS] as const;

export const ITEM_LEVEL_PER_STEP = 5; // 일반 재련 1단계당 아이템 레벨 증가량

export const NORMAL_BULK_TARGET_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const level = i + 11;
  return { value: level, label: `${level}강` };
});

export const ADV_TARGET_OPTIONS = [10, 20, 30, 40].map((level) => ({
  value: level,
  label: `${level}단계`,
}));

export interface MarketConfig {
  searchName: string;
  itemsPerUnit?: number;
  categoryCode?: number;
  extraParams?: Record<string, unknown>;
  untradeable?: boolean;
}

export const MARKET_SEARCH: Record<MaterialType, MarketConfig> = {
  // 방어구
  '수호석':               { searchName: '운명의 수호석' },
  '돌파석':               { searchName: '운명의 돌파석' },
  '아비도스 융화 재료':    { searchName: '아비도스 융화 재료' },
  '운명의 파편':           { searchName: '운명의 파편 주머니(소)', itemsPerUnit: 1000 },
  '빙하의 숨결':           { searchName: '빙하의 숨결', categoryCode: 50020 },
  '재봉술: 업화 [11-14]': { searchName: '재봉술 : 업화 [11-14]' },
  '재봉술: 업화 [15-18]': { searchName: '재봉술 : 업화 [15-18]' },
  '재봉술: 업화 [19-20]': { searchName: '재봉술 : 업화 [19-20]' },
  // 무기
  '파괴석':               { searchName: '운명의 파괴석' },
  '용암의 숨결':           { searchName: '용암의 숨결', categoryCode: 50020 },
  '야금술: 업화 [11-14]': { searchName: '야금술 : 업화 [11-14]' },
  '야금술: 업화 [15-18]': { searchName: '야금술 : 업화 [15-18]' },
  '야금술: 업화 [19-20]': { searchName: '야금술 : 업화 [19-20]' },
  // 세르카 방어구
  '운명의 수호석 결정':    { searchName: '운명의 수호석 결정' },
  '위대한 운명의 돌파석':  { searchName: '위대한 운명의 돌파석' },
  '상급 아비도스 융화':    { searchName: '상급 아비도스 융화' },
  // 세르카 무기
  '운명의 파괴석 결정':    { searchName: '운명의 파괴석 결정' },
  // 방어구 상급 재련 책
  '장인의 재봉술: 1단계':  { searchName: '장인의 재봉술 : 1단계' },
  '장인의 재봉술: 2단계':  { searchName: '장인의 재봉술 : 2단계' },
  '장인의 재봉술: 3단계':  { searchName: '장인의 재봉술 : 3단계' },
  '장인의 재봉술: 4단계':  { searchName: '장인의 재봉술 : 4단계' },
  // 무기 상급 재련 책
  '장인의 야금술: 1단계':  { searchName: '장인의 야금술 : 1단계' },
  '장인의 야금술: 2단계':  { searchName: '장인의 야금술 : 2단계' },
  '장인의 야금술: 3단계':  { searchName: '장인의 야금술 : 3단계' },
  '장인의 야금술: 4단계':  { searchName: '장인의 야금술 : 4단계' },
};

export const ALL_MATERIAL_TYPES = Object.keys(MARKET_SEARCH) as MaterialType[];

export type PriceMap = Partial<Record<MaterialType, number>>;
export type IconMap = Partial<Record<MaterialType, string>>;

export const flattenCategories = (cats: MarketCategory[]): MarketCategory[] =>
  cats.flatMap((c) => [c, ...(c.Subs ? flattenCategories(c.Subs) : [])]);

export const MATERIAL_CATEGORY_KEYWORD: Record<MaterialType, string> = {
  '수호석':               '재련 재료',
  '돌파석':               '재련 재료',
  '아비도스 융화 재료':    '재련 재료',
  '운명의 파편':           '재련 재료',
  '빙하의 숨결':           '추가 재료',
  '재봉술: 업화 [11-14]': '추가 재료',
  '재봉술: 업화 [15-18]': '추가 재료',
  '재봉술: 업화 [19-20]': '추가 재료',
  '운명의 수호석 결정':    '재련 재료',
  '위대한 운명의 돌파석':  '재련 재료',
  '상급 아비도스 융화':    '재련 재료',
  '운명의 파괴석 결정':    '재련 재료',
  '파괴석':               '재련 재료',
  '용암의 숨결':           '추가 재료',
  '야금술: 업화 [11-14]': '추가 재료',
  '야금술: 업화 [15-18]': '추가 재료',
  '야금술: 업화 [19-20]': '추가 재료',
  '장인의 재봉술: 1단계':  '추가 재료',
  '장인의 재봉술: 2단계':  '추가 재료',
  '장인의 재봉술: 3단계':  '추가 재료',
  '장인의 재봉술: 4단계':  '추가 재료',
  '장인의 야금술: 1단계':  '추가 재료',
  '장인의 야금술: 2단계':  '추가 재료',
  '장인의 야금술: 3단계':  '추가 재료',
  '장인의 야금술: 4단계':  '추가 재료',
};

// ─────────────────────────────────────────────
// 유틸 함수
// ─────────────────────────────────────────────

export const parseEnhLevel = (name: string): number => {
  const m = name.match(/^\+(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};

export const parseTooltipData = (tooltip: string): { isInherited: boolean; advLevel: number } => {
  try {
    const data = JSON.parse(tooltip);
    const isInherited = data?.Element_001?.value?.slotData?.petBorder === 6;
    let advLevel = 0;
    for (const key of Object.keys(data)) {
      const el = data[key];
      if (el?.value && typeof el.value === 'string') {
        const stripped = el.value.replace(/<[^>]+>/g, '');
        const m = stripped.match(/\[상급 재련\]\s*(\d+)단계/);
        if (m) { advLevel = parseInt(m[1], 10); break; }
      }
    }
    return { isInherited, advLevel };
  } catch {
    return { isInherited: false, advLevel: 0 };
  }
};

export const formatGold = (g: number): string => {
  if (g >= 100_000_000) return `${(g / 100_000_000).toFixed(2)}억G`;
  if (g >= 10_000) return `${(g / 10_000).toFixed(1)}만G`;
  return `${Math.round(g).toLocaleString()}G`;
};

export const formatSilver = (s: number): string => {
  if (s >= 10_000) return `${(s / 10_000).toFixed(0)}만`;
  return s.toLocaleString();
};

export const findCheapest = (
  steps: typeof AEGIR_ARMOR_STEPS,
  prices: PriceMap,
): { useBook: boolean; useBreath: boolean } => {
  const combos = [
    { useBook: false, useBreath: false },
    { useBook: false, useBreath: true },
    { useBook: true,  useBreath: false },
    { useBook: true,  useBreath: true },
  ];
  let best = combos[0];
  let bestGold = Infinity;
  for (const combo of combos) {
    const gold = steps.reduce((sum, step) => {
      const exp = calcExpectedAttempts(step, combo.useBook, combo.useBreath);
      const mats = getAttemptMaterials(step, combo.useBook, combo.useBreath);
      const matGold = mats.reduce((s, m) => s + m.amount * (prices[m.type] ?? 0), 0) * exp;
      return sum + step.gold * exp + matGold;
    }, 0);
    if (gold < bestGold) { bestGold = gold; best = combo; }
  }
  return best;
};

export const ADV_TURN_OPTIONS: AdvTurnOption[] = ['none', 'book', 'breath', 'both'];
export const ADV_TURN_OPTION_LABELS: Record<AdvTurnOption, string> = {
  none: '-', book: '재', breath: '숨', both: '숨재',
};

export const findCheapestAdv = (
  activeAdvSlots: SlotName[],
  advLevelMap: Partial<Record<SlotName, number>>,
  advTargetMap: Partial<Record<SlotName, number>>,
  prices: PriceMap,
): { normalOpt: AdvTurnOption; ancestorOpt: AdvTurnOption; enhancedOpt: AdvTurnOption } => {
  const defaultCombo = { normalOpt: 'none' as AdvTurnOption, ancestorOpt: 'none' as AdvTurnOption, enhancedOpt: 'none' as AdvTurnOption };
  if (activeAdvSlots.length === 0) return defaultCombo;

  const calcSlotGold = (normalOpt: AdvTurnOption, ancestorOpt: AdvTurnOption, enhancedOpt: AdvTurnOption) => {
    let gold = 0;
    activeAdvSlots.forEach((slot) => {
      const currentAdv = advLevelMap[slot] ?? 0;
      const targetAdv = advTargetMap[slot]!;
      const stagesData = slot === '무기' ? ADV_WEAPON_STAGES : ADV_ARMOR_STAGES;
      for (let i = 0; i < stagesData.length; i++) {
        const stageNum = (i + 1) as 1 | 2 | 3 | 4;
        const stageStart = i * 10;
        const stageEnd = stageStart + 10;
        if (currentAdv >= stageEnd) continue;
        if (targetAdv <= stageStart) break;
        const stageData = stagesData[i];
        const xpDone = currentAdv > stageStart ? (currentAdv - stageStart) * 100 : 0;
        const xpNeeded = (Math.min(targetAdv, stageEnd) - stageStart) * 100 - xpDone;
        if (xpNeeded <= 0) continue;
        const attempts = calcAdvExpectedAttempts(normalOpt, ancestorOpt, enhancedOpt, stageNum) * (xpNeeded / ADV_STAGE_XP);
        gold += attempts * stageData.gold;
        const { main, optional } = getAdvAttemptMaterials(stageData, normalOpt, ancestorOpt, enhancedOpt);
        for (const { type, amount } of [...main, ...optional]) {
          gold += amount * attempts * (prices[type] ?? 0);
        }
      }
    });
    return gold;
  };

  let best = defaultCombo;
  let bestGold = Infinity;
  for (const normalOpt of ADV_TURN_OPTIONS) {
    for (const ancestorOpt of ADV_TURN_OPTIONS) {
      for (const enhancedOpt of ADV_TURN_OPTIONS) {
        const gold = calcSlotGold(normalOpt, ancestorOpt, enhancedOpt);
        if (gold < bestGold) { bestGold = gold; best = { normalOpt, ancestorOpt, enhancedOpt }; }
      }
    }
  }
  return best;
};

export const getStepsForSlot = (slot: SlotName, isInherited: boolean) => {
  if (slot === '완갑') return ARMLET_STEPS;
  if (slot === '무기') return isInherited ? SERKA_WEAPON_STEPS : AEGIR_WEAPON_STEPS;
  return isInherited ? SERKA_ARMOR_STEPS : AEGIR_ARMOR_STEPS;
};

export const supportsAdvancedHoning = (slot: SlotName): boolean => slot !== '완갑';

export const calcStepData = (
  steps: typeof AEGIR_ARMOR_STEPS,
  book: boolean,
  breath: boolean,
  priceMap: PriceMap,
) => steps.map((step) => {
  const exp = calcExpectedAttempts(step, book, breath);
  const ceiling = getCeiling(step, book, breath);
  const mats = getAttemptMaterials(step, book, breath);
  const matGoldPerAttempt = mats.reduce((s, m) => s + m.amount * (priceMap[m.type] ?? 0), 0);
  const matGold = matGoldPerAttempt * exp;
  const directGold = step.gold * exp;
  const silver = step.silver * exp;
  // 천장(장기백) 케이스: 천장 시도수까지 모두 실패 후 마지막에 성공
  const ceilingMatGold = matGoldPerAttempt * ceiling;
  const ceilingDirectGold = step.gold * ceiling;
  const ceilingSilver = step.silver * ceiling;
  return {
    step,
    exp, mats, matGold, directGold, silver, totalGold: directGold + matGold,
    ceiling, ceilingMatGold, ceilingDirectGold, ceilingSilver, ceilingTotalGold: ceilingDirectGold + ceilingMatGold,
  };
});
