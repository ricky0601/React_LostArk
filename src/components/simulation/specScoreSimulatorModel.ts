import type { EquipSlot } from '../../data/specScore/lopecCoefficients';
import {
  ACCESSORY_SLOTS,
  EMPTY_BRACELET_STAT,
  findBraceletOption,
  findPolishOption,
  type BraceletStatOption,
} from '../../data/specScore/polishOptions';
import type { ArkPassiveData, EngravingData, GemData } from '../../types/lostark';
import { calcLopecDelta } from '../../utils/lopecSimulator';
import { roundToTwoDecimals } from '../../utils/numberFormat';
import type { AccessoryState, BraceletState } from '../../utils/polishState';
import { buildModifiedArkGrid } from './arkGridSimulatorState';
import type {
  ModifiedSpecScoreData,
  Mods,
  PolishOptionLabels,
  ScoreSimulation,
  SpecScoreRawData,
} from './specScoreSimulatorTypes';

export const EMPTY_MODS: Mods = {
  gems: {},
  engs: {},
  awakenings: {},
  equip: {},
  polish: {},
  stone: {},
  arkGrid: {},
};

export const SLOT_ORDER: EquipSlot[] = ['weapon', 'helmet', 'shoulder', 'armor', 'pants', 'gloves'];
export const EMPTY_POLISH_LABELS: PolishOptionLabels = ['없음', '없음', '없음'];
export const EMPTY_BRACELET_LABELS: [string, string, string, string] = ['없음', '없음', '없음', '없음'];
export const EMPTY_BRACELET_STATS: [BraceletStatOption, BraceletStatOption, BraceletStatOption, BraceletStatOption] = [
  EMPTY_BRACELET_STAT,
  EMPTY_BRACELET_STAT,
  EMPTY_BRACELET_STAT,
  EMPTY_BRACELET_STAT,
];

const resolvePolishOptions = (
  labels: PolishOptionLabels,
  fallback: AccessoryState['polishOptions'],
): AccessoryState['polishOptions'] => [
  findPolishOption(labels[0]) ?? fallback[0],
  findPolishOption(labels[1]) ?? fallback[1],
  findPolishOption(labels[2]) ?? fallback[2],
];

const resolveBraceletOptions = (
  labels: [string, string, string, string],
  fallback: BraceletState['options'],
): BraceletState['options'] => [
  findBraceletOption(labels[0]) ?? fallback[0],
  findBraceletOption(labels[1]) ?? fallback[1],
  findBraceletOption(labels[2]) ?? fallback[2],
  findBraceletOption(labels[3]) ?? fallback[3],
];

export const getAccessoryOptionLabels = (accessory: AccessoryState | undefined): PolishOptionLabels =>
  accessory
    ? [accessory.polishOptions[0].label, accessory.polishOptions[1].label, accessory.polishOptions[2].label]
    : EMPTY_POLISH_LABELS;

export const getBraceletOptionLabels = (bracelet: BraceletState | null): [string, string, string, string] =>
  bracelet
    ? [bracelet.options[0].label, bracelet.options[1].label, bracelet.options[2].label, bracelet.options[3].label]
    : EMPTY_BRACELET_LABELS;

export const replacePolishLabel = (
  labels: PolishOptionLabels,
  optionIndex: 0 | 1 | 2,
  label: string,
): PolishOptionLabels => [
  optionIndex === 0 ? label : labels[0],
  optionIndex === 1 ? label : labels[1],
  optionIndex === 2 ? label : labels[2],
];

export const replaceBraceletLabel = (
  labels: [string, string, string, string],
  optionIndex: 0 | 1 | 2 | 3,
  label: string,
): [string, string, string, string] => [
  optionIndex === 0 ? label : labels[0],
  optionIndex === 1 ? label : labels[1],
  optionIndex === 2 ? label : labels[2],
  optionIndex === 3 ? label : labels[3],
];

export const replaceBraceletStat = (
  stats: [BraceletStatOption, BraceletStatOption, BraceletStatOption, BraceletStatOption],
  statIndex: 0 | 1 | 2 | 3,
  patch: Partial<BraceletStatOption>,
): [BraceletStatOption, BraceletStatOption, BraceletStatOption, BraceletStatOption] => [
  statIndex === 0 ? { ...stats[0], ...patch } : stats[0],
  statIndex === 1 ? { ...stats[1], ...patch } : stats[1],
  statIndex === 2 ? { ...stats[2], ...patch } : stats[2],
  statIndex === 3 ? { ...stats[3], ...patch } : stats[3],
];

