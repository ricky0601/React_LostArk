import { calcLopecDelta } from './lopecSimulator';
import { engravings, gem, gems } from './lopecSimulator.testUtils';

const stone97BaseAttackStats = {
  W: 218_667,
  baseAttack: 197_023,
  pureBaseAttack: 180_391,
  stoneBaseAttackBonusPercent: 1.5,
};

describe('calcLopecDelta gem combat power changes', () => {
  it('uses formula-only multipliers for one T4 gem 9 to 10', () => {
    const result = calcLopecDelta(
      4933.35,
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

    expect(result).toBeCloseTo(4972.130752293579, 6);
  });

  it.each([
    [1, 5011.38086316257],
    [5, 5335.335081529149],
    [10, 5768.201939718693],
  ])('uses formula-only multipliers for %i T4 gems 8 to 10', (count, expected) => {
    const result = calcLopecDelta(
      4933.35,
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

  it('includes 97-stone base attack in the pool when all Hangunttun gems become level 10', () => {
    const currentScore = 4933.35;
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

    expect(result).toBeCloseTo(5810.240684386926, 6);
    expect(result - currentScore).toBeCloseTo(876.8906843869254, 6);
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
      4933.35,
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

    expect(result).toBeCloseTo(4972.187032194468, 6);
    expect(result - 4933.35).toBeCloseTo(38.83703219446761, 6);
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
      4933.35,
      engravings([]),
      engravings([]),
      gems([
        gem(0, 9, '9레벨 겁화'),
        ...Array.from({ length: 10 }, (_, index) => gem(index + 1, 8, '8레벨 겁화')),
      ]),
      gems(Array.from({ length: 11 }, (_, slot) => gem(slot, 9, '9레벨 작열'))),
    );

    expect(result).toBeCloseTo(5336.300366483832, 6);
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
