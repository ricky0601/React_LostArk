import type { ArkGridData, ArkGridSlot } from '../types/lostark';
import { calcLopecDelta } from './lopecSimulator';
import { emptyGems, engravings } from './lopecSimulator.testUtils';

const arkGrid = (slots: readonly ArkGridSlot[], effects: readonly { readonly Name: string; readonly Level: number }[]): ArkGridData => ({
  Slots: slots.map((slot) => ({ ...slot, Gems: slot.Gems ? [...slot.Gems] : null })),
  Effects: effects.map((effect) => ({ ...effect, Tooltip: '' })),
});

const core = (Index: number, Name: string, Grade: string, Point: number): ArkGridSlot => ({
  Index,
  Name,
  Grade,
  Point,
  Icon: '',
  Tooltip: '',
  Gems: [],
});

const scoreWithArkGrid = (currentScore: number, currentArkGrid: ArkGridData, modifiedArkGrid: ArkGridData): number =>
  calcLopecDelta(
    currentScore,
    engravings([]),
    engravings([]),
    emptyGems,
    emptyGems,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    currentArkGrid,
    modifiedArkGrid,
  );

describe('calcLopecDelta Ark Grid combat power changes', () => {
  it('applies measured ancient order moon 18P to 20P delta', () => {
    const current = arkGrid([core(1, '질서의 달 코어 : 테스트', '고대', 18)], []);
    const modified = arkGrid([core(1, '질서의 달 코어 : 테스트', '고대', 20)], []);

    expect(scoreWithArkGrid(100_000, current, modified)).toBeCloseTo(100303.671666513, 6);
  });

  it('applies measured ancient order moon 18P to relic order moon 18P delta', () => {
    const current = arkGrid([core(1, '질서의 달 코어 : 테스트', '고대', 18)], []);
    const modified = arkGrid([core(1, '질서의 달 코어 : 테스트', '유물', 18)], []);

    expect(scoreWithArkGrid(100_000, current, modified)).toBeCloseTo(99079.7828287476, 6);
  });

  it('keeps unsupported legendary to ancient 14P core grade change neutral', () => {
    const current = arkGrid([core(1, '질서의 달 코어 : 테스트', '전설', 14)], []);
    const modified = arkGrid([core(1, '질서의 달 코어 : 테스트', '고대', 14)], []);

    expect(scoreWithArkGrid(2192.31, current, modified)).toBeCloseTo(2192.31, 6);
  });

  it('handles Ark Grid slots without gem arrays', () => {
    const current = arkGrid([{ ...core(1, '질서의 달 코어 : 테스트', '유물', 14), Gems: null }], []);
    const modified = arkGrid([{ ...core(1, '질서의 달 코어 : 테스트', '유물', 14), Gems: null }], []);

    expect(scoreWithArkGrid(2192.31, current, modified)).toBeCloseTo(2192.31, 6);
  });

  it('applies measured dealer Ark Grid gem option levels', () => {
    const current = arkGrid([], [{ Name: '공격력', Level: 42 }]);
    const modified = arkGrid([], [{ Name: '공격력', Level: 43 }]);

    expect(scoreWithArkGrid(100_000, current, modified)).toBeCloseTo(100029.59011673799, 6);
  });

  it('keeps unsupported chaos star weapon core neutral', () => {
    const current = arkGrid([core(5, '혼돈의 별 코어 : 무기', '유물', 17)], []);
    const modified = arkGrid([core(5, '혼돈의 별 코어 : 무기', '고대', 20)], []);

    expect(scoreWithArkGrid(100_000, current, modified)).toBeCloseTo(100_000, 6);
  });
});
