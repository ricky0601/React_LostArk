import type { CombatStats } from './lopecSimulator';
import type { BraceletState } from './polishState';

const resolveBraceletOptionRatio = (
  opt: BraceletState['options'][number],
): number => 1 + opt.combatPowerIncreasePercent / 100;

const sumBraceletCombatStats = (bracelet: BraceletState): number =>
  bracelet.stats.reduce((sum, stat) => {
    if (stat.type !== '치명' && stat.type !== '특화' && stat.type !== '신속') return sum;
    return sum + stat.value;
  }, 0);

const sumCharacterCombatStats = (combatStats: CombatStats): number =>
  combatStats.crit + combatStats.specialization + combatStats.swiftness;

const resolveCombatStatRatio = (statSum: number): number => 1 + (statSum * 0.03) / 100;

const calcCombatStatDelta = (
  currentBracelet: BraceletState,
  modifiedBracelet: BraceletState,
  combatStats?: CombatStats,
): number => {
  const currentBraceletStatSum = sumBraceletCombatStats(currentBracelet);
  const modifiedBraceletStatSum = sumBraceletCombatStats(modifiedBracelet);
  const currentTotalStatSum = combatStats
    ? sumCharacterCombatStats(combatStats)
    : currentBraceletStatSum;
  const modifiedTotalStatSum = currentTotalStatSum - currentBraceletStatSum + modifiedBraceletStatSum;

  return resolveCombatStatRatio(modifiedTotalStatSum) / resolveCombatStatRatio(currentTotalStatSum);
};

export const calcBraceletDelta = (
  currentBracelet: BraceletState | null | undefined,
  modifiedBracelet: BraceletState | null | undefined,
  combatStats?: CombatStats,
): number => {
  if (!currentBracelet || !modifiedBracelet) return 1;

  let multiplier = calcCombatStatDelta(currentBracelet, modifiedBracelet, combatStats);
  for (let index = 0; index < currentBracelet.options.length; index++) {
    const curOpt = currentBracelet.options[index];
    const modOpt = modifiedBracelet.options[index];
    if (!curOpt || !modOpt || curOpt.label === modOpt.label) continue;

    const curRatio = resolveBraceletOptionRatio(curOpt);
    const modRatio = resolveBraceletOptionRatio(modOpt);
    if (curRatio > 0) multiplier *= modRatio / curRatio;
  }
  return multiplier;
};
