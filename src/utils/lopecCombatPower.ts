import type { ArkGridData, EngravingData, GemData } from '../types/lostark';
import { ARMLET_POWER_BY_LEVEL, ARMLET_UNEQUIPPED_LEVEL, resolveArmletLevel, type EquipSlot } from '../data/specScore/lopecCoefficients';
import type { AccessorySlot } from '../data/specScore/polishOptions';
import type { EquipmentState } from './equipmentState';
import type { AccessoryState, BraceletState } from './polishState';
import type { CharStats } from './lopecSimulator';
import {
  ASSUMED_STONE_BASE_ATTACK_PERCENT,
  composeEffectiveWeaponAttack,
  invertMainStat,
  sumAccessoryFlatWeaponAttack,
  sumAccessoryWeaponAttackPercent,
  sumBraceletFlatWeaponAttack,
  sumGemBaseAttackPercent,
} from './lopecBaseAttack';
import { combineAvatarPetMainStatMultiplier, sumNormalHoningRawDeltas } from './lopecEquipmentDelta';
import {
  calcAdvancedHoningSetDelta,
  calcEngravingSetDelta,
  calcPolishDirectDelta,
} from './lopecSimulator';
import { calcGemPurePowerDelta } from './lopecGemDelta';
import { calcBraceletDelta } from './lopecBraceletDelta';
import { calcArkGridDelta } from './lopecArkGridDelta';
import { hasStone97Bonus } from './lopecStoneDelta';

/**
 * 전투력 절대 재구성.
 * 근거: docs/lostark-combat-power-research.md > Canonical Formula > Two Simulation Modes
 *
 *   combat_power = displayed_base_attack * 0.00288 * PI(direct_factor)
 *
 * 직접 인자는 절대 계수를 전부 알 수 없으므로 현재 전투력에서 배율로 한 번에 뽑고,
 * 기본공격력 계열만 절대값으로 다시 쌓는다. 결과는 비율 모델과 대수적으로 같지만
 * 상수/배율/유효무공/힘민지가 관측 가능한 중간값으로 남는다.
 */

export const COMBAT_POWER_CONSTANT = 288 / 100000;

const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'helmet', 'shoulder', 'armor', 'pants', 'gloves', 'armlet'];

const sumArmletBaseAttackPercent = (
  equipment: Partial<Record<EquipSlot, EquipmentState>> | undefined,
): number => {
  const level = resolveArmletLevel(equipment?.armlet?.normalLevel ?? ARMLET_UNEQUIPPED_LEVEL);
  return level === null ? 0 : ARMLET_POWER_BY_LEVEL[level].baseAttackPercent;
};

const sumArmletWeaponAttack = (
  equipment: Partial<Record<EquipSlot, EquipmentState>> | undefined,
): number => {
  const level = resolveArmletLevel(equipment?.armlet?.normalLevel ?? ARMLET_UNEQUIPPED_LEVEL);
  return level === null ? 0 : ARMLET_POWER_BY_LEVEL[level].weaponAttack;
};

export interface BaseAttackSnapshot {
  readonly effectiveWeaponAttack: number;
  readonly mainStat: number;
  readonly weaponAttackPercentSum: number;
  readonly baseAttackFlatSum: number;
  readonly baseAttackPercentSum: number;
  readonly displayedBaseAttack: number;
  /** displayed_base_attack * 288 / 100000 */
  readonly combatPowerConstant: number;
}

export interface CombatPowerBreakdown {
  readonly current: BaseAttackSnapshot;
  readonly simulated: BaseAttackSnapshot;
  /** 현재 전투력에서 역산한 직접 인자 총곱 */
  readonly factorProduct: number;
  /** 시뮬레이션으로 바뀐 직접 인자들의 비율 */
  readonly directFactorRatio: number;
  readonly simulatedCombatPower: number;
}

export interface CombatPowerInput {
  readonly currentCombatPower: number;
  readonly charStats: CharStats;
  readonly currentGems: GemData;
  readonly modifiedGems: GemData;
  readonly currentEquip?: Partial<Record<EquipSlot, EquipmentState>>;
  readonly modifiedEquip?: Partial<Record<EquipSlot, EquipmentState>>;
  readonly currentAccessories?: Partial<Record<AccessorySlot, AccessoryState>>;
  readonly modifiedAccessories?: Partial<Record<AccessorySlot, AccessoryState>>;
  readonly currentEng: EngravingData;
  readonly modifiedEng: EngravingData;
  readonly currentArkGrid?: ArkGridData | null;
  readonly modifiedArkGrid?: ArkGridData | null;
  readonly currentBracelet?: BraceletState | null;
  readonly modifiedBracelet?: BraceletState | null;
}

