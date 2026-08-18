import {
  ARMLET_POWER_BY_LEVEL,
  ARMLET_UNEQUIPPED_LEVEL,
  resolveArmletCombatLevel,
  resolveArmletLevel,
  resolveArmletPower,
} from './armletEquipmentPowerTables';

describe('armlet combat power coefficients', () => {
  it('separates unequipped armlet from equipped +0 armlet', () => {
    expect(ARMLET_POWER_BY_LEVEL[ARMLET_UNEQUIPPED_LEVEL]).toMatchObject({
      weaponAttack: 0,
      mainStat: 0,
      baseAttack: 0,
      baseAttackPercent: 0,
      grade: '미착용',
    });
    expect(ARMLET_POWER_BY_LEVEL[0]).toMatchObject({
      weaponAttack: 3500,
      mainStat: 10500,
      baseAttack: 0,
      baseAttackPercent: 0,
      grade: '영웅',
    });
  });

  it('keeps exact known +0 through +10 armlet values', () => {
    const expected = [
      [0, 3500, 10500, 0],
      [1, 5350, 10500, 0],
      [2, 5350, 16500, 0],
      [3, 7210, 16500, 0],
      [4, 7210, 22530, 0],
      [5, 7210, 22530, 850],
      [6, 9077, 22530, 850],
      [7, 9077, 28608, 850],
      [8, 10969, 28608, 850],
      [9, 10969, 34746, 850],
      [10, 10969, 34746, 2030],
    ] as const;

    for (const [level, weaponAttack, mainStat, baseAttack] of expected) {
      expect(ARMLET_POWER_BY_LEVEL[level]).toMatchObject({
        weaponAttack,
        mainStat,
        baseAttack,
        baseAttackPercent: 0,
      });
    }
  });

  it('keeps known +11 through +15 armlet power rows', () => {
    // Given / When / Then
    expect(ARMLET_POWER_BY_LEVEL[11]).toMatchObject({
      weaponAttack: 12873,
      mainStat: 34746,
      baseAttack: 2030,
      baseAttackPercent: 1.0,
      grade: '전설',
    });
    expect(ARMLET_POWER_BY_LEVEL[12]).toMatchObject({
      weaponAttack: 12873,
      mainStat: 40962,
      baseAttack: 2030,
      baseAttackPercent: 1.0,
      grade: '전설',
    });
    expect(ARMLET_POWER_BY_LEVEL[13]).toMatchObject({
      weaponAttack: 14817,
      mainStat: 40962,
      baseAttack: 2030,
      baseAttackPercent: 1.0,
      grade: '전설',
    });
    expect(ARMLET_POWER_BY_LEVEL[14]).toMatchObject({
      weaponAttack: 14817,
      mainStat: 47268,
      baseAttack: 2030,
      baseAttackPercent: 1.0,
      grade: '전설',
    });
    expect(ARMLET_POWER_BY_LEVEL[15]).toMatchObject({
      weaponAttack: 14817,
      mainStat: 47268,
      baseAttack: 3690,
      baseAttackPercent: 1.0,
      grade: '전설',
    });
  });

  it('keeps UI validation strict for unsupported armlet levels', () => {
    // Given / When / Then
    expect(resolveArmletLevel(16)).toBeNull();
  });

  it('uses grade to distinguish boundary level base attack percent', () => {
    // Given / When / Then
    expect(resolveArmletPower({ normalLevel: 10, grade: '영웅' })).toMatchObject({
      baseAttackPercent: 0,
      grade: '영웅',
    });
    expect(resolveArmletPower({ normalLevel: 10, grade: '전설' })).toMatchObject({
      baseAttackPercent: 1.0,
      grade: '전설',
    });
    expect(resolveArmletPower({ normalLevel: 15, grade: '전설' })).toMatchObject({
      baseAttackPercent: 1.0,
      grade: '전설',
    });
    expect(resolveArmletPower({ normalLevel: 15, grade: '유물' })).toMatchObject({
      baseAttackPercent: 2.0,
      grade: '유물',
    });
    expect(resolveArmletPower({ normalLevel: 20, grade: '유물' })).toMatchObject({
      baseAttackPercent: 2.0,
      grade: '유물',
    });
    expect(resolveArmletPower({ normalLevel: 20, grade: '고대' })).toMatchObject({
      baseAttackPercent: 3.0,
      grade: '고대',
    });
  });

  it('uses the nearest supported lower level for combat scoring', () => {
    // Given / When / Then
    expect(resolveArmletCombatLevel(11)).toBe(11);
    expect(resolveArmletCombatLevel(12)).toBe(12);
    expect(resolveArmletCombatLevel(13)).toBe(13);
    expect(resolveArmletCombatLevel(14)).toBe(14);
    expect(resolveArmletCombatLevel(18)).toBe(15);
    expect(resolveArmletCombatLevel(23)).toBe(20);
  });
});
