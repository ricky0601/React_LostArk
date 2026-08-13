import { resolveArmletPower } from '../data/specScore/equipmentPowerTables';
import type { EquipSlot } from '../data/specScore/lopecCoefficients';
import { resolveNormalHoningDelta, type EquipmentState } from './equipmentState';
import { invertMainStat } from './lopecBaseAttack';
import type { CharStats } from './lopecSimulator';

interface NormalHoningBaseStatDeltaInput {
  readonly slots: readonly EquipSlot[];
  readonly currentEquip: Partial<Record<EquipSlot, EquipmentState>>;
  readonly modifiedEquip: Partial<Record<EquipSlot, EquipmentState>>;
  readonly charStats: CharStats | undefined;
}

const getArmletPower = (equipment: EquipmentState) =>
  resolveArmletPower({ normalLevel: equipment.normalLevel, grade: equipment.tier });

/**
 * 주스탯 산출 우선순위 (docs/lostark-combat-power-research.md > Serka Equipment Status)
 *   1. 툴팁 역산 — 게임이 합산해 둔 값에서 출발하므로 스탯 소스를 놓치지 않는다.
 *   2. 장비 툴팁 flat 합산 — 툴팁 밖 영구 스탯을 못 봐서 과소 집계된다. deprecated.
 *   3. 0 — 분모를 추측하느니 장비 시뮬레이션을 비활성화한다.
 */
const inferMainStat = (charStats: CharStats): number => {
  const inverted = invertMainStat({
    displayedBaseAttack: charStats.pureBaseAttack ?? 0,
    effectiveWeaponAttack: charStats.effectiveWeaponAttack ?? 0,
    baseAttackFlatSum: charStats.baseAttackFlatSum ?? 0,
    baseAttackPercentSum: charStats.baseAttackPercentSum ?? 0,
  });
  if (inverted > 0) return inverted;
  if (charStats.displayedMainStat !== undefined && charStats.displayedMainStat > 0) {
    return charStats.displayedMainStat;
  }
  return 0;
};

/**
 * 아바타/펫 주스탯 배율은 퍼센트를 먼저 더한 뒤 한 번만 곱한다.
 *   아바타 8% + 펫 목장 1% => x1.09  (x1.08 * x1.01 이 아니다)
 * 표시 주스탯에서 raw 를 되돌릴 때도 이 결합값 하나로 나눈다.
 */
export const combineAvatarPetMainStatMultiplier = (
  avatarMainStatMultiplier: number | undefined,
  petMainStatMultiplier: number | undefined,
): number => 1 + ((avatarMainStatMultiplier ?? 1) - 1) + ((petMainStatMultiplier ?? 1) - 1);

const sumNormalHoningStepDelta = (
  slot: EquipSlot,
  family: EquipmentState['equipmentFamily'],
  fromLevel: number,
  toLevel: number,
): { readonly weaponAttack: number; readonly mainStat: number; readonly baseAttack: number; readonly secondaryStat: number } => {
  if (slot === 'armlet') {
    const from = resolveArmletPower({ normalLevel: fromLevel, grade: undefined });
    const to = resolveArmletPower({ normalLevel: toLevel, grade: undefined });
    if (from === null || to === null) {
      return { weaponAttack: 0, mainStat: 0, baseAttack: 0, secondaryStat: 0 };
    }
    return {
      weaponAttack: to.weaponAttack - from.weaponAttack,
      mainStat: to.mainStat - from.mainStat,
      baseAttack: to.baseAttack - from.baseAttack,
      secondaryStat: 0,
    };
  }

  const sign = toLevel > fromLevel ? 1 : -1;
  const start = Math.min(fromLevel, toLevel) + 1;
  const end = Math.max(fromLevel, toLevel);
  let weaponAttack = 0;
  let mainStat = 0;
  let secondaryStat = 0;

  for (let level = start; level <= end; level++) {
    const delta = resolveNormalHoningDelta(slot, family, level);
    if (delta?.kind === 'weapon') {
      weaponAttack += sign * delta.weaponAttack;
    }
    if (delta?.kind === 'armor') {
      mainStat += sign * delta.stats.mainStat;
      secondaryStat += sign * (
        delta.stats.health +
        (delta.stats.magicDefense ?? 0) +
        (delta.stats.physicalDefense ?? 0)
      );
    }
  }

  return { weaponAttack, mainStat, baseAttack: 0, secondaryStat };
};

/**
 * 일반 재련으로 바뀌는 raw 무공/주스탯 총합. 배율이 적용되지 않은 툴팁 원본 값이다.
 * 증폭은 이 값을 소비하는 쪽에서 각자의 버킷 배율로 처리한다.
 */
