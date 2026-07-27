import type { EquipSlot } from './lopecCoefficients';

export type StatDelta = {
  readonly health: number;
  readonly mainStat: number;
  readonly magicDefense?: number;
  readonly physicalDefense?: number;
};

export type ArmorStatDeltaByLevel = Partial<Record<EquipSlot, Record<number, StatDelta>>>;
