import { calcLopecDelta } from './lopecSimulator';
import { charStatsFor, emptyGems, engravings, equipment } from './lopecSimulator.testUtils';

describe('calcLopecDelta inherited equipment advanced changes', () => {
  it('ignores advanced refining deltas for inherited equipment even when a mod exists', () => {
    const currentScore = 100_000;
    const current = equipment('helmet', { isInherited: true, advancedLevel: 0 });
    const modified = { ...current, advancedLevel: 40 };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { helmet: current },
      { helmet: modified },
    );

    expect(result).toBeCloseTo(currentScore, 6);
  });

  it('still applies advanced refining deltas for non-inherited equipment', () => {
    const currentScore = 100_000;
    const current = equipment('helmet', { isInherited: false, advancedLevel: 0 });
    const modified = { ...current, advancedLevel: 40 };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { helmet: current },
      { helmet: modified },
    );

    expect(result).toBeGreaterThan(currentScore);
  });

  it('keeps normal enhancement simulation working for inherited equipment', () => {
    const currentScore = 100_000;
    const weaponAttack = 135_527;
    const mainStat = 892_890;
    const current = equipment('helmet', {
      isInherited: true,
      equipmentFamily: 'serka',
      normalLevel: 10,
      advancedLevel: 0,
    });
    const modified = { ...current, normalLevel: 11, advancedLevel: 40 };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { helmet: current },
      { helmet: modified },
      undefined,
      undefined,
      charStatsFor(weaponAttack, mainStat),
    );

    expect(result).toBeGreaterThan(currentScore);
  });

  it('does not apply legacy tier ratios for equipment tier-only changes', () => {
    const currentScore = 100_000;
    const current = equipment('weapon', { tier: '업화' });
    const modified = { ...current, tier: '전율' };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { weapon: current },
      { weapon: modified },
    );

    expect(result).toBeCloseTo(currentScore, 6);
  });
});

