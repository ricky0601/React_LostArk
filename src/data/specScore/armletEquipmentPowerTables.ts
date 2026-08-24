export const ARMLET_UNEQUIPPED_LEVEL = -1;

export type EquippedArmletLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25;
export type ArmletLevel = typeof ARMLET_UNEQUIPPED_LEVEL | EquippedArmletLevel;

export const ARMLET_LEVELS: EquippedArmletLevel[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
];
export const ARMLET_SELECT_LEVELS: ArmletLevel[] = [ARMLET_UNEQUIPPED_LEVEL, ...ARMLET_LEVELS];

export interface ArmletPower {
  readonly weaponAttack: number;
  readonly mainStat: number;
  readonly baseAttack: number;
  readonly baseAttackPercent: number;
  readonly grade: string;
}

export interface ArmletPowerInput {
  readonly normalLevel: number | undefined;
  readonly grade: string | undefined;
}

// Source: Lost Ark armlet honing-effect screenshots supplied for GitHub issue #16.
// The +16~+25 cumulative rows use only the displayed exact deltas; no interpolation is used.
// Limit break changes the grade/base-attack effect before the next honing step (+15→+16, +20→+21).
export const ARMLET_POWER_BY_LEVEL: Record<ArmletLevel, ArmletPower> = {
  [-1]: { weaponAttack: 0, mainStat: 0, baseAttack: 0, baseAttackPercent: 0, grade: '미착용' },
  0: { weaponAttack: 3500, mainStat: 10500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅' },
  1: { weaponAttack: 5350, mainStat: 10500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅' },
  2: { weaponAttack: 5350, mainStat: 16500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅' },
  3: { weaponAttack: 7210, mainStat: 16500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅' },
  4: { weaponAttack: 7210, mainStat: 22530, baseAttack: 0, baseAttackPercent: 0, grade: '영웅' },
  5: { weaponAttack: 7210, mainStat: 22530, baseAttack: 850, baseAttackPercent: 0, grade: '영웅' },
  6: { weaponAttack: 9077, mainStat: 22530, baseAttack: 850, baseAttackPercent: 0, grade: '영웅' },
  7: { weaponAttack: 9077, mainStat: 28608, baseAttack: 850, baseAttackPercent: 0, grade: '영웅' },
  8: { weaponAttack: 10969, mainStat: 28608, baseAttack: 850, baseAttackPercent: 0, grade: '영웅' },
  9: { weaponAttack: 10969, mainStat: 34746, baseAttack: 850, baseAttackPercent: 0, grade: '영웅' },
  10: { weaponAttack: 10969, mainStat: 34746, baseAttack: 2030, baseAttackPercent: 0, grade: '영웅' },
  11: { weaponAttack: 12873, mainStat: 34746, baseAttack: 2030, baseAttackPercent: 1.0, grade: '전설' },
  12: { weaponAttack: 12873, mainStat: 40962, baseAttack: 2030, baseAttackPercent: 1.0, grade: '전설' },
  13: { weaponAttack: 14817, mainStat: 40962, baseAttack: 2030, baseAttackPercent: 1.0, grade: '전설' },
  14: { weaponAttack: 14817, mainStat: 47268, baseAttack: 2030, baseAttackPercent: 1.0, grade: '전설' },
  15: { weaponAttack: 14817, mainStat: 47268, baseAttack: 3690, baseAttackPercent: 1.0, grade: '전설' },
  16: { weaponAttack: 16778, mainStat: 47268, baseAttack: 3690, baseAttackPercent: 2.0, grade: '유물' },
  17: { weaponAttack: 16778, mainStat: 53682, baseAttack: 3690, baseAttackPercent: 2.0, grade: '유물' },
  18: { weaponAttack: 18794, mainStat: 53682, baseAttack: 3690, baseAttackPercent: 2.0, grade: '유물' },
  19: { weaponAttack: 18794, mainStat: 60216, baseAttack: 3690, baseAttackPercent: 2.0, grade: '유물' },
  20: { weaponAttack: 18794, mainStat: 60216, baseAttack: 5980, baseAttackPercent: 2.0, grade: '유물' },
  21: { weaponAttack: 20832, mainStat: 60216, baseAttack: 5980, baseAttackPercent: 3.0, grade: '고대' },
  22: { weaponAttack: 20832, mainStat: 66888, baseAttack: 5980, baseAttackPercent: 3.0, grade: '고대' },
  23: { weaponAttack: 22940, mainStat: 66888, baseAttack: 5980, baseAttackPercent: 3.0, grade: '고대' },
  24: { weaponAttack: 22940, mainStat: 73710, baseAttack: 5980, baseAttackPercent: 3.0, grade: '고대' },
  25: { weaponAttack: 22940, mainStat: 73710, baseAttack: 9050, baseAttackPercent: 3.0, grade: '고대' },
};

export const isArmletLevel = (level: number): level is ArmletLevel =>
  level === ARMLET_UNEQUIPPED_LEVEL || ARMLET_LEVELS.some((armletLevel) => armletLevel === level);

export const resolveArmletLevel = (level: number): ArmletLevel | null =>
  isArmletLevel(level) ? level : null;

export const resolveArmletCombatLevel = (level: number): ArmletLevel | null =>
  resolveArmletLevel(level);

export const resolveArmletPower = ({ normalLevel, grade }: ArmletPowerInput): ArmletPower | null => {
  const armletLevel = resolveArmletCombatLevel(normalLevel ?? ARMLET_UNEQUIPPED_LEVEL);
  if (armletLevel === null) return null;
  const power = ARMLET_POWER_BY_LEVEL[armletLevel];
  if (armletLevel === 10 && grade === '전설') {
    return { ...power, baseAttackPercent: 1.0, grade };
  }
  if (armletLevel === 15 && grade === '유물') {
    return { ...power, baseAttackPercent: 2.0, grade };
  }
  if (armletLevel === 20 && grade === '고대') {
    return { ...power, baseAttackPercent: 3.0, grade };
  }
  return power;
};
