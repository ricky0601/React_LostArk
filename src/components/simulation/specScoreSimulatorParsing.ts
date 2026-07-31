import type { AvatarItem, CharacterProfile, EquipmentItem } from '../../types/lostark';
import { ARMLET_POWER_BY_LEVEL, resolveArmletLevel } from '../../data/specScore/lopecCoefficients';
import { fetchArkGrid, fetchArkPassive, fetchAvatars, fetchCards, fetchEngravings, fetchEquipment, fetchGems } from '../../utils/api';
import { parseEquipmentList } from '../../utils/equipmentState';
import { combineAvatarPetMainStatMultiplier } from '../../utils/lopecEquipmentDelta';
import {
  ASSUMED_STONE_BASE_ATTACK_PERCENT,
  composeEffectiveWeaponAttack,
  resolveEnlightenmentKarmaWeaponAttackPercent,
  sumAccessoryFlatWeaponAttack,
  sumAccessoryWeaponAttackPercent,
  sumBraceletFlatWeaponAttack,
  sumGemBaseAttackPercent,
} from '../../utils/lopecBaseAttack';
import { parseAccessoryList, parseBraceletState, parseStoneState } from '../../utils/polishState';
import type { SpecScoreRawData } from './specScoreSimulatorTypes';

const EMPTY_EQUIPMENT_ITEMS: EquipmentItem[] = [];
const EMPTY_AVATAR_ITEMS: AvatarItem[] = [];
const ASSUMED_PET_MAIN_STAT_MULTIPLIER = 1.01;
const ARMOR_TYPES: readonly string[] = ['투구', '어깨', '상의', '하의', '장갑', '완갑'];

type MainStatLabel = '힘' | '민첩' | '지능';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const isMainStatLabel = (value: string | undefined): value is MainStatLabel =>
  value === '힘' || value === '민첩' || value === '지능';

const isArmorItem = (item: EquipmentItem): boolean =>
  ARMOR_TYPES.includes(item.Type);

const collectRegexMatches = (text: string, pattern: RegExp): RegExpExecArray[] => {
  const matches: RegExpExecArray[] = [];
  let match = pattern.exec(text);
  while (match !== null) {
    matches.push(match);
    match = pattern.exec(text);
  }
  return matches;
};

export const parseNumberText = (value: string | undefined): number =>
  Number(String(value ?? '0').replace(/,/g, '')) || 0;

const stripTooltipText = (value: string): string =>
  value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const collectTooltipStrings = (value: unknown): string[] => {
  if (typeof value === 'string') return [stripTooltipText(value)];
  if (Array.isArray(value)) return value.flatMap(collectTooltipStrings);
  if (isRecord(value)) return Object.values(value).flatMap(collectTooltipStrings);
  return [];
};