describe('calcLopecDelta equipment API/table formula changes', () => {
  it('applies armlet weapon attack main stat and flat base attack at supported levels', () => {
    const currentScore = 100_000;
    const weaponAttack = 200_000;
    const mainStat = 900_000;
    const current = equipment('armlet', { normalLevel: -1, tier: '미착용' });
    const modified = { ...current, normalLevel: 10, tier: '영웅' };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { armlet: current },
      { armlet: modified },
      undefined,
      undefined,
      charStatsFor(weaponAttack, mainStat),
    );
    const currentBaseAttack = Math.sqrt((weaponAttack * mainStat) / 6);
    const modifiedBaseAttack = Math.sqrt(((weaponAttack + 10969) * (mainStat + 34746)) / 6) + 2030;

    expect(result).toBeCloseTo(currentScore * (modifiedBaseAttack / currentBaseAttack), 6);
  });

  it('applies equipped +0 armlet separately from unequipped armlet', () => {
    const currentScore = 100_000;
    const weaponAttack = 200_000;
    const mainStat = 900_000;
    const current = equipment('armlet', { normalLevel: -1, tier: '미착용' });
    const modified = { ...current, normalLevel: 0, tier: '영웅' };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { armlet: current },
      { armlet: modified },
      undefined,
      undefined,
      charStatsFor(weaponAttack, mainStat),
    );
    const currentBaseAttack = Math.sqrt((weaponAttack * mainStat) / 6);
    const modifiedBaseAttack = Math.sqrt(((weaponAttack + 3500) * (mainStat + 10500)) / 6);

    expect(result).toBeCloseTo(currentScore * (modifiedBaseAttack / currentBaseAttack), 6);
  });

  it('applies only the known flat base attack delta from +9 to +10 armlet', () => {
    const currentScore = 100_000;
    const weaponAttack = 200_000;
    const mainStat = 900_000;
    const current = equipment('armlet', { normalLevel: 9, tier: '영웅' });
    const modified = { ...current, normalLevel: 10 };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { armlet: current },
      { armlet: modified },
      undefined,
      undefined,
      charStatsFor(weaponAttack, mainStat),
    );
    const currentBaseAttack = Math.sqrt((weaponAttack * mainStat) / 6);
    const modifiedBaseAttack = currentBaseAttack + 1180;

    expect(result).toBeCloseTo(currentScore * (modifiedBaseAttack / currentBaseAttack), 6);
  });

  it('applies armlet limit-break base attack percent without changing level', () => {
    const currentScore = 100_000;
    const weaponAttack = 200_000;
    const mainStat = 900_000;
    const current = equipment('armlet', { normalLevel: 10, tier: '영웅' });
    const modified = { ...current, tier: '전설' };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { armlet: current },
      { armlet: modified },
      undefined,
      undefined,
      charStatsFor(weaponAttack, mainStat),
    );
    const currentBaseAttack = Math.sqrt((weaponAttack * mainStat) / 6);
    const modifiedBaseAttack = currentBaseAttack * 1.01;

    expect(result).toBeCloseTo(currentScore * (modifiedBaseAttack / currentBaseAttack), 6);
  });

  it('does not reapply current armlet flat and percent bonuses in fallback stat reconstruction', () => {
    const currentScore = 100_000;
    const weaponAttack = 200_000;
    const mainStat = 900_000;
    const current = equipment('armlet', { normalLevel: 15, tier: '전설' });

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { armlet: current },
      { armlet: current },
      undefined,
      undefined,
      {
        W: weaponAttack,
        baseAttack: Math.sqrt((weaponAttack * mainStat) / 6),
        effectiveWeaponAttack: weaponAttack,
        displayedMainStat: mainStat,
        weaponAttackPercentSum: 0,
        baseAttackFlatSum: 3690,
        baseAttackPercentSum: 1,
      },
    );

    expect(result).toBeCloseTo(currentScore, 6);
  });

  it('uses API weapon attack and Egir normal honing deltas for weapon normal changes', () => {
    const currentScore = 100_000;
    const weaponAttack = 135_527;
    const mainStat = 892_890;
    const current = equipment('weapon', { normalLevel: 18, advancedLevel: 20 });
    const modified = { ...current, normalLevel: 20 };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { weapon: current },
      { weapon: modified },
      undefined,
      undefined,
      charStatsFor(weaponAttack, mainStat),
    );

    expect(result).toBeCloseTo(currentScore * Math.sqrt((weaponAttack + 3956 + 4095) / weaponAttack), 6);
  });

  it('uses summed armor main stat deltas for armor normal changes', () => {
    const currentScore = 100_000;
    const weaponAttack = 135_527;
    const mainStat = 892_890;
    const current = equipment('helmet', { normalLevel: 18, advancedLevel: 20 });
    const modified = { ...current, normalLevel: 20 };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { helmet: current },
      { helmet: modified },
      undefined,
      undefined,
      charStatsFor(weaponAttack, mainStat),
    );
    const effectiveStatDelta = 2133 + 2208;

    expect(result).toBeCloseTo(currentScore * Math.sqrt((mainStat + effectiveStatDelta) / mainStat), 6);
  });

  it('uses profile tooltip pure base attack instead of total attack for armor stat inference', () => {
    const currentScore = 100_000;
    const weaponAttack = 200_000;
    const totalAttack = 150_000;
    const pureBaseAttack = 140_000;
    const currentMainStat = (pureBaseAttack * pureBaseAttack * 6) / weaponAttack;
    const current = equipment('helmet', { normalLevel: 18, advancedLevel: 20 });
    const modified = { ...current, normalLevel: 20 };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { helmet: current },
      { helmet: modified },
      undefined,
      undefined,
      {
        W: weaponAttack,
        baseAttack: totalAttack,
        pureBaseAttack,
        effectiveWeaponAttack: weaponAttack,
        weaponAttackPercentSum: 0,
        baseAttackPercentSum: 0,
      },
    );
    const effectiveStatDelta = 2133 + 2208;

    expect(result).toBeCloseTo(currentScore * Math.sqrt((currentMainStat + effectiveStatDelta) / currentMainStat), 6);
  });

  it('matches synthetic Serka weapon normal honing from 21 to 22 using tooltip weapon attack only', () => {
    const current = equipment('weapon', {
      normalLevel: 21,
      equipmentFamily: 'serka',
      isInherited: true,
      tier: '전율',
    });
    const modified = { ...current, normalLevel: 22 };

    const result = calcLopecDelta(
      100_000,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { weapon: current },
      { weapon: modified },
      undefined,
      undefined,
      {
        W: 200_000,
        baseAttack: 150_000,
        pureBaseAttack: 140_000,
        effectiveWeaponAttack: 200_000,
        weaponAttackPercentSum: 0,
        baseAttackPercentSum: 0,
      },
    );

    expect(result).toBeCloseTo(101357.2888350907, 6);
  });

  it('uses formula-only Serka weapon normal honing downgrade from 25 to 21', () => {
    const current = equipment('weapon', {
      normalLevel: 25,
      equipmentFamily: 'serka',
      isInherited: true,
      tier: '전율',
    });
    const modified = { ...current, normalLevel: 21 };

    const result = calcLopecDelta(
      7104.22,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { weapon: current },
      { weapon: modified },
      undefined,
      undefined,
      {
        W: 241_367,
        baseAttack: 209_240,
        pureBaseAttack: 209_240,
        effectiveWeaponAttack: 241_367,
        weaponAttackPercentSum: 0,
        baseAttackPercentSum: 0,
      },
    );

    expect(result).toBeCloseTo(6761.905220079957, 6);
  });
});
