import type { AccessorySlot, BraceletStatOption } from '../../data/specScore/polishOptions';
import type { EquipSlot } from '../../data/specScore/lopecCoefficients';
import type { ArkGridData, ArkPassiveData, CardData, EngravingData, GemData } from '../../types/lostark';
import type { EquipmentState, EquipmentTier } from '../../utils/equipmentState';
import type { AccessoryState, BraceletState, StoneState } from '../../utils/polishState';
import type { CharStats } from '../../utils/lopecSimulator';
import type { ArkGridCoreMod } from './arkGridSimulatorState';

export type GemMod = { Level?: number; Tooltip?: string };
export type EngMod = { Name?: string; Level?: number; AbilityStoneLevel?: number | null };
export type AwakeningMod = { Level?: number };
export type EquipMod = { normalLevel?: number; advancedLevel?: number; tier?: EquipmentTier };
export type PolishMod = { polishOptions?: [string, string, string] };
export type PolishOptionLabels = [string, string, string];
export type BraceletMod = {
  stats?: [BraceletStatOption, BraceletStatOption, BraceletStatOption, BraceletStatOption];
  options?: [string, string, string, string];
};
export type StoneSlotMod = { name?: string; level?: number };

export interface Mods {
  gems: Record<number, GemMod>;
  engs: Record<string, EngMod>;
  awakenings: Record<string, AwakeningMod>;
  equip: Partial<Record<EquipSlot, EquipMod>>;
  polish: Partial<Record<AccessorySlot, PolishMod>>;
  bracelet?: BraceletMod;
  stone: Record<number, StoneSlotMod>;
  arkGrid: Record<number, ArkGridCoreMod>;
}

export interface SpecScoreRawData {
  readonly engravings: EngravingData;
  readonly gems: GemData;
  readonly arkPassive?: ArkPassiveData;
  readonly arkGrid: ArkGridData | null;
  readonly cards?: CardData;
  readonly equip: Partial<Record<EquipSlot, EquipmentState>>;
  readonly accessories: Partial<Record<AccessorySlot, AccessoryState>>;
  readonly stone: StoneState | null;
  readonly bracelet: BraceletState | null;
  readonly charStats: CharStats;
}

export interface ModifiedSpecScoreData {
  readonly engravings: EngravingData;
  readonly gems: GemData;
  readonly arkPassive?: ArkPassiveData;
  readonly arkGrid: ArkGridData | null;
  readonly cards?: CardData;
  readonly equip: Partial<Record<EquipSlot, EquipmentState>>;
  readonly accessories: Partial<Record<AccessorySlot, AccessoryState>>;
  readonly bracelet: BraceletState | null;
}

export type ActiveCategory = 'all' | 'core' | 'gear' | 'accessories' | 'systems';

export interface ScoreSimulation {
  readonly current: number;
  readonly simulated: number;
  readonly delta: number;
}

export interface SpecScoreCategory {
  readonly id: ActiveCategory;
  readonly label: string;
  readonly count?: number;
  readonly countLabel?: string;
  readonly changedCount?: number;
  readonly summaryLabel?: string;
}