const parseTooltipStrings = (tooltip: string): readonly string[] => {
  try {
    const parsed: unknown = JSON.parse(tooltip);
    return collectTooltipStrings(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
};

const inferActiveMainStatLabel = (equipment: readonly EquipmentItem[]): MainStatLabel | undefined => {
  const labels = new Set<MainStatLabel>();
  for (const item of equipment) {
    if (!isArmorItem(item)) continue;
    for (const text of parseTooltipStrings(item.Tooltip)) {
      for (const match of collectRegexMatches(text, /(힘|민첩|지능)\s*\+?\s*[\d,]+(?![\d,.]*\s*%)/g)) {
        const label = match[1];
        if (isMainStatLabel(label)) labels.add(label);
      }
    }
  }

  const inferredLabels = Array.from(labels);
  if (inferredLabels.length !== 1) return undefined;
  return inferredLabels[0];
};

const extractEquipmentMainStat = (equipment: readonly EquipmentItem[]): number | undefined => {
  const activeLabel = inferActiveMainStatLabel(equipment);
  if (!activeLabel) return undefined;

  let total = 0;
  for (const item of equipment) {
    for (const text of parseTooltipStrings(item.Tooltip)) {
      for (const match of collectRegexMatches(text, /(힘|민첩|지능)\s*\+?\s*([\d,]+)(?![\d,.]*\s*%)/g)) {
        if (match[1] === activeLabel) total += parseNumberText(match[2]);
      }
    }
  }
  return total > 0 ? total : undefined;
};

const extractAvatarMainStatMultiplier = (avatars: readonly AvatarItem[]): number => {
  let bonusPercent = 0;
  for (const item of avatars) {
    if (!item.IsInner) continue;
    for (const text of parseTooltipStrings(item.Tooltip)) {
      for (const match of collectRegexMatches(text, /(?:힘|민첩|지능)\s*\+?\s*([\d.]+)\s*%/g)) {
        bonusPercent += Number(match[1]) || 0;
      }
    }
  }
  return 1 + bonusPercent / 100;
};

const extractWeaponAttack = (weapon: EquipmentItem | undefined): number => {
  if (!weapon) return 0;
  try {
    const obj = JSON.parse(weapon.Tooltip);
    for (const key of Object.keys(obj)) {
      const el = obj[key];
      if (el?.type === 'ItemPartBox' && el.value) {
        const header = el.value.Element_000 ?? '';
        const content: string = el.value.Element_001 ?? '';
        if (/기본\s*효과/.test(header)) {
          const match = content.match(/무기\s*공격력\s*\+?([\d,]+)/);
          if (match) return parseInt(match[1].replace(/,/g, ''), 10);
        }
      }
    }
  } catch (error) {
    if (error instanceof SyntaxError) return 0;
    throw error;
  }
  return 0;
};

const extractPureBaseAttack = (stats: CharacterProfile['Stats']): number | undefined => {
  const attackStat = stats.find((stat) => stat.Type === '공격력');
  const tooltip = stripTooltipText((attackStat?.Tooltip ?? []).join(' '));
  const match = tooltip.match(/기본\s*공격력은\s*([\d,]+)/);
  if (!match) return undefined;

  const pureBaseAttack = parseNumberText(match[1]);
  return pureBaseAttack > 0 ? pureBaseAttack : undefined;
};

const extractCombatStats = (stats: CharacterProfile['Stats']) => ({
  crit: parseNumberText(stats.find((stat) => stat.Type === '치명')?.Value),
  specialization: parseNumberText(stats.find((stat) => stat.Type === '특화')?.Value),
  swiftness: parseNumberText(stats.find((stat) => stat.Type === '신속')?.Value),
});

const extractStoneBaseAttackBonusPercent = (stone: EquipmentItem | undefined): number | undefined => {
  if (!stone) return undefined;
  const tooltip = stripTooltipText(stone.Tooltip);
  const match = tooltip.match(/기본\s*공격력\s*\+([\d.]+)\s*%/);
  if (!match) return undefined;

  const bonusPercent = Number(match[1]);
  return bonusPercent > 0 ? bonusPercent : undefined;
};

export const fetchSpecScoreRawData = async (profile: CharacterProfile): Promise<SpecScoreRawData> => {
  const [engravings, gems, arkPassive, arkGrid, cards, equipment, avatars] = await Promise.all([
    fetchEngravings(profile.CharacterName),
    fetchGems(profile.CharacterName),
    fetchArkPassive(profile.CharacterName).catch(() => undefined),
    fetchArkGrid(profile.CharacterName),
    fetchCards(profile.CharacterName).catch(() => undefined),
    fetchEquipment(profile.CharacterName).catch(() => EMPTY_EQUIPMENT_ITEMS),
    fetchAvatars(profile.CharacterName).catch(() => EMPTY_AVATAR_ITEMS),
  ]);
  const stoneItem = equipment.find((equipmentItem) => equipmentItem.Type === '어빌리티 스톤');
  const weaponItem = equipment.find((equipmentItem) => equipmentItem.Type === '무기');
  const rawEquipmentMainStat = extractEquipmentMainStat(equipment);
  const avatarMainStatMultiplier = rawEquipmentMainStat !== undefined ? extractAvatarMainStatMultiplier(avatars) : undefined;
  const petMainStatMultiplier = rawEquipmentMainStat !== undefined ? ASSUMED_PET_MAIN_STAT_MULTIPLIER : undefined;
  const displayedMainStatMultiplier = avatarMainStatMultiplier && petMainStatMultiplier
    ? combineAvatarPetMainStatMultiplier(avatarMainStatMultiplier, petMainStatMultiplier)
    : undefined;
  const displayedMainStat = rawEquipmentMainStat !== undefined && displayedMainStatMultiplier
    ? Math.round(rawEquipmentMainStat * displayedMainStatMultiplier)
    : undefined;
  const equip = parseEquipmentList(equipment);
  const accessories = parseAccessoryList(equipment);
  const bracelet = parseBraceletState(equipment.find((equipmentItem) => equipmentItem.Type === '팔찌'));
  const armletPower = ARMLET_POWER_BY_LEVEL[resolveArmletLevel(equip.armlet?.normalLevel ?? 0)];
  const weaponTooltipAttack = extractWeaponAttack(weaponItem);
  const stoneBaseAttackBonusPercent = extractStoneBaseAttackBonusPercent(stoneItem);
  const weaponAttackPercentSum =
    sumAccessoryWeaponAttackPercent(accessories) +
    resolveEnlightenmentKarmaWeaponAttackPercent(arkPassive);
  const effectiveWeaponAttack = composeEffectiveWeaponAttack({
    weaponTooltipAttack,
    flatWeaponAttack:
      sumAccessoryFlatWeaponAttack(accessories) +
      sumBraceletFlatWeaponAttack(bracelet) +
      armletPower.weaponAttack,
    weaponAttackPercentSum,
  });
  const baseAttackPercentSum =
    sumGemBaseAttackPercent(gems.Gems) +
    (stoneBaseAttackBonusPercent ?? ASSUMED_STONE_BASE_ATTACK_PERCENT) +
    armletPower.baseAttackPercent;

  const charStats = {
    W: weaponTooltipAttack,
    baseAttack: parseNumberText(profile.Stats?.find((stat) => stat.Type === '공격력')?.Value),
    pureBaseAttack: extractPureBaseAttack(profile.Stats),
    displayedMainStat,
    avatarMainStatMultiplier,
    petMainStatMultiplier,
    stoneBaseAttackBonusPercent,
    effectiveWeaponAttack,
    weaponAttackPercentSum,
    baseAttackPercentSum,
    combatStats: extractCombatStats(profile.Stats),
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[SpecScore][api-parsed]', {
      characterName: profile.CharacterName,
      combatPower: profile.CombatPower,
      rawEquipmentMainStat,
      displayedMainStatMultiplier,
      charStats,
      equipment: Object.fromEntries(
        Object.entries(equip).map(([slot, item]) => [slot, {
          normalLevel: item.normalLevel,
          advancedLevel: item.advancedLevel,
          tier: item.tier,
          equipmentFamily: item.equipmentFamily,
          isInherited: item.isInherited,
          normalHoningDelta: item.normalHoningDelta,
        }]),
      ),
      accessories,
      bracelet,
    });
  }

  return {
    engravings,
    gems,
    arkPassive,
    arkGrid,
    cards,
    equip,
    accessories,
    stone: parseStoneState(stoneItem),
    bracelet,
    charStats,
  };
};
