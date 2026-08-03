import { calcLopecDelta } from './lopecSimulator';
import { engravings, gem, gems } from './lopecSimulator.testUtils';

const stone97BaseAttackStats = {
  W: 200_000,
  baseAttack: 150_000,
  pureBaseAttack: 140_000,
  stoneBaseAttackBonusPercent: 1.5,
};

describe('calcLopecDelta gem combat power changes', () => {
  it('uses formula-only multipliers for one T4 gem 9 to 10', () => {
    const result = calcLopecDelta(
      100_000,
      engravings([]),
      engravings([]),
      gems([
        gem(0, 9, '9레벨 겁화'),
        ...Array.from({ length: 10 }, (_, index) => gem(index + 1, 8, '8레벨 겁화')),
      ]),
      gems([
        gem(0, 10, '10레벨 작열'),
        ...Array.from({ length: 10 }, (_, index) => gem(index + 1, 8, '8레벨 작열')),
      ]),
    );

    expect(result).toBeCloseTo(100786.093674553, 6);
  });

  it.each([
    [1, 101581.701342142],
    [5, 108148.318719109],
    [10, 116922.617282753],
  ])('uses formula-only multipliers for %i T4 gems 8 to 10', (count, expected) => {
    const result = calcLopecDelta(
      100_000,
      engravings([]),
      engravings([]),
      gems([
        gem(0, 9, '9레벨 겁화'),
        ...Array.from({ length: 10 }, (_, index) => gem(index + 1, 8, '8레벨 겁화')),
      ]),
      gems([
        gem(0, 9, '9레벨 작열'),
        ...Array.from({ length: count }, (_, index) => gem(index + 1, 10, '10레벨 작열')),
        ...Array.from({ length: 10 - count }, (_, index) => gem(index + count + 1, 8, '8레벨 작열')),
      ]),
    );

    expect(result).toBeCloseTo(expected, 6);
  });

  it('includes 97-stone base attack in the pool when all anonymous gems become level 10', () => {
    const currentScore = 100_000;
    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      gems([
        gem(0, 9, '9레벨 겁화'),
        ...Array.from({ length: 10 }, (_, index) => gem(index + 1, 8, '8레벨 겁화')),
      ]),
      gems(Array.from({ length: 11 }, (_, slot) => gem(slot, 10, '10레벨 작열'))),
      undefined,
      undefined,
      undefined,
      undefined,
      stone97BaseAttackStats,
    );

    expect(result).toBeCloseTo(117774.75112017, 6);
    expect(result - currentScore).toBeCloseTo(17774.7511201704, 6);
  });

  it('uses API-style glow gem names for the current one Lv9 and ten Lv8 baseline', () => {
    const currentGlowGems = gems([
      gem(0, 9, "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>9레벨 광휘의 보석</FONT></P>"),
      gem(1, 8, "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>8레벨 광휘의 보석</FONT></P>"),
      gem(2, 8, "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>8레벨 광휘의 보석 (귀속)</FONT></P>"),
      ...Array.from({ length: 8 }, (_, index) =>
        gem(index + 3, 8, "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>8레벨 광휘의 보석</FONT></P>"),
      ),
    ]);

    const modifiedGlowGems = gems([
      gem(0, 9, "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>9레벨 광휘의 보석</FONT></P>"),
      gem(1, 9, "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>9레벨 광휘의 보석</FONT></P>"),
      gem(2, 8, "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>8레벨 광휘의 보석 (귀속)</FONT></P>"),
      ...Array.from({ length: 8 }, (_, index) =>
        gem(index + 3, 8, "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>8레벨 광휘의 보석</FONT></P>"),
      ),
    ]);

    const result = calcLopecDelta(
      100_000,
      engravings([]),
      engravings([]),
      currentGlowGems,
      modifiedGlowGems,
      undefined,
      undefined,
      undefined,
      undefined,
      stone97BaseAttackStats,
    );

    expect(result).toBeCloseTo(100787.234479501, 6);
    expect(result - 100_000).toBeCloseTo(787.234479501116, 6);
  });

  it('includes 97-stone base attack when six level 9 gems become level 10', () => {
    const currentScore = 7124.35;
    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      gems([
        ...Array.from({ length: 5 }, (_, slot) => gem(slot, 10, '10레벨 광휘의 보석')),
        ...Array.from({ length: 6 }, (_, index) => gem(index + 5, 9, '9레벨 광휘의 보석')),
      ]),
      gems(Array.from({ length: 11 }, (_, slot) => gem(slot, 10, '10레벨 광휘의 보석'))),
      undefined,
      undefined,
      undefined,
      undefined,
      stone97BaseAttackStats,
    );

    expect(result).toBeCloseTo(7463.450180407866, 6);
    expect(result - currentScore).toBeCloseTo(339.100180407866, 6);
  });

  it('uses no-stone base attack pool when nine level 7 gems become level 8', () => {
    const currentScore = 2192.31;
    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      gems([
        ...Array.from({ length: 2 }, (_, slot) => gem(slot, 8, '8레벨 광휘의 보석')),
        ...Array.from({ length: 9 }, (_, index) => gem(index + 2, 7, '7레벨 광휘의 보석')),
      ]),
      gems(Array.from({ length: 11 }, (_, slot) => gem(slot, 8, '8레벨 광휘의 보석'))),
    );

    expect(result).toBeCloseTo(2354.3546941765867, 6);
    expect(result - currentScore).toBeCloseTo(162.04469417658675, 6);
  });

  it('uses formula-only multipliers for ten T4 gems 8 to 9', () => {
    const result = calcLopecDelta(
      100_000,
      engravings([]),
      engravings([]),
      gems([
        gem(0, 9, '9레벨 겁화'),
        ...Array.from({ length: 10 }, (_, index) => gem(index + 1, 8, '8레벨 겁화')),
      ]),
      gems(Array.from({ length: 11 }, (_, slot) => gem(slot, 9, '9레벨 작열'))),
    );

    expect(result).toBeCloseTo(108167.885239925, 6);
  });

  it('ignores gem type and skill when gem level is unchanged', () => {
    const currentScore = 100_000;
    const result = calcLopecDelta(
      currentScore,
      engravings([]),
      engravings([]),
      gems([gem(0, 10, '10레벨 겁화')]),
      gems([gem(0, 10, '10레벨 작열')]),
    );

    expect(result).toBeCloseTo(currentScore, 6);
  });
});
