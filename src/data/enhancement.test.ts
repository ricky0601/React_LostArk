import { ARMLET_STEPS, calcAttemptRate, calcExpectedAttempts, getAttemptMaterials, getCeiling } from './enhancement';

/**
 * 인벤 출처 표(https://www.inven.co.kr/board/lostark/4821/110554)를 그대로 옮긴 fixture.
 * ARMLET_STEPS는 이 총합을 expectedAttempts로 나눠 1회분으로 보관하므로,
 * 다시 곱해 원본 총합으로 돌아오는지 25단계 전체를 round-trip 검증한다.
 */
const ARMLET_SOURCE_TABLE = [
  { from: 0,  attempts: 4.85,  shard: 215_325,   destruction: 2_910,  guardian: 8_730,   leap: 146,   fusion: 107,   gold: 25_220,  silver: 1_838_000 },
  { from: 1,  attempts: 4.85,  shard: 217_750,   destruction: 3_007,  guardian: 9_021,   leap: 150,   fusion: 112,   gold: 26_190,  silver: 1_838_000 },
  { from: 2,  attempts: 4.85,  shard: 220_806,   destruction: 3_104,  guardian: 9_336,   leap: 155,   fusion: 116,   gold: 27_209,  silver: 1_838_000 },
  { from: 3,  attempts: 4.85,  shard: 223_958,   destruction: 3_201,  guardian: 9_652,   leap: 160,   fusion: 121,   gold: 28_276,  silver: 1_838_000 },
  { from: 4,  attempts: 4.85,  shard: 227_256,   destruction: 3_298,  guardian: 9_967,   leap: 165,   fusion: 126,   gold: 29_391,  silver: 1_838_000 },
  { from: 5,  attempts: 6.64,  shard: 265_329,   destruction: 4_648,  guardian: 14_110,  leap: 239,   fusion: 179,   gold: 41_832,  silver: 2_011_200 },
  { from: 6,  attempts: 6.64,  shard: 288_242,   destruction: 4_781,  guardian: 14_575,  leap: 252,   fusion: 186,   gold: 43_492,  silver: 2_244_320 },
  { from: 7,  attempts: 6.64,  shard: 293_355,   destruction: 4_947,  guardian: 15_073,  leap: 266,   fusion: 193,   gold: 45_218,  silver: 2_244_320 },
  { from: 8,  attempts: 6.64,  shard: 301_667,   destruction: 5_113,  guardian: 15_571,  leap: 279,   fusion: 199,   gold: 47_011,  silver: 2_274_320 },
  { from: 9,  attempts: 6.64,  shard: 342_178,   destruction: 5_279,  guardian: 16_102,  leap: 292,   fusion: 206,   gold: 48_870,  silver: 2_624_320 },
  { from: 10, attempts: 11.44, shard: 455_019,   destruction: 9_381,  guardian: 28_657,  leap: 526,   fusion: 366,   gold: 87_516,  silver: 3_076_720 },
  { from: 11, attempts: 11.44, shard: 485_430,   destruction: 9_667,  guardian: 29_630,  leap: 549,   fusion: 378,   gold: 90_948,  silver: 3_276_720 },
  { from: 12, attempts: 11.44, shard: 522_183,   destruction: 9_953,  guardian: 30_659,  leap: 572,   fusion: 389,   gold: 94_494,  silver: 3_536_720 },
  { from: 13, attempts: 11.44, shard: 555_394,   destruction: 10_296, guardian: 31_689,  leap: 606,   fusion: 412,   gold: 98_270,  silver: 3_756_720 },
  { from: 14, attempts: 11.44, shard: 598_063,   destruction: 10_639, guardian: 32_776,  leap: 641,   fusion: 435,   gold: 102_159, silver: 4_066_720 },
  { from: 15, attempts: 17.47, shard: 792_702,   destruction: 16_771, guardian: 51_799,  leap: 1_031, fusion: 699,   gold: 162_122, silver: 4_817_360 },
  { from: 16, attempts: 17.47, shard: 844_094,   destruction: 17_295, guardian: 53_546,  leap: 1_083, fusion: 734,   gold: 168_586, silver: 5_416_880 },
  { from: 17, attempts: 17.47, shard: 892_359,   destruction: 17_819, guardian: 55_380,  leap: 1_136, fusion: 769,   gold: 175_224, silver: 5_696_880 },
  { from: 18, attempts: 17.47, shard: 945_498,   destruction: 18_431, guardian: 57_302,  leap: 1_188, fusion: 804,   gold: 182_212, silver: 6_016_880 },
  { from: 19, attempts: 17.47, shard: 994_510,   destruction: 19_042, guardian: 59_223,  leap: 1_258, fusion: 839,   gold: 189_375, silver: 6_985_680 },
  { from: 20, attempts: 32.36, shard: 1_536_554, destruction: 36_405, guardian: 113_422, leap: 2_459, fusion: 1_618, gold: 364_697, silver: 9_459_840 },
  { from: 21, attempts: 32.36, shard: 1_613_887, destruction: 37_538, guardian: 117_305, leap: 2_589, fusion: 1_715, gold: 379_259, silver: 11_343_120 },
  { from: 22, attempts: 32.36, shard: 1_687_838, destruction: 38_832, guardian: 121_350, leap: 2_718, fusion: 1_812, gold: 394_145, silver: 11_623_120 },
  { from: 23, attempts: 32.36, shard: 1_768_731, destruction: 40_126, guardian: 125_557, leap: 2_880, fusion: 1_909, gold: 409_678, silver: 13_506_400 },
  { from: 24, attempts: 32.36, shard: 1_851_889, destruction: 41_421, guardian: 129_925, leap: 3_042, fusion: 2_006, gold: 425_858, silver: 13_836_400 },
] as const;

