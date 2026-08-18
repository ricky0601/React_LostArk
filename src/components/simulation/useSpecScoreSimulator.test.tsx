import { act, renderHook, waitFor } from '@testing-library/react';
import type { CharacterProfile } from '../../types/lostark';
import { charStatsFor, effect, emptyGems, engravings, equipment } from '../../utils/lopecSimulator.testUtils';
import { fetchSpecScoreRawData } from './specScoreSimulatorParsing';
import type { SpecScoreRawData } from './specScoreSimulatorTypes';
import { useSpecScoreSimulator } from './useSpecScoreSimulator';

jest.mock('./specScoreSimulatorParsing', () => {
  const actual = jest.requireActual('./specScoreSimulatorParsing');
  return {
    ...actual,
    fetchSpecScoreRawData: jest.fn(),
  };
});

const profile: CharacterProfile = {
  CharacterImage: '',
  CharacterName: '테스트',
  CharacterClassName: '바드',
  CharacterLevel: 70,
  ItemAvgLevel: '1700.00',
  ItemMaxLevel: '1700.00',
  ServerName: '루페온',
  Title: null,
  GuildName: null,
  ExpeditionLevel: 300,
  PvpGradeName: '',
  TownLevel: null,
  TownName: '',
  UsingSkillPoint: 0,
  TotalSkillPoint: 0,
  Stats: [],
  Tendencies: [],
  CombatPower: null,
};

const createRawData = (): SpecScoreRawData => ({
  engravings: engravings([effect('원한', null, 4)]),
  gems: emptyGems,
  arkGrid: null,
  equip: {
    armlet: equipment('armlet', {
      normalLevel: 10,
      tier: '영웅',
      raw: {
        Type: '완갑',
        Name: '+10 운명의 전용 완갑',
        Icon: '',
        Grade: '영웅',
        Tooltip: '{}',
      },
    }),
  },
  accessories: {},
  stone: null,
  bracelet: null,
  charStats: charStatsFor(100, 100),
});

describe('useSpecScoreSimulator armlet grade override state', () => {
  beforeEach(() => {
    jest.mocked(fetchSpecScoreRawData).mockResolvedValue(createRawData());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('clears a promoted armlet grade when the armlet normal level changes', async () => {
    // Given
    const { result } = renderHook(() => useSpecScoreSimulator(profile));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.updateEquipMod('armlet', { armletGrade: '전설' });
    });

    // When
    act(() => {
      result.current.updateEquipMod('armlet', { normalLevel: 11 });
    });

    // Then
    expect(result.current.mods.equip.armlet).toEqual({ normalLevel: 11 });
  });

  it('clears a promoted armlet grade when bulk equipment changes the armlet normal level', async () => {
    // Given
    const { result } = renderHook(() => useSpecScoreSimulator(profile));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.updateEquipMod('armlet', { armletGrade: '전설' });
    });

    // When
    act(() => {
      result.current.applyBulkEquip({ normalLevel: 11 });
    });

    // Then
    expect(result.current.mods.equip.armlet).toEqual({ normalLevel: 11 });
  });
});
