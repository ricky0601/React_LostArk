import {
  ARMLET_POWER_BY_LEVEL,
  ARMLET_UNEQUIPPED_LEVEL,
  resolveArmletLevel,
} from './lopecCoefficients';

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

  it('does not guess unsupported armlet levels', () => {
    expect(resolveArmletLevel(16)).toBeNull();
  });
});