const armletStep = (from: number) => {
  const step = ARMLET_STEPS.find((candidate) => candidate.from === from);
  if (!step) throw new Error(`Missing armlet step ${from}`);
  return step;
};

const totalMaterial = (from: number, type: string): number => {
  const step = armletStep(from);

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

  it('round-trips every source-table row back to its original totals', () => {
    expect(ARMLET_STEPS.map((step) => step.from)).toEqual(ARMLET_SOURCE_TABLE.map((row) => row.from));

    for (const row of ARMLET_SOURCE_TABLE) {
      const step = armletStep(row.from);
      const attempts = calcExpectedAttempts(step, false, false);

      expect(attempts).toBe(row.attempts);
      expect(totalMaterial(row.from, '운명의 파편')).toBeCloseTo(row.shard);
      expect(totalMaterial(row.from, '운명의 파괴석 결정')).toBeCloseTo(row.destruction);
      expect(totalMaterial(row.from, '운명의 수호석 결정')).toBeCloseTo(row.guardian);
      expect(totalMaterial(row.from, '위대한 운명의 돌파석')).toBeCloseTo(row.leap);
      expect(totalMaterial(row.from, '상급 아비도스 융화')).toBeCloseTo(row.fusion);
      expect(step.gold * attempts).toBeCloseTo(row.gold);
      expect(step.silver * attempts).toBeCloseTo(row.silver);
    }
  });

  it('ignores the book booster on steps that have no book material', () => {
    // 완갑 단계에는 bookMaterial이 없다. 책을 켜도 partial 천장이 열려서는 안 된다.
    for (const step of ARMLET_STEPS) {
      expect(step.bookMaterial).toBeUndefined();
      expect(calcExpectedAttempts(step, true, false)).toBe(calcExpectedAttempts(step, false, false));
      expect(getCeiling(step, true, false)).toBe(getCeiling(step, false, false));
      expect(getAttemptMaterials(step, true, false)).toEqual(getAttemptMaterials(step, false, false));
      expect(calcAttemptRate(step, 0, true, false)).toBeCloseTo(calcAttemptRate(step, 0, false, false));

      // 숨결과의 조합에서도 책이 both 천장을 끌어내리지 않아야 한다.
      expect(calcExpectedAttempts(step, true, true)).toBe(calcExpectedAttempts(step, false, true));
    }
  });

  it('computes breath-on average attempts from the accumulating success rate', () => {
    // 평균 모드 + 숨결은 expectedAttempts 조기 반환을 타지 않고 확률 루프를 돈다.
    // 기대값은 밴드별 (baseRate, 증가폭, 상한, partial 천장)으로 독립 계산해 고정한다.
    const expectedByBand = [
      { from: 0, attempts: 2.981384 },
      { from: 5, attempts: 4.170516 },
      { from: 10, attempts: 7.523629 },
      { from: 15, attempts: 11.585661 },
      { from: 20, attempts: 21.572577 },
    ];

    for (const band of expectedByBand) {
      const step = armletStep(band.from);
      const attempts = calcExpectedAttempts(step, false, true);

      expect(attempts).toBeCloseTo(band.attempts, 5);
      // 평균 모드는 항상 천장보다 싸고, 무부스터보다도 싸야 한다.
      expect(attempts).toBeLessThan(getCeiling(step, false, true));
      expect(attempts).toBeLessThan(calcExpectedAttempts(step, false, false));
    }
  });

  it('uses collected armlet success rates and full-breath ceilings', () => {
    const ranges = [
      { from: 0, baseRate: 0.15, fullBreathRate: 0.30, breathCount: 20, noneCeiling: 11, fullBreathCeiling: 8 },
      { from: 5, baseRate: 0.10, fullBreathRate: 0.20, breathCount: 25, noneCeiling: 15, fullBreathCeiling: 10 },
      { from: 10, baseRate: 0.05, fullBreathRate: 0.10, breathCount: 25, noneCeiling: 26, fullBreathCeiling: 18 },
      { from: 15, baseRate: 0.03, fullBreathRate: 0.06, breathCount: 30, noneCeiling: 40, fullBreathCeiling: 27 },
      { from: 20, baseRate: 0.015, fullBreathRate: 0.03, breathCount: 30, noneCeiling: 76, fullBreathCeiling: 51 },
    ];

    for (const range of ranges) {
      const step = ARMLET_STEPS.find((candidate) => candidate.from === range.from);
      if (!step) throw new Error(`Missing armlet step ${range.from}`);

      expect(calcAttemptRate(step, 0, false, false)).toBeCloseTo(range.baseRate);
      expect(calcAttemptRate(step, 0, false, true)).toBeCloseTo(range.fullBreathRate);
      expect(getCeiling(step, false, false)).toBe(range.noneCeiling);
      expect(getCeiling(step, false, true)).toBe(range.fullBreathCeiling);
      expect(getAttemptMaterials(step, false, true)).toEqual(
        expect.arrayContaining([
          { type: '빙하의 숨결', amount: range.breathCount },
          { type: '용암의 숨결', amount: range.breathCount },
        ]),
      );
    }
  });
});
