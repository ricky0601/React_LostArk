import type { EngravingData, ArkPassiveEffect, GemData } from '../types/lostark';
import type { EquipSlot } from '../data/specScore/lopecCoefficients';
import type { EquipmentState } from './equipmentState';
import {
  LOPEC_ENGRAVING_PER_STONE,
  LOPEC_STONE_LV_STEPS,
  LOPEC_STONE_LV_STEPS_DEFAULT,
} from '../data/specScore/lopecCoefficients';
import { calcLopecDelta } from './lopecSimulator';

const effect = (
  Name: string,
  AbilityStoneLevel: number | null,
  Level = 0,
): ArkPassiveEffect => ({
  AbilityStoneLevel,
  Grade: '유물',
  Level,
  Name,
  Description: '',
});

const engravings = (effects: ArkPassiveEffect[]): EngravingData => ({
  Engravings: [],
  Effects: [],
  ArkPassiveEffects: effects,
});

const emptyGems: GemData = { Gems: [], Effects: null };

const equipment = (
  slot: EquipSlot,
  patch: Partial<EquipmentState> = {},
): EquipmentState => ({
  slot,
  normalLevel: 10,
  advancedLevel: 0,
  tier: '고대',
  isInherited: false,
  raw: {
    Type: '투구',
    Name: '+10 테스트 장비',
    Icon: '',
    Grade: '고대',
    Tooltip: '{}',
  },
  ...patch,
});

describe('calcLopecDelta stone level changes', () => {
  it('applies measured ability stone level steps for known engravings', () => {
    const currentScore = 100_000;
    const result = calcLopecDelta(
      currentScore,
      engravings([effect('원한', 1)]),
      engravings([effect('원한', 3)]),
      emptyGems,
      emptyGems,
    );
    const [lv1To2, lv2To3] = LOPEC_STONE_LV_STEPS['원한'];

    expect(result).toBeCloseTo(currentScore * (1 + lv1To2 / 100) * (1 + lv2To3 / 100), 6);
  });

  it('applies the per-stone fallback for the unmeasured 0 to 1 transition', () => {
    const currentScore = 100_000;
    const result = calcLopecDelta(
      currentScore,
      engravings([effect('원한', 0)]),
      engravings([effect('원한', 1)]),
      emptyGems,
      emptyGems,
    );

    expect(result).toBeCloseTo(currentScore * (1 + LOPEC_ENGRAVING_PER_STONE['원한'] / 100), 6);
  });

  it('divides by the same measured steps when stone level decreases', () => {
    const currentScore = 100_000;
    const result = calcLopecDelta(
      currentScore,
      engravings([effect('원한', 4)]),
      engravings([effect('원한', 2)]),
      emptyGems,
      emptyGems,
    );
    const [, lv2To3, lv3To4] = LOPEC_STONE_LV_STEPS['원한'];

    expect(result).toBeCloseTo(currentScore / (1 + lv2To3 / 100) / (1 + lv3To4 / 100), 6);
  });

  it('uses the default stone step table for unmeasured engravings', () => {
    const currentScore = 100_000;
    const result = calcLopecDelta(
      currentScore,
      engravings([effect('질량 증가', 1)]),
      engravings([effect('질량 증가', 2)]),
      emptyGems,
      emptyGems,
    );

    expect(result).toBeCloseTo(currentScore * (1 + LOPEC_STONE_LV_STEPS_DEFAULT[0] / 100), 6);
  });
});

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
    const current = equipment('helmet', { isInherited: true, normalLevel: 10, advancedLevel: 0 });
    const modified = { ...current, normalLevel: 11, advancedLevel: 40 };

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
});
