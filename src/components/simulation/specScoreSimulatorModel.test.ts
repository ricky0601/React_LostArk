import { buildModifiedSpecScoreData, EMPTY_MODS } from './specScoreSimulatorModel';
import type { Mods, SpecScoreRawData } from './specScoreSimulatorTypes';
import { charStatsFor, effect, emptyGems, engravings } from '../../utils/lopecSimulator.testUtils';
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