const resolveDisplayedBaseAttack = (
  mainStat: number,
  effectiveWeaponAttack: number,
  baseAttackFlatSum: number,
  baseAttackPercentSum: number,
): number =>
  (Math.sqrt((mainStat * effectiveWeaponAttack) / 6) + baseAttackFlatSum) * (1 + baseAttackPercentSum / 100);

/**
 * 시뮬레이션 후의 기본 공격력% 버킷 합 = T4 보석 기여분 + 어빌리티 스톤 몫.
 *
 * 보석 몫은 수정된 세트에서 절대값으로 다시 쌓는다. 증분 누적과 달리 중간 상태가
 * 남지 않아, 보석을 여러 번 바꿔도 오차가 누적되지 않는다.
 *
 * 스톤 몫은 현재 파싱값(툴팁 %, 실패 시 1.5 폴백)을 보존하되, 수정된 스톤 레벨이
 * 세트 보너스 임계치 아래로 내려가면 끈다. 시뮬레이터가 스톤 변경을 이 버킷에
 * 반영할 수 있는 유일한 경로다.
 */
const resolveSimulatedBaseAttackPercentSum = (
  current: BaseAttackSnapshot,
  input: CombatPowerInput,
): number => {
  const currentGemShare = sumGemBaseAttackPercent(input.currentGems.Gems ?? []);
  const currentArmletShare = sumArmletBaseAttackPercent(input.currentEquip);
  const modifiedArmletShare = sumArmletBaseAttackPercent(input.modifiedEquip);
  const stoneShare = Math.max(0, current.baseAttackPercentSum - currentGemShare - currentArmletShare);

  // 절대 상태가 아니라 변화로 판정한다. 양쪽이 같으면 파싱된 현재 몫을 그대로 보존해야
  // 각인 정보가 없는 호출에서 스톤 몫이 사라지지 않는다.
  const currentHasBonus = hasStone97Bonus(input.currentEng.ArkPassiveEffects ?? []);
  const modifiedHasBonus = hasStone97Bonus(input.modifiedEng.ArkPassiveEffects ?? []);
  const nextStoneShare = currentHasBonus === modifiedHasBonus
    ? stoneShare
    : (modifiedHasBonus ? stoneShare || ASSUMED_STONE_BASE_ATTACK_PERCENT : 0);

  return sumGemBaseAttackPercent(input.modifiedGems.Gems ?? []) + nextStoneShare + modifiedArmletShare;
};

const buildCurrentSnapshot = (charStats: CharStats): BaseAttackSnapshot => {
  const weaponAttackPercentSum = charStats.weaponAttackPercentSum ?? 0;
  const baseAttackFlatSum = charStats.baseAttackFlatSum ?? 0;
  const baseAttackPercentSum = charStats.baseAttackPercentSum ?? 0;
  const displayedBaseAttack = charStats.pureBaseAttack ?? 0;
  const effectiveWeaponAttack = charStats.effectiveWeaponAttack ?? charStats.W;

  return {
    effectiveWeaponAttack,
    mainStat: invertMainStat({ displayedBaseAttack, effectiveWeaponAttack, baseAttackFlatSum, baseAttackPercentSum }),
    weaponAttackPercentSum,
    baseAttackFlatSum,
    baseAttackPercentSum,
    displayedBaseAttack,
    combatPowerConstant: displayedBaseAttack * COMBAT_POWER_CONSTANT,
  };
};

const sumPolishWeaponAttackPercentDelta = (
  current: Partial<Record<AccessorySlot, AccessoryState>> | undefined,
  modified: Partial<Record<AccessorySlot, AccessoryState>> | undefined,
): { readonly percent: number; readonly flat: number } => {
  if (!current || !modified) return { percent: 0, flat: 0 };
  return {
    percent: sumAccessoryWeaponAttackPercent(modified) - sumAccessoryWeaponAttackPercent(current),
    flat: sumAccessoryFlatWeaponAttack(modified) - sumAccessoryFlatWeaponAttack(current),
  };
};

