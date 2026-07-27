import { calcLopecDelta } from './lopecSimulator';
import { baseAttackFor, emptyGems, engravings, equipment } from './lopecSimulator.testUtils';

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
      { W: weaponAttack, baseAttack: baseAttackFor(weaponAttack, mainStat) },
    );

    expect(result).toBeGreaterThan(currentScore);
  });

  it('does not apply legacy tier ratios for equipment tier-only changes', () => {
    const currentScore = 100_000;
    const current = equipment('weapon', { tier: '고대' });
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
      { W: weaponAttack, baseAttack: baseAttackFor(weaponAttack, mainStat) },
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
      { W: weaponAttack, baseAttack: baseAttackFor(weaponAttack, mainStat) },
    );
    const effectiveStatDelta = 2133 + 2208;

    expect(result).toBeCloseTo(currentScore * Math.sqrt((mainStat + effectiveStatDelta) / mainStat), 6);
  });

  it('uses profile tooltip pure base attack instead of total attack for armor stat inference', () => {
    const currentScore = 100_000;
    const weaponAttack = 218_667;
    const totalAttack = 197_023;
    const pureBaseAttack = 180_391;
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
      { W: weaponAttack, baseAttack: totalAttack, pureBaseAttack },
    );
    const effectiveStatDelta = 2133 + 2208;

    expect(result).toBeCloseTo(currentScore * Math.sqrt((currentMainStat + effectiveStatDelta) / currentMainStat), 6);
  });

  it('matches Hangunttun Serka weapon normal honing from 21 to 22 using tooltip weapon attack only', () => {
    const current = equipment('weapon', {
      normalLevel: 21,
      equipmentFamily: 'serka',
      isInherited: true,
      tier: '전율',
    });
    const modified = { ...current, normalLevel: 22 };

    const result = calcLopecDelta(
      4933.35,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { weapon: current },
      { weapon: modified },
      undefined,
      undefined,
      { W: 218_667, baseAttack: 197_023, pureBaseAttack: 180_391 },
    );

    expect(result).toBeCloseTo(4994.63, 2);
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
      { W: 241_367, baseAttack: 209_240 },
    );

    expect(result).toBeCloseTo(6761.905220079957, 6);
  });
});