export const buildModifiedSpecScoreData = (
  raw: SpecScoreRawData,
  mods: Mods,
): ModifiedSpecScoreData => {
  const gems: GemData = {
    ...raw.gems,
    Gems: raw.gems.Gems?.map((gem) => {
      const mod = mods.gems[gem.Slot];
      if (!mod) return gem;
      return { ...gem, Level: mod.Level ?? gem.Level, Tooltip: mod.Tooltip ?? gem.Tooltip };
    }) ?? null,
  };
  const originalStoneNames = new Set(raw.stone?.engravings.map((engraving) => engraving.name) ?? []);
  const stoneSelections = raw.stone?.engravings.map((engraving, index) => ({
    name: mods.stone[index]?.name ?? engraving.name,
    level: mods.stone[index]?.level ?? engraving.level,
  })) ?? [];
  const modifiedArkPassiveEffects = (raw.engravings.ArkPassiveEffects ?? []).map((effect) => {
    const mod = mods.engs[effect.Name];
    const selectedStone = stoneSelections.find((stone) => stone.name === effect.Name);
    const stoneLevel = selectedStone
      ? selectedStone.level
      : originalStoneNames.has(effect.Name)
        ? null
        : effect.AbilityStoneLevel;
    return {
      ...effect,
      Level: mod?.Level ?? effect.Level,
      AbilityStoneLevel: mod?.AbilityStoneLevel !== undefined ? mod.AbilityStoneLevel : stoneLevel,
    };
  });
  for (const stone of stoneSelections) {
    if (modifiedArkPassiveEffects.some((effect) => effect.Name === stone.name)) continue;
    modifiedArkPassiveEffects.push({
      AbilityStoneLevel: stone.level,
      Description: '',
      Grade: '',
      Level: 0,
      Name: stone.name,
    });
  }
  const engravings: EngravingData = {
    ...raw.engravings,
    ArkPassiveEffects: modifiedArkPassiveEffects,
  };
  const arkPassive: ArkPassiveData | undefined = raw.arkPassive
    ? (() => {
        const awakeningMod = Object.values(mods.awakenings).find((mod) => mod.Level !== undefined);
        if (!awakeningMod || awakeningMod.Level === undefined) return raw.arkPassive;
        const pointTable: Record<number, number> = { 1: 8, 2: 14, 3: 22, 4: 30 };
        const targetPoints = pointTable[awakeningMod.Level] ?? 30;
        return {
          ...raw.arkPassive,
          Points: raw.arkPassive.Points?.map((point) =>
            point.Name.includes('깨달음') ? { ...point, Value: targetPoints } : point,
          ) ?? null,
        };
      })()
    : undefined;
  const equip: ModifiedSpecScoreData['equip'] = {};
  for (const slot of SLOT_ORDER) {
    const current = raw.equip[slot];
    if (!current) continue;
    const mod = mods.equip[slot];
    equip[slot] = mod
      ? {
          ...current,
          normalLevel: mod.normalLevel ?? current.normalLevel,
          advancedLevel: current.isInherited ? current.advancedLevel : (mod.advancedLevel ?? current.advancedLevel),
          tier: mod.tier ?? current.tier,
        }
      : current;
  }
  const accessories: ModifiedSpecScoreData['accessories'] = {};
  for (const slot of ACCESSORY_SLOTS) {
    const current = raw.accessories[slot];
    if (!current) continue;
    const mod = mods.polish[slot];
    accessories[slot] = mod?.polishOptions
      ? { ...current, polishOptions: resolvePolishOptions(mod.polishOptions, current.polishOptions) }
      : current;
  }
  const bracelet = raw.bracelet
    ? {
        ...raw.bracelet,
        stats: mods.bracelet?.stats ?? raw.bracelet.stats,
        options: mods.bracelet?.options
          ? resolveBraceletOptions(mods.bracelet.options, raw.bracelet.options)
          : raw.bracelet.options,
      }
    : null;

  return {
    engravings,
    gems,
    arkPassive,
    arkGrid: buildModifiedArkGrid(raw.arkGrid, mods.arkGrid),
    cards: raw.cards,
    equip,
    accessories,
    bracelet,
  };
};

export const calculateSpecScore = (
  currentScore: number,
  raw: SpecScoreRawData,
  modified: ModifiedSpecScoreData,
): ScoreSimulation => {
  const lopecSimulated = calcLopecDelta(
    currentScore,
    raw.engravings,
    modified.engravings,
    raw.gems,
    modified.gems,
    raw.equip,
    modified.equip,
    raw.accessories,
    modified.accessories,
    raw.charStats,
    raw.arkGrid,
    modified.arkGrid,
    raw.bracelet,
    modified.bracelet,
  );
  return {
    current: roundToTwoDecimals(currentScore),
    simulated: roundToTwoDecimals(lopecSimulated),
    delta: roundToTwoDecimals(lopecSimulated - currentScore),
  };
};

export const hasSpecScoreMods = (mods: Mods): boolean =>
  Object.keys(mods.gems).length > 0 ||
  Object.keys(mods.engs).length > 0 ||
  Object.keys(mods.awakenings).length > 0 ||
  Object.keys(mods.equip).length > 0 ||
  Object.keys(mods.polish).length > 0 ||
  Object.keys(mods.stone).length > 0 ||
  Boolean(mods.bracelet) ||
  Object.keys(mods.arkGrid).length > 0;
