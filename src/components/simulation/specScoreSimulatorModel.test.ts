import { buildModifiedSpecScoreData, EMPTY_MODS } from './specScoreSimulatorModel';
import { ARMLET_POWER_BY_LEVEL } from '../../data/specScore/equipmentPowerTables';
import type { Mods, SpecScoreRawData } from './specScoreSimulatorTypes';
import { charStatsFor, effect, emptyGems, engravings, equipment } from '../../utils/lopecSimulator.testUtils';
import type { StoneState } from '../../utils/polishState';

const stoneWithWonhan: StoneState = {
  tier: '고대',
  engravings: [{ name: '원한', level: 0 }],
  raw: {
    Type: '어빌리티 스톤',
    Name: '테스트 스톤',
    Icon: 'https://example.com/stone.png',
    Grade: '고대',
    Tooltip: '{}',
  },
};

const createRawData = (stone: StoneState | null = null): SpecScoreRawData => ({
  engravings: engravings([
    effect('원한', null, 4),
    effect('아드레날린', null, 3),
  ]),
  gems: emptyGems,
  arkGrid: null,
  equip: {},
  accessories: {},
  stone,
  bracelet: null,
  charStats: charStatsFor(100, 100),
});

describe('buildModifiedSpecScoreData engraving name changes', () => {
  it('emits selected common engraving names while preserving original mod keys', () => {
    // Given
    const mods: Mods = {
      ...EMPTY_MODS,
      engs: {
        원한: { Name: '예리한 둔기', Level: 2 },
      },
    };

    // When
    const modified = buildModifiedSpecScoreData(createRawData(), mods);

    // Then
    expect(modified.engravings.ArkPassiveEffects).toEqual([
      expect.objectContaining({ Name: '예리한 둔기', Level: 2 }),
      expect.objectContaining({ Name: '아드레날린', Level: 3 }),
    ]);
  });

  it('does not re-add a renamed original engraving through an unchanged stone slot', () => {
    // Given
    const mods: Mods = {
      ...EMPTY_MODS,
      engs: {
        원한: { Name: '타격의 대가' },
      },
    };

    // When
    const modified = buildModifiedSpecScoreData(createRawData(stoneWithWonhan), mods);

    // Then
    expect(modified.engravings.ArkPassiveEffects?.map((effect) => effect.Name)).toEqual([
      '타격의 대가',
      '아드레날린',
    ]);
  });
});

describe('buildModifiedSpecScoreData equipment tier changes', () => {
  it('updates derived equipment state when tier changes to Serka', () => {
    // Given
    const currentEquipment = equipment('helmet', {
      normalLevel: 16,
      advancedLevel: 20,
      tier: '업화',
      equipmentFamily: 'egir',
      isInherited: false,
    });
    const mods: Mods = {
      ...EMPTY_MODS,
      equip: {
        helmet: { normalLevel: 17, advancedLevel: 40, tier: '전율' },
      },
    };

    // When
    const modified = buildModifiedSpecScoreData({ ...createRawData(), equip: { helmet: currentEquipment } }, mods);

    // Then
    expect(modified.equip.helmet).toEqual(expect.objectContaining({
      normalLevel: 17,
      advancedLevel: 20,
      tier: '전율',
      equipmentFamily: 'serka',
      isInherited: true,
    }));
  });

  it('updates derived equipment state when tier changes back to Egir', () => {
    // Given
    const currentEquipment = equipment('helmet', {
      normalLevel: 17,
      advancedLevel: 20,
      tier: '전율',
      equipmentFamily: 'serka',
      isInherited: true,
    });
    const mods: Mods = {
      ...EMPTY_MODS,
      equip: {
        helmet: { advancedLevel: 40, tier: '업화' },
      },
    };

    // When
    const modified = buildModifiedSpecScoreData({ ...createRawData(), equip: { helmet: currentEquipment } }, mods);

    // Then
    expect(modified.equip.helmet).toEqual(expect.objectContaining({
      advancedLevel: 40,
      tier: '업화',
      equipmentFamily: 'egir',
      isInherited: false,
    }));
  });
});

describe('buildModifiedSpecScoreData armlet levels', () => {
  const armletAt = (normalLevel: number, grade = '고대') =>
    equipment('armlet', {
      normalLevel,
      tier: grade,
      raw: {
        Type: '완갑',
        Name: `+${normalLevel} 운명의 전율 완갑`,
        Icon: 'https://example.com/armlet.png',
        Grade: grade,
        Tooltip: '{}',
      },
    });

  it('keeps a supported +13 API level and its API grade when the armlet is untouched', () => {
    // Given: 착용 중인 아이템은 지원 레벨이어도 API grade가 권위다.
    const raw = { ...createRawData(), equip: { armlet: armletAt(13) } };

    // When
    const modified = buildModifiedSpecScoreData(raw, EMPTY_MODS);

    // Then: 표시 레벨은 API 원본 그대로, 등급도 테이블로 대체되지 않는다.
    expect(modified.equip.armlet).toEqual(expect.objectContaining({
      normalLevel: 13,
      advancedLevel: 0,
      tier: '고대',
    }));
  });

  it('applies a supported level selected from an unsupported current level', () => {
    // Given
    const raw = { ...createRawData(), equip: { armlet: armletAt(13) } };
    const mods: Mods = { ...EMPTY_MODS, equip: { armlet: { normalLevel: 15 } } };

    // When
    const modified = buildModifiedSpecScoreData(raw, mods);

    // Then
    expect(modified.equip.armlet).toEqual(expect.objectContaining({
      normalLevel: 15,
      advancedLevel: 0,
      tier: ARMLET_POWER_BY_LEVEL[15].grade,
    }));
  });

  it('keeps the API grade for an untouched armlet on a supported level', () => {
    // Given: +9는 지원 레벨이라 계수 테이블에도 grade가 있지만,
    // 실제 착용 중인 아이템의 등급은 API가 권위다.
    const raw = { ...createRawData(), equip: { armlet: armletAt(9) } };
    expect(ARMLET_POWER_BY_LEVEL[9].grade).not.toBe('고대');

    // When
    const modified = buildModifiedSpecScoreData(raw, EMPTY_MODS);

    // Then
    expect(modified.equip.armlet).toEqual(expect.objectContaining({
      normalLevel: 9,
      tier: '고대',
    }));
  });

  it('keeps the API grade when the same level is re-selected', () => {
    // Given: 값이 같은 재선택은 상태 변화가 아니다.
    const raw = { ...createRawData(), equip: { armlet: armletAt(9) } };
    const mods: Mods = { ...EMPTY_MODS, equip: { armlet: { normalLevel: 9 } } };

    // When
    const modified = buildModifiedSpecScoreData(raw, mods);

    // Then
    expect(modified.equip.armlet).toEqual(expect.objectContaining({ tier: '고대' }));
  });

  it.each([
    [10, '영웅', '전설'],
    [15, '전설', '유물'],
    [20, '유물', '고대'],
  ] as const)('applies the +%i armlet grade override without changing its level', (
    normalLevel,
    currentGrade,
    armletGrade,
  ) => {
    // Given
    const raw = { ...createRawData(), equip: { armlet: armletAt(normalLevel, currentGrade) } };
    const mods: Mods = { ...EMPTY_MODS, equip: { armlet: { armletGrade } } };

    // When
    const modified = buildModifiedSpecScoreData(raw, mods);

    // Then
    expect(modified.equip.armlet).toEqual(expect.objectContaining({
      normalLevel,
      tier: armletGrade,
    }));
  });
});
