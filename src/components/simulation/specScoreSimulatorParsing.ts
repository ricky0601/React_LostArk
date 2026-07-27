import type { CharacterProfile, EquipmentItem } from '../../types/lostark';
import { fetchArkGrid, fetchArkPassive, fetchCards, fetchEngravings, fetchEquipment, fetchGems } from '../../utils/api';
import { parseEquipmentList } from '../../utils/equipmentState';
import { parseAccessoryList, parseBraceletState, parseStoneState } from '../../utils/polishState';
import type { SpecScoreRawData } from './specScoreSimulatorTypes';

const EMPTY_EQUIPMENT_ITEMS: EquipmentItem[] = [];

export const parseNumberText = (value: string | undefined): number =>
  Number(String(value ?? '0').replace(/,/g, '')) || 0;

const stripTooltipText = (value: string): string =>
  value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

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
  const [engravings, gems, arkPassive, arkGrid, cards, equipment] = await Promise.all([
    fetchEngravings(profile.CharacterName),
    fetchGems(profile.CharacterName),
    fetchArkPassive(profile.CharacterName).catch(() => undefined),
    fetchArkGrid(profile.CharacterName),
    fetchCards(profile.CharacterName).catch(() => undefined),
    fetchEquipment(profile.CharacterName).catch(() => EMPTY_EQUIPMENT_ITEMS),
  ]);
  const stoneItem = equipment.find((equipmentItem) => equipmentItem.Type === '어빌리티 스톤');
  const weaponItem = equipment.find((equipmentItem) => equipmentItem.Type === '무기');

  return {
    engravings,
    gems,
    arkPassive,
    arkGrid,
    cards,
    equip: parseEquipmentList(equipment),
    accessories: parseAccessoryList(equipment),
    stone: parseStoneState(stoneItem),
    bracelet: parseBraceletState(equipment.find((equipmentItem) => equipmentItem.Type === '팔찌')),
    charStats: {
      W: extractWeaponAttack(weaponItem),
      baseAttack: parseNumberText(profile.Stats?.find((stat) => stat.Type === '공격력')?.Value),
      pureBaseAttack: extractPureBaseAttack(profile.Stats),
      stoneBaseAttackBonusPercent: extractStoneBaseAttackBonusPercent(stoneItem),
      combatStats: extractCombatStats(profile.Stats),
    },
  };
};
