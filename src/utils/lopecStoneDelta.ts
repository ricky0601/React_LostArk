import type { ArkPassiveEffect } from '../types/lostark';
import type { CharStats } from './lopecSimulator';

export const hasStone97Bonus = (effects: readonly ArkPassiveEffect[]): boolean => {
  const totalStoneLevel = effects.reduce(
    (sum, effect) => sum + Math.max(0, Math.min(4, effect.AbilityStoneLevel ?? 0)),
    0,
  );
  return totalStoneLevel >= 5;
};

const resolveStone97BaseAttackRatio = (charStats?: CharStats): number => {
  const bonusPercent = charStats?.stoneBaseAttackBonusPercent ?? 0;
  const pureBaseAttack = charStats?.pureBaseAttack ?? 0;
  const totalAttack = charStats?.baseAttack ?? 0;
  if (bonusPercent <= 0 || pureBaseAttack <= 0 || totalAttack <= 0) return 1;

  const bonusMultiplier = 1 + bonusPercent / 100;
  const bonusAttack = pureBaseAttack - pureBaseAttack / bonusMultiplier;
  if (bonusAttack <= 0 || bonusAttack >= totalAttack) return 1;

  return totalAttack / (totalAttack - bonusAttack);
};

export const calcStoneSetBonusDelta = (
  currentEffects: readonly ArkPassiveEffect[],
  modifiedEffects: readonly ArkPassiveEffect[],
  charStats?: CharStats,
): number => {
  const setBonusRatio = resolveStone97BaseAttackRatio(charStats);
  const currentRatio = hasStone97Bonus(currentEffects) ? setBonusRatio : 1;
  const modifiedRatio = hasStone97Bonus(modifiedEffects) ? setBonusRatio : 1;
  return modifiedRatio / currentRatio;
};
