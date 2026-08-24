import {
  ARMLET_LEVELS,
  ARMLET_POWER_BY_LEVEL,
  ARMLET_SELECT_LEVELS,
  ARMLET_UNEQUIPPED_LEVEL,
  resolveArmletCombatLevel,
  resolveArmletLevel,
  resolveArmletPower,
} from './armletEquipmentPowerTables';

describe('armlet combat power coefficients', () => {
  // Source: Lost Ark armlet honing-effect screenshots supplied for GitHub issue #16.
  const expectedRows = [
    [0, 3500, 10500, 0, 0, '영웅'],
    [1, 5350, 10500, 0, 0, '영웅'],
    [2, 5350, 16500, 0, 0, '영웅'],
    [3, 7210, 16500, 0, 0, '영웅'],
    [4, 7210, 22530, 0, 0, '영웅'],
    [5, 7210, 22530, 850, 0, '영웅'],
    [6, 9077, 22530, 850, 0, '영웅'],
    [7, 9077, 28608, 850, 0, '영웅'],
    [8, 10969, 28608, 850, 0, '영웅'],
    [9, 10969, 34746, 850, 0, '영웅'],
    [10, 10969, 34746, 2030, 0, '영웅'],
    [11, 12873, 34746, 2030, 1, '전설'],
    [12, 12873, 40962, 2030, 1, '전설'],
    [13, 14817, 40962, 2030, 1, '전설'],
    [14, 14817, 47268, 2030, 1, '전설'],
    [15, 14817, 47268, 3690, 1, '전설'],
    [16, 16778, 47268, 3690, 2, '유물'],
    [17, 16778, 53682, 3690, 2, '유물'],
    [18, 18794, 53682, 3690, 2, '유물'],
    [19, 18794, 60216, 3690, 2, '유물'],
    [20, 18794, 60216, 5980, 2, '유물'],
    [21, 20832, 60216, 5980, 3, '고대'],
    [22, 20832, 66888, 5980, 3, '고대'],
    [23, 22940, 66888, 5980, 3, '고대'],
    [24, 22940, 73710, 5980, 3, '고대'],
    [25, 22940, 73710, 9050, 3, '고대'],
  ] as const;

  it.each(expectedRows)(
    'keeps exact +%i armlet coefficients',
    (level, weaponAttack, mainStat, baseAttack, baseAttackPercent, grade) => {
      expect(ARMLET_POWER_BY_LEVEL[level]).toEqual({
        weaponAttack,
        mainStat,
        baseAttack,
        baseAttackPercent,
        grade,
      });
    },
  );

  it('exposes every selectable +0 through +25 level exactly once', () => {
    const expectedLevels = Array.from({ length: 26 }, (_, level) => level);

    expect(ARMLET_LEVELS).toEqual(expectedLevels);
    expect(new Set(ARMLET_LEVELS).size).toBe(26);
    expect(ARMLET_SELECT_LEVELS).toEqual([ARMLET_UNEQUIPPED_LEVEL, ...expectedLevels]);
    expect(new Set(ARMLET_SELECT_LEVELS).size).toBe(27);
  });

  it('separates unequipped armlet from equipped +0 armlet', () => {
    expect(ARMLET_POWER_BY_LEVEL[ARMLET_UNEQUIPPED_LEVEL]).toMatchObject({
      weaponAttack: 0,
      mainStat: 0,
      baseAttack: 0,
      baseAttackPercent: 0,
      grade: '미착용',
    });
    expect(ARMLET_POWER_BY_LEVEL[0].weaponAttack).toBe(3500);
  });

  it('does not fall back to a lower coefficient for unsupported values', () => {
    expect(resolveArmletLevel(16.5)).toBeNull();
    expect(resolveArmletCombatLevel(16.5)).toBeNull();
    expect(resolveArmletCombatLevel(26)).toBeNull();
    expect(resolveArmletPower({ normalLevel: 26, grade: '고대' })).toBeNull();
  });

  it.each([
    [10, '영웅', 0],
    [10, '전설', 1],
    [15, '전설', 1],
    [15, '유물', 2],
    [20, '유물', 2],
    [20, '고대', 3],
  ] as const)(
    'resolves +%i %s limit-break base attack percent',
    (normalLevel, grade, baseAttackPercent) => {
      expect(resolveArmletPower({ normalLevel, grade })).toMatchObject({ grade, baseAttackPercent });
    },
  );
});