export const sumNormalHoningRawDeltas = ({
  slots,
  currentEquip,
  modifiedEquip,
}: Omit<NormalHoningBaseStatDeltaInput, 'charStats'>): {
  readonly weaponAttack: number;
  readonly mainStat: number;
  readonly baseAttack: number;
  readonly baseAttackPercent: number;
} => {
  let weaponAttack = 0;
  let mainStat = 0;
  let baseAttack = 0;
  let baseAttackPercent = 0;
  for (const slot of slots) {
    const cur = currentEquip[slot];
    const mod = modifiedEquip[slot];
    if (!cur || !mod) continue;
    if (cur.normalLevel !== mod.normalLevel) {
      const delta = sumNormalHoningStepDelta(slot, cur.equipmentFamily, cur.normalLevel, mod.normalLevel);
      weaponAttack += delta.weaponAttack;
      mainStat += delta.mainStat;
      baseAttack += delta.baseAttack;
    }
    if (slot === 'armlet') {
      const currentPower = getArmletPower(cur);
      const modifiedPower = getArmletPower(mod);
      if (currentPower !== null && modifiedPower !== null) {
        baseAttackPercent += modifiedPower.baseAttackPercent - currentPower.baseAttackPercent;
      }
    }
  }
  return { weaponAttack, mainStat, baseAttack, baseAttackPercent };
};

export const calcNormalHoningBaseStatDelta = ({
  slots,
  currentEquip,
  modifiedEquip,
  charStats,
}: NormalHoningBaseStatDeltaInput): number => {
  if (!charStats || charStats.W <= 0) return 1;

  const currentMainStat = inferMainStat(charStats);
  if (currentMainStat <= 0) return 1;
  const armorMainStatMultiplier = combineAvatarPetMainStatMultiplier(
    charStats.avatarMainStatMultiplier,
    charStats.petMainStatMultiplier,
  );

  let weaponAttackDelta = 0;
  let rawArmorStatDelta = 0;
  let effectiveArmorStatDelta = 0;
  const slotBreakdown: Array<{
    readonly slot: EquipSlot;
    readonly fromLevel: number;
    readonly toLevel: number;
    readonly equipmentFamily: EquipmentState['equipmentFamily'];
    readonly weaponAttackDelta: number;
    readonly rawMainStatDelta: number;
    readonly effectiveMainStatDelta: number;
  }> = [];

  for (const slot of slots) {
    const cur = currentEquip[slot];
    const mod = modifiedEquip[slot];
    if (!cur || !mod || cur.normalLevel === mod.normalLevel) continue;

    const normalDelta = sumNormalHoningStepDelta(slot, cur.equipmentFamily, cur.normalLevel, mod.normalLevel);
    const effectiveMainStatDelta = normalDelta.mainStat * armorMainStatMultiplier;
    weaponAttackDelta += normalDelta.weaponAttack;
    rawArmorStatDelta += normalDelta.mainStat;
    effectiveArmorStatDelta += effectiveMainStatDelta;
    slotBreakdown.push({
      slot,
      fromLevel: cur.normalLevel,
      toLevel: mod.normalLevel,
      equipmentFamily: cur.equipmentFamily,
      weaponAttackDelta: normalDelta.weaponAttack,
      rawMainStatDelta: normalDelta.mainStat,
      effectiveMainStatDelta,
    });
  }

  // 재련 테이블 무공 델타는 raw 툴팁 값이므로, 주스탯 델타와 마찬가지로
  // 자기 풀에 걸린 배율을 그대로 받는다. 증폭 없이 더하면 weaponAttackPercentSum 만큼 과소평가된다.
  const currentWeaponAttack = charStats.effectiveWeaponAttack ?? charStats.W;
  const weaponAttackAmplifier = 1 + (charStats.weaponAttackPercentSum ?? 0) / 100;
  const nextWeaponAttack = currentWeaponAttack + weaponAttackDelta * weaponAttackAmplifier;
  const nextMainStat = currentMainStat + effectiveArmorStatDelta;
  if (nextWeaponAttack <= 0 || nextMainStat <= 0) return 1;

  const currentBaseAttack = charStats.pureBaseAttack ?? Math.sqrt((currentMainStat * currentWeaponAttack) / 6);
  if (currentBaseAttack <= 0) return 1;
  const rawDeltas = sumNormalHoningRawDeltas({ slots, currentEquip, modifiedEquip });
  const currentBaseAttackFlatSum = charStats.baseAttackFlatSum ?? 0;
  const nextBaseAttackFlatSum = currentBaseAttackFlatSum + rawDeltas.baseAttack;
  const nextBaseAttackPercentSum = (charStats.baseAttackPercentSum ?? 0) + rawDeltas.baseAttackPercent;
  const newBaseAttack = (
    Math.sqrt((nextMainStat * nextWeaponAttack) / 6) + nextBaseAttackFlatSum
  ) * (1 + nextBaseAttackPercentSum / 100);
  const multiplier = newBaseAttack / currentBaseAttack;

  if (process.env.NODE_ENV === 'development' && slotBreakdown.length > 0) {
    console.log('[SpecScore][equipment-normal-honing]', {
      currentMainStat,
      rawArmorStatDelta,
      armorMainStatMultiplier,
      effectiveArmorStatDelta,
      nextMainStat,
      currentWeaponAttack,
      weaponAttackDelta,
      nextWeaponAttack,
      currentBaseAttack,
      newBaseAttack,
      multiplier,
      slotBreakdown,
    });
  }

  return multiplier;
};
