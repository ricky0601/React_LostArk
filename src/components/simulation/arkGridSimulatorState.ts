import type { ArkGridData, ArkGridEffect, ArkGridGem } from '../../types/lostark';

export type ArkGridGemEffectMod = { option: string; level: number };
export type ArkGridGemMod = { willpower?: number; corePoint?: number; effects?: ArkGridGemEffectMod[] };
export type ArkGridCoreMod = {
  grade?: string;
  coreName?: string;
  gems?: Record<number, ArkGridGemMod>;
};
export type ArkGridGemEditTarget = { slotIndex: number; gemIndex: number };

export const ARK_GRID_CORE_GRADE_OPTIONS = ['영웅', '전설', '유물', '고대'];
export const ARK_GRID_CHAOS_CORE_OPTIONS = [
  { group: '혼돈 해', options: ['현란한 공격', '안정적인 공격', '재빠른 공격', '신념의 강화', '흐르는 마나', '불굴의 강화'] },
  { group: '혼돈 달', options: ['불타는 일격', '부수는 일격', '흡수의 일격', '낙인의 흔적', '강철의 흔적', '치명적인 흔적'] },
  { group: '혼돈 별', options: ['공격', '무기', '구원', '생명', '속도', '방어'] },
];
export const ARK_GRID_GEM_SELECT_NUMBERS = [1, 2, 3, 4, 5];
export const ARK_GRID_SUMMARY_OPTIONS = ['공격력', '추가 피해', '보스 피해', '낙인력', '아군 공격 강화', '아군 피해 강화'];
export const ARK_GRID_GEM_OPTIONS = ['공격력', '추가 피해', '보스 피해', '낙인력', '아군 공격 강화', '아군 피해 강화'];

const ARK_GRID_CHAOS_CORE_NAMES = ['혼돈의 해', '혼돈의 달', '혼돈의 별'] as const;

const stripTooltipText = (value: string): string =>
  value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export const isChaosArkGridSlot = (slotIndex: number): boolean => slotIndex >= 3;

export const getArkGridChaosOptionGroup = (slotIndex: number): typeof ARK_GRID_CHAOS_CORE_OPTIONS[number] =>
  ARK_GRID_CHAOS_CORE_OPTIONS[slotIndex - 3] ?? ARK_GRID_CHAOS_CORE_OPTIONS[0];

export const resolveArkGridChaosOptionName = (slotIndex: number, coreName: string): string => {
  const optionGroup = getArkGridChaosOptionGroup(slotIndex);
  const normalizedCoreName = coreName.replace(/\s+/g, '');
  return optionGroup.options.find((option) => normalizedCoreName.includes(option.replace(/\s+/g, ''))) ?? optionGroup.options[0];
};

export const parseArkGridGemEffects = (tooltip: string): ArkGridGemEffectMod[] => {
  const text = stripTooltipText(tooltip);
  const effects: ArkGridGemEffectMod[] = [];
  const effectPattern = /\[([^\]]+)\]\s*Lv\.(\d+)/g;
  let match = effectPattern.exec(text);
  while (match) {
    const option = match[1];
    if (ARK_GRID_GEM_OPTIONS.includes(option)) {
      effects.push({ option, level: Number(match[2]) });
    }
    match = effectPattern.exec(text);
  }
  return effects;
};

const parseArkGridGemWillpower = (tooltip: string): number => {
  const match = stripTooltipText(tooltip).match(/필요\s*의지력\s*:\s*(\d+)/);
  return match ? Number(match[1]) : 1;
};

const parseArkGridGemCorePoint = (tooltip: string): number => {
  const match = stripTooltipText(tooltip).match(/(?:질서|혼돈)\s*포인트\s*:\s*(\d+)/);
  return match ? Number(match[1]) : 1;
};