const buildSimulatedSnapshot = (
  current: BaseAttackSnapshot,
  input: CombatPowerInput,
): BaseAttackSnapshot => {
  const { charStats, currentEquip, modifiedEquip } = input;

  const rawDeltas = currentEquip && modifiedEquip
    ? sumNormalHoningRawDeltas({ slots: EQUIP_SLOTS, currentEquip, modifiedEquip })
    : { weaponAttack: 0, mainStat: 0, baseAttack: 0, baseAttackPercent: 0 };

  const mainStatMultiplier = combineAvatarPetMainStatMultiplier(
    charStats.avatarMainStatMultiplier,
    charStats.petMainStatMultiplier,
  );
  const nextMainStat = current.mainStat + rawDeltas.mainStat * mainStatMultiplier;

  const polishDelta = sumPolishWeaponAttackPercentDelta(
    input.currentAccessories,
    input.modifiedAccessories,
  );
  const nextWeaponAttackPercentSum = current.weaponAttackPercentSum + polishDelta.percent;
  const nextBaseAttackFlatSum = current.baseAttackFlatSum + rawDeltas.baseAttack;
  const nextWeaponTooltipAttack = charStats.W + rawDeltas.weaponAttack;
  const nextEffectiveWeaponAttack = composeEffectiveWeaponAttack({
    weaponTooltipAttack: nextWeaponTooltipAttack,
    flatWeaponAttack:
      sumAccessoryFlatWeaponAttack(input.currentAccessories) +
      sumArmletWeaponAttack(input.currentEquip) +
      polishDelta.flat +
      sumBraceletFlatWeaponAttack(input.modifiedBracelet),
    weaponAttackPercentSum: nextWeaponAttackPercentSum,
  });

  const nextBaseAttackPercentSum = resolveSimulatedBaseAttackPercentSum(current, input);

  const displayedBaseAttack = resolveDisplayedBaseAttack(
    nextMainStat,
    nextEffectiveWeaponAttack,
    nextBaseAttackFlatSum,
    nextBaseAttackPercentSum,
  );

  return {
    effectiveWeaponAttack: nextEffectiveWeaponAttack,
    mainStat: nextMainStat,
    weaponAttackPercentSum: nextWeaponAttackPercentSum,
    baseAttackFlatSum: nextBaseAttackFlatSum,
    baseAttackPercentSum: nextBaseAttackPercentSum,
    displayedBaseAttack,
    combatPowerConstant: displayedBaseAttack * COMBAT_POWER_CONSTANT,
  };
};

/**
 * 직접 인자 변화 비율. 절대 계수를 모르는 항목들이라 상대 비교로만 다룬다.
 * 기본공격력 계열(일반 재련, 연마 무기 공격력, 보석 기본공%, 스톤 세트)은 제외한다.
 */
const calcDirectFactorRatio = (input: CombatPowerInput): number => {
  const advancedHoning = input.currentEquip && input.modifiedEquip
    ? calcAdvancedHoningSetDelta(EQUIP_SLOTS, input.currentEquip, input.modifiedEquip)
    : 1;

  return calcEngravingSetDelta(input.currentEng, input.modifiedEng)
    * calcGemPurePowerDelta(input.currentGems.Gems ?? [], input.modifiedGems.Gems ?? [])
    * advancedHoning
    * calcPolishDirectDelta(input.currentAccessories, input.modifiedAccessories)
    * calcBraceletDelta(input.currentBracelet, input.modifiedBracelet, input.charStats.combatStats)
    * calcArkGridDelta(input.currentArkGrid, input.modifiedArkGrid);
};

/**
 * 7단계 절대 재구성. 중간값을 모두 노출한다.
 *   1. 상수 = 표시 기본공격력 x 0.00288
 *   2. 배율 = 현재 전투력 / 상수
 *   3~5. 유효 무공 -> 힘민지 역산 -> 시뮬 변화 반영 -> 새 표시 기본공격력
 *   6. 배율 x 직접 인자 변화
 *   7. 새 상수 x 조정된 배율
 */
export const calcCombatPowerBreakdown = (input: CombatPowerInput): CombatPowerBreakdown | null => {
  const current = buildCurrentSnapshot(input.charStats);
  if (current.combatPowerConstant <= 0 || current.mainStat <= 0) return null;

  const factorProduct = input.currentCombatPower / current.combatPowerConstant;
  const simulated = buildSimulatedSnapshot(current, input);
  const directFactorRatio = calcDirectFactorRatio(input);

  return {
    current,
    simulated,
    factorProduct,
    directFactorRatio,
    simulatedCombatPower: simulated.combatPowerConstant * factorProduct * directFactorRatio,
  };
};
