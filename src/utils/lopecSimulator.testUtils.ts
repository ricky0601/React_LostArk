import type { EquipSlot } from '../data/specScore/lopecCoefficients';
import { findPolishOption, type AccessorySlot } from '../data/specScore/polishOptions';
import type { ArkPassiveEffect, EngravingData, GemData, GemItem } from '../types/lostark';
import type { EquipmentState } from './equipmentState';
import type { AccessoryState } from './polishState';

export const effect = (
  Name: string,
  AbilityStoneLevel: number | null,
  Level = 0,
): ArkPassiveEffect => ({
  AbilityStoneLevel,
  Grade: '유물',
  Level,
  Name,
  Description: '',
});

export const engravings = (effects: ArkPassiveEffect[]): EngravingData => ({
  Engravings: [],
  Effects: [],
  ArkPassiveEffects: effects,
});

export const emptyGems: GemData = { Gems: [], Effects: null };

export const gem = (Slot: number, Level: number, Name = '겁화'): GemItem => ({
  Slot,
  Name,
  Icon: '',
  Level,
  Grade: '겁화',
  Tooltip: '',
});

export const gems = (items: GemItem[]): GemData => ({ Gems: items, Effects: null });

export const equipment = (
  slot: EquipSlot,
  patch: Partial<EquipmentState> = {},
): EquipmentState => ({
  slot,
  normalLevel: 10,
  advancedLevel: 0,
  tier: '고대',
  equipmentFamily: 'egir',
  isInherited: false,
  raw: {
    Type: '투구',
    Name: '+10 테스트 장비',
    Icon: '',
    Grade: '고대',
    Tooltip: '{}',
  },
  ...patch,
});

export const baseAttackFor = (weaponAttack: number, mainStat: number): number =>
  Math.sqrt((weaponAttack * mainStat) / 6);

const polishOption = (label: string) => {
  const option = findPolishOption(label);
  if (!option) throw new Error(`Missing polish option fixture: ${label}`);
  return option;
};

export const accessory = (
  slot: AccessorySlot,
  labels: [string, string, string],
): AccessoryState => ({
  slot,
  grade: '고대',
  polishOptions: [polishOption(labels[0]), polishOption(labels[1]), polishOption(labels[2])],
  raw: {
    Type: '목걸이',
    Name: '테스트 장신구',
    Icon: '',
    Grade: '고대',
    Tooltip: '{}',
  },
});
