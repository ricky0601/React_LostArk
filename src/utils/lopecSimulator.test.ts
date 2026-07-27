import { LOPEC_ENGRAVING_TOTAL_EFFECTS } from '../data/specScore/lopecCoefficients';
import { calcLopecDelta } from './lopecSimulator';
import type { BraceletState } from './polishState';
import { effect, emptyGems, engravings } from './lopecSimulator.testUtils';

const noBraceletOption: BraceletState['options'][number] = {
  type: '없음',
  grade: '하',
  label: '없음',
  value: 0,
  combatPowerIncreasePercent: 0,
};

const braceletState = (crit: number, specialization: number, swiftness: number): BraceletState => ({
  tier: '고대',
  effects: [],
  stats: [
    { type: '치명', value: crit },
    { type: '특화', value: specialization },
    { type: '신속', value: swiftness },
    { type: '없음', value: 0 },
  ],
  options: [noBraceletOption, noBraceletOption, noBraceletOption, noBraceletOption],
  raw: { Type: '팔찌', Name: '테스트 팔찌', Icon: '', Grade: '고대', Tooltip: '' },
});

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


describe('calcLopecDelta bracelet combat stat changes', () => {
  it('applies bracelet crit specialization and swiftness changes against full character combat stats', () => {
    const currentScore = 100_000;
    const currentStatSum = 1_800 + 600 + 400;
    const modifiedStatSum = currentStatSum - (60 + 0 + 0) + (120 + 0 + 60);
    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        W: 0,
        baseAttack: 0,
        combatStats: { crit: 1_800, specialization: 600, swiftness: 400 },
      },
      undefined,
      undefined,
      braceletState(60, 0, 0),
      braceletState(120, 0, 60),
    );
    const expected = currentScore *
      ((1 + (modifiedStatSum * 0.03) / 100) / (1 + (currentStatSum * 0.03) / 100));

    expect(result).toBeCloseTo(expected, 6);
  });
});
