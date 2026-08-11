import { ARMLET_STEPS, calcExpectedAttempts, getAttemptMaterials } from './enhancement';

const totalMaterial = (from: number, type: string): number => {
  const step = ARMLET_STEPS.find((candidate) => candidate.from === from);
  if (!step) throw new Error(`Missing armlet step ${from}`);

  const attempts = calcExpectedAttempts(step, false, false);
  const material = getAttemptMaterials(step, false, false).find((candidate) => candidate.type === type);
  return (material?.amount ?? 0) * attempts;
};

describe('ARMLET_STEPS', () => {
  it('keeps representative 완갑 honing totals from the Inven source table', () => {
    expect(ARMLET_STEPS).toHaveLength(25);
    expect(calcExpectedAttempts(ARMLET_STEPS[0], false, false)).toBe(4.85);
    expect(totalMaterial(0, '운명의 파편')).toBeCloseTo(215_325);
    expect(totalMaterial(0, '운명의 파괴석 결정')).toBeCloseTo(2_910);
    expect(totalMaterial(0, '운명의 수호석 결정')).toBeCloseTo(8_730);
    expect(totalMaterial(0, '위대한 운명의 돌파석')).toBeCloseTo(146);
    expect(totalMaterial(0, '상급 아비도스 융화')).toBeCloseTo(107);

    expect(calcExpectedAttempts(ARMLET_STEPS[24], false, false)).toBe(32.36);
    expect(totalMaterial(24, '운명의 파편')).toBeCloseTo(1_851_889);
    expect(totalMaterial(24, '운명의 파괴석 결정')).toBeCloseTo(41_421);
    expect(totalMaterial(24, '운명의 수호석 결정')).toBeCloseTo(129_925);
    expect(totalMaterial(24, '위대한 운명의 돌파석')).toBeCloseTo(3_042);
    expect(totalMaterial(24, '상급 아비도스 융화')).toBeCloseTo(2_006);
  });
});