export const getArkGridGemEffects = (gem: ArkGridGem | undefined): ArkGridGemEffectMod[] => {
  const parsedEffects = gem ? parseArkGridGemEffects(gem.Tooltip) : [];
  const fallbackEffects: ArkGridGemEffectMod[] = [
    { option: ARK_GRID_GEM_OPTIONS[0], level: 1 },
    { option: ARK_GRID_GEM_OPTIONS[1], level: 1 },
  ];
  return [...parsedEffects, ...fallbackEffects].slice(0, 2);
};

export const getArkGridGemState = (gem: ArkGridGem | undefined): Required<ArkGridGemMod> => ({
  willpower: gem ? parseArkGridGemWillpower(gem.Tooltip) : 1,
  corePoint: gem ? parseArkGridGemCorePoint(gem.Tooltip) : 1,
  effects: getArkGridGemEffects(gem),
});

const resolveModifiedArkGridCoreName = (slotIndex: number, currentName: string, modifiedCoreName: string | undefined): string => {
  if (!modifiedCoreName) return currentName;
  if (!isChaosArkGridSlot(slotIndex)) return modifiedCoreName;
  const chaosCoreName = ARK_GRID_CHAOS_CORE_NAMES[slotIndex - 3];
  return chaosCoreName ? `${chaosCoreName} 코어 : ${modifiedCoreName}` : modifiedCoreName;
};

const applyArkGridGemEffectDelta = (
  levels: Map<string, number>,
  effects: readonly ArkGridGemEffectMod[],
  sign: 1 | -1,
): void => {
  for (const effect of effects) {
    levels.set(effect.option, (levels.get(effect.option) ?? 0) + sign * effect.level);
  }
};

export const buildModifiedArkGrid = (
  arkGrid: ArkGridData | null,
  arkGridMods: Record<number, ArkGridCoreMod>,
): ArkGridData | null => {
  if (!arkGrid) return null;

  const currentEffects = arkGrid.Effects ?? [];
  const effectByName = new Map(currentEffects.map((effect) => [effect.Name, effect]));
  const effectLevels = new Map(currentEffects.map((effect) => [effect.Name, effect.Level]));
  const slots = (arkGrid.Slots ?? []).map((slot) => {
    const coreMod = arkGridMods[slot.Index];
    const slotGems = slot.Gems ?? [];
    const realGemIndexes = new Set(slotGems.map((gem) => gem.Index));
    let simulatedCorePoint = 0;
    let hasCorePointSource = false;

    for (const gem of slotGems) {
      const gemMod = coreMod?.gems?.[gem.Index];
      const baseState = getArkGridGemState(gem);
      const modifiedCorePoint = gemMod?.corePoint ?? baseState.corePoint;
      simulatedCorePoint += modifiedCorePoint;
      hasCorePointSource = true;
      if (!gemMod) continue;

      const modifiedEffects = gemMod.effects ?? baseState.effects;
      applyArkGridGemEffectDelta(effectLevels, baseState.effects, -1);
      applyArkGridGemEffectDelta(effectLevels, modifiedEffects, 1);
    }

    for (const [gemIndexText, gemMod] of Object.entries(coreMod?.gems ?? {})) {
      if (realGemIndexes.has(Number(gemIndexText))) continue;
      simulatedCorePoint += gemMod.corePoint ?? 0;
      hasCorePointSource = true;
      applyArkGridGemEffectDelta(effectLevels, gemMod.effects ?? [], 1);
    }

    const effectivePoint = hasCorePointSource
      ? (simulatedCorePoint >= 10 ? simulatedCorePoint : 0)
      : slot.Point;

    return {
      ...slot,
      Grade: coreMod?.grade ?? slot.Grade,
      Name: resolveModifiedArkGridCoreName(slot.Index, slot.Name, coreMod?.coreName),
      Point: effectivePoint,
      Gems: [...slotGems],
    };
  });
  const effects: ArkGridEffect[] = Array.from(effectLevels.entries()).map(([Name, Level]) => ({
    Name,
    Level: Math.max(0, Level),
    Tooltip: effectByName.get(Name)?.Tooltip ?? '',
  }));

  return { Slots: slots, Effects: effects };
};
