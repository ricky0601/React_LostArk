import { LOPEC_ENGRAVING_TOTAL_EFFECTS } from '../data/specScore/lopecCoefficients';
import { calcLopecDelta } from './lopecSimulator';
import { effect, emptyGems, engravings } from './lopecSimulator.testUtils';

describe('calcLopecDelta engraving factor changes', () => {
  it('uses cumulative engraving factors for known engraving X and stone level changes', () => {
    const currentScore = 100_000;
    const result = calcLopecDelta(
      currentScore,
      engravings([effect('원한', 1)]),
      engravings([effect('원한', 3)]),
      emptyGems,
      emptyGems,
    );
    const currentTotalEffect = LOPEC_ENGRAVING_TOTAL_EFFECTS['원한'][0][1];
    const modifiedTotalEffect = LOPEC_ENGRAVING_TOTAL_EFFECTS['원한'][0][3];

    expect(result).toBeCloseTo(currentScore * ((1 + modifiedTotalEffect / 100) / (1 + currentTotalEffect / 100)), 6);
  });

  it('does not estimate unmeasured engraving changes with legacy fallback coefficients', () => {
    const currentScore = 100_000;
    const result = calcLopecDelta(
      currentScore,
      engravings([effect('아직 없는 각인', 0)]),
      engravings([effect('아직 없는 각인', 1)]),
      emptyGems,
      emptyGems,
    );

    expect(result).toBeCloseTo(currentScore, 6);
  });

  it('matches Parkbitina Mass Increase book stage X4 to X2', () => {
    const result = calcLopecDelta(
      7124.342638297872,
      engravings([effect('질량 증가', 0, 4)]),
      engravings([effect('질량 증가', 0, 2)]),
      emptyGems,
      emptyGems,
    );

    expect(result).toBeCloseTo(7034.54, 2);
  });

  it('divides by the same cumulative engraving factors when known stone level decreases', () => {
    const currentScore = 100_000;
    const result = calcLopecDelta(
      currentScore,
      engravings([effect('원한', 4)]),
      engravings([effect('원한', 2)]),
      emptyGems,
      emptyGems,
    );
    const currentTotalEffect = LOPEC_ENGRAVING_TOTAL_EFFECTS['원한'][0][4];
    const modifiedTotalEffect = LOPEC_ENGRAVING_TOTAL_EFFECTS['원한'][0][2];

    expect(result).toBeCloseTo(currentScore * ((1 + modifiedTotalEffect / 100) / (1 + currentTotalEffect / 100)), 6);
  });
});

describe('calcLopecDelta 97-stone base attack changes', () => {
  it('uses profile attack tooltip facts when removing Hangunttun 97-stone base attack bonus', () => {
    const result = calcLopecDelta(
      4933.35,
      engravings([effect('원한', 2, 0), effect('예리한 둔기', 3, 0)]),
      engravings([effect('원한', 1, 0), effect('예리한 둔기', 3, 0)]),
      emptyGems,
      emptyGems,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        W: 218667,
        baseAttack: 197023,
        pureBaseAttack: 180391,
        stoneBaseAttackBonusPercent: 1.5,
      },
    );

    expect(result).toBeCloseTo(4836.62, 2);
  });

  it('keeps the 97-stone base attack bonus when total stone levels stay at 5 or higher', () => {
    const currentScore = 100_000;
    const result = calcLopecDelta(
      currentScore,
      engravings([effect('원한', 3, 4), effect('아드레날린', 2, 4)]),
      engravings([effect('원한', 4, 4), effect('아드레날린', 1, 4)]),
      emptyGems,
      emptyGems,
    );
    const expected = currentScore * ((1 + 27.00 / 100) / (1 + 26.25 / 100)) * ((1 + 22.28 / 100) / (1 + 23.00 / 100));

    expect(result).toBeCloseTo(expected, 6);
  });
});
