import { calcLopecDelta, type CharStats } from './lopecSimulator';
import { accessory, emptyGems, engravings } from './lopecSimulator.testUtils';

const currentScore = 100_000;

const calcAccessoryChange = (fromLabel: string, toLabel: string, charStats?: CharStats): number =>
  calcLopecDelta(
    currentScore,
    engravings([]),
    engravings([]),
    emptyGems,
    emptyGems,
    undefined,
    undefined,
    { necklace: accessory('necklace', [fromLabel, '없음', '없음']) },
    { necklace: accessory('necklace', [toLabel, '없음', '없음']) },
    charStats,
  );

describe('calcLopecDelta accessory polish changes', () => {
  it.each([
    ['공격력 +80', 100_056],
    ['공격력 +195', 100_136.5],
    ['공격력 +390', 100_273],
    ['치명타 적중률 +0.40%', 100_309.68],
    ['치명타 적중률 +0.95%', 100_735.49],
    ['치명타 적중률 +1.55%', 101_200.01],
    ['치명타 피해 +1.10%', 100_330],
    ['치명타 피해 +2.40%', 100_720],
    ['치명타 피해 +4.00%', 101_200],
    ['추가 피해 +0.60%', 100_461.52],
    ['추가 피해 +1.60%', 101_230.72],
    ['추가 피해 +2.60%', 101_999.92],
    ['적에게 주는 피해 +0.55%', 100_550],
    ['적에게 주는 피해 +1.20%', 101_200],
    ['적에게 주는 피해 +2.00%', 102_000],
    ['공격력 +0.40%', 100_400],
    ['공격력 +0.95%', 100_950],
    ['공격력 +1.55%', 101_550],
  ])('applies verified independent combat-power increase for %s', (label, expected) => {
    const result = calcAccessoryChange('없음', label);

    expect(result).toBeCloseTo(expected, 2);
  });

  it('uses ratio replacement when changing between verified direct options', () => {
    const result = calcAccessoryChange('적에게 주는 피해 +1.20%', '적에게 주는 피해 +2.00%');

    expect(result).toBeCloseTo((currentScore * 1.02) / 1.012, 2);
  });

  it('applies weapon attack through the base-attack-side formula instead of the direct table', () => {
    const result = calcAccessoryChange('없음', '무기 공격력 +1.80%');

    expect(result).toBeCloseTo(currentScore * Math.sqrt(1.018), 2);
  });

  it('applies flat weapon attack through current weapon attack instead of the direct table', () => {
    const result = calcAccessoryChange('없음', '무기 공격력 +480', { W: 200_000, baseAttack: 150_000 });

    expect(result).toBeCloseTo(currentScore * Math.sqrt(1 + 480 / 200_000), 2);
  });
});
