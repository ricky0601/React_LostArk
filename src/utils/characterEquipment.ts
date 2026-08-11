import type { EquipmentItem } from '../types/lostark';

export const COMBAT_EQUIPMENT_TYPES: readonly string[] = ['무기', '완갑', '투구', '어깨', '상의', '하의', '장갑'];

const findCombatEquipmentOrder = (item: EquipmentItem): number =>
  COMBAT_EQUIPMENT_TYPES.findIndex((type) => item.Type.includes(type));

export const isCombatEquipment = (item: EquipmentItem): boolean => findCombatEquipmentOrder(item) !== -1;

export const getCombatEquipmentItems = (items: readonly EquipmentItem[]): EquipmentItem[] =>
  items
    .filter(isCombatEquipment)
    .sort((left, right) => findCombatEquipmentOrder(left) - findCombatEquipmentOrder(right));
