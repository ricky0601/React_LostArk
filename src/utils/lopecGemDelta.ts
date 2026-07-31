import {
  LOPEC_GEM_PURE_POWER_BY_TIER,
  LOPEC_T4_GEM_BASE_ATTACK_BY_LEVEL,
} from '../data/specScore/lopecCoefficients';
import { classifyGem } from '../data/specScore/gems';
import type { GemItem } from '../types/lostark';

export interface GemBaseAttackStats {
  readonly stoneBaseAttackBonusPercent?: number;
}

const gemPurePowerPercent = (gem: GemItem): number => {
  const { tier } = classifyGem(gem.Name, gem.Tooltip);
  return LOPEC_GEM_PURE_POWER_BY_TIER[tier][gem.Level] ?? 0;
};

const gemBaseAttackPercent = (gem: GemItem): number => {
  const { tier } = classifyGem(gem.Name, gem.Tooltip);
  if (tier !== 'T4') return 0;
  return LOPEC_T4_GEM_BASE_ATTACK_BY_LEVEL[gem.Level] ?? 0;
};

/**
 * 보석의 순수 전투력 배율만. 기본 공격력% 는 기본공격력 계열이라 여기서 제외한다.
 * 절대 재구성 경로에서는 이 값만 직접 인자로 쓰고, 기본공% 는 버킷 합으로 다시 계산한다.
 */
export const calcGemPurePowerDelta = (
  currentGems: GemItem[],
  modifiedGems: GemItem[],
): number => {
  let pureMultiplier = 1.0;
  for (const currentGem of currentGems) {
    const modifiedGem = modifiedGems.find((gem) => gem.Slot === currentGem.Slot);
    if (!modifiedGem) continue;
    pureMultiplier *=
      (1 + gemPurePowerPercent(modifiedGem) / 100) /
      (1 + gemPurePowerPercent(currentGem) / 100);
  }
  return pureMultiplier;
};

export const calcGemSetDelta = (
  currentGems: GemItem[],
  modifiedGems: GemItem[],
  stats?: GemBaseAttackStats,
): number => {
  let pureMultiplier = 1.0;
  let currentBaseAttack = 0;
  let modifiedBaseAttack = 0;
  const existingBaseAttack = stats?.stoneBaseAttackBonusPercent ?? 0;

  for (const currentGem of currentGems) {
    const modifiedGem = modifiedGems.find((gem) => gem.Slot === currentGem.Slot);
    if (!modifiedGem) continue;

    pureMultiplier *=
      (1 + gemPurePowerPercent(modifiedGem) / 100) /
      (1 + gemPurePowerPercent(currentGem) / 100);
    currentBaseAttack += gemBaseAttackPercent(currentGem);
    modifiedBaseAttack += gemBaseAttackPercent(modifiedGem);
  }

  const baseAttackMultiplier =
    (1 + (modifiedBaseAttack + existingBaseAttack) / 100) /
    (1 + (currentBaseAttack + existingBaseAttack) / 100);
  return pureMultiplier * baseAttackMultiplier;
};
