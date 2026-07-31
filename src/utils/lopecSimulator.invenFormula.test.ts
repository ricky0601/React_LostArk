import { calcLopecDelta } from './lopecSimulator';
import { emptyGems, engravings, equipment } from './lopecSimulator.testUtils';

describe('calcLopecDelta Inven combat-power formula changes', () => {
  it('uses displayed main stat as the Serka armor denominator when supplied', () => {
    const currentScore = 100_000;
    const displayedMainStat = 696_152;
    const current = equipment('helmet', {
      normalLevel: 16,
      equipmentFamily: 'serka',
      isInherited: true,
      tier: '전율',
    });
    const modified = { ...current, normalLevel: 17 };

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
      { W: 200_000, baseAttack: 150_000, pureBaseAttack: 140_000, displayedMainStat },
    );

    expect(result).toBeCloseTo(currentScore * Math.sqrt((displayedMainStat + 2793) / displayedMainStat), 6);
  });

  it('sums avatar and pet main stat percents before applying them to Serka armor deltas', () => {
    const currentScore = 100_000;
    const displayedMainStat = 696_152;
    const current = equipment('gloves', {
      normalLevel: 19,
      equipmentFamily: 'serka',
      isInherited: true,
      tier: '전율',
    });
    const modified = { ...current, normalLevel: 20 };

    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      { gloves: current },
      { gloves: modified },
      undefined,
      undefined,
      {
        W: 200_000,
        baseAttack: 150_000,
        displayedMainStat,
        avatarMainStatMultiplier: 1.08,
        petMainStatMultiplier: 1.01,
      },
    );
    const effectiveStatDelta = 3606 * 1.09;

    expect(result).toBeCloseTo(currentScore * Math.sqrt((displayedMainStat + effectiveStatDelta) / displayedMainStat), 6);
  });

  it('amplifies raw weapon tooltip honing deltas by the weapon attack percent sum', () => {
    const currentScore = 100_000;
    const weaponTooltipAttack = 200_000;
    const weaponAttackPercentSum = 3.6;
    const amplifier = 1 + weaponAttackPercentSum / 100;
    const effectiveWeaponAttack = weaponTooltipAttack * amplifier;
    const current = equipment('weapon', {
      normalLevel: 21,
      equipmentFamily: 'serka',
      isInherited: true,
      tier: '전율',
    });
    const modified = { ...current, normalLevel: 22 };

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
      {
        W: weaponTooltipAttack,
        baseAttack: 150_000,
        displayedMainStat: 696_152,
        effectiveWeaponAttack,
        weaponAttackPercentSum,
      },
    );
    const nextWeaponAttack = effectiveWeaponAttack + 5466 * amplifier;

    expect(result).toBeCloseTo(currentScore * Math.sqrt(nextWeaponAttack / effectiveWeaponAttack), 6);
  });
});
