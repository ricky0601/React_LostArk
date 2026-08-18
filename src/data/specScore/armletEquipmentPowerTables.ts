export const ARMLET_UNEQUIPPED_LEVEL = -1;

export type EquippedArmletLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 20 | 25;
export type ArmletLevel = typeof ARMLET_UNEQUIPPED_LEVEL | EquippedArmletLevel;

export const ARMLET_LEVELS: EquippedArmletLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25];
export const ARMLET_SELECT_LEVELS: ArmletLevel[] = [ARMLET_UNEQUIPPED_LEVEL, ...ARMLET_LEVELS];

export interface ArmletPower {
  readonly weaponAttack: number;
  readonly mainStat: number;
  readonly baseAttack: number;
  readonly baseAttackPercent: number;
  readonly grade: string;
  readonly icon: string;
}

export interface ArmletPowerInput {
  readonly normalLevel: number | undefined;
  readonly grade: string | undefined;
}

export const ARMLET_POWER_BY_LEVEL: Record<ArmletLevel, ArmletPower> = {
  [-1]: { weaponAttack: 0, mainStat: 0, baseAttack: 0, baseAttackPercent: 0, grade: '미착용', icon: '/images/arms1.webp' },
  0: { weaponAttack: 3500, mainStat: 10500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  1: { weaponAttack: 5350, mainStat: 10500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  2: { weaponAttack: 5350, mainStat: 16500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  3: { weaponAttack: 7210, mainStat: 16500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  4: { weaponAttack: 7210, mainStat: 22530, baseAttack: 0, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  5: { weaponAttack: 7210, mainStat: 22530, baseAttack: 850, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  6: { weaponAttack: 9077, mainStat: 22530, baseAttack: 850, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  7: { weaponAttack: 9077, mainStat: 28608, baseAttack: 850, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  8: { weaponAttack: 10969, mainStat: 28608, baseAttack: 850, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  9: { weaponAttack: 10969, mainStat: 34746, baseAttack: 850, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  10: { weaponAttack: 10969, mainStat: 34746, baseAttack: 2030, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  11: { weaponAttack: 12873, mainStat: 34746, baseAttack: 2030, baseAttackPercent: 1.0, grade: '전설', icon: '/images/arms2.webp' },
  12: { weaponAttack: 12873, mainStat: 40962, baseAttack: 2030, baseAttackPercent: 1.0, grade: '전설', icon: '/images/arms2.webp' },
  13: { weaponAttack: 14817, mainStat: 40962, baseAttack: 2030, baseAttackPercent: 1.0, grade: '전설', icon: '/images/arms2.webp' },
  14: { weaponAttack: 14817, mainStat: 47268, baseAttack: 2030, baseAttackPercent: 1.0, grade: '전설', icon: '/images/arms2.webp' },
  15: { weaponAttack: 14817, mainStat: 47268, baseAttack: 3690, baseAttackPercent: 1.0, grade: '전설', icon: '/images/arms2.webp' },
  20: { weaponAttack: 18794, mainStat: 60216, baseAttack: 5980, baseAttackPercent: 2.0, grade: '유물', icon: '/images/arms3.webp' },
  25: { weaponAttack: 22940, mainStat: 73710, baseAttack: 9050, baseAttackPercent: 3.0, grade: '고대', icon: '/images/arms4.webp' },
};

export const isArmletLevel = (level: number): level is ArmletLevel =>
  level === ARMLET_UNEQUIPPED_LEVEL || ARMLET_LEVELS.some((armletLevel) => armletLevel === level);

export const resolveArmletLevel = (level: number): ArmletLevel | null =>
  isArmletLevel(level) ? level : null;

export const resolveArmletCombatLevel = (level: number): ArmletLevel | null => {
  const exactLevel = resolveArmletLevel(level);
  if (exactLevel !== null) return exactLevel;

  for (let index = ARMLET_LEVELS.length - 1; index >= 0; index -= 1) {
    const supportedLevel = ARMLET_LEVELS[index];
    if (supportedLevel !== undefined && supportedLevel <= level) return supportedLevel;
  }

  return null;
};

export const resolveArmletPower = ({ normalLevel, grade }: ArmletPowerInput): ArmletPower | null => {
  const armletLevel = resolveArmletCombatLevel(normalLevel ?? ARMLET_UNEQUIPPED_LEVEL);
  if (armletLevel === null) return null;
  const power = ARMLET_POWER_BY_LEVEL[armletLevel];
  if (armletLevel === 10 && grade === '전설') {
    return { ...power, baseAttackPercent: 1.0, grade, icon: '/images/arms2.webp' };
  }
  if (armletLevel === 15 && grade === '유물') {
    return { ...power, baseAttackPercent: 2.0, grade, icon: '/images/arms3.webp' };
  }
  if (armletLevel === 20 && grade === '고대') {
    return { ...power, baseAttackPercent: 3.0, grade, icon: '/images/arms4.webp' };
  }
  return power;
};
