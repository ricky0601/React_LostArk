import { act, renderHook, waitFor } from '@testing-library/react';
import { useExpeditionDashboard } from './useExpeditionDashboard';
import { MAX_SELECTION_LIMIT } from './expeditionPreferences';
import type { SiblingCharacter } from '../../types/lostark';
import { fetchProfile } from '../../utils/api';

vi.mock('../../utils/api', () => ({
  fetchProfile: vi.fn(),
  fetchSiblings: vi.fn(),
  fetchEquipment: vi.fn().mockResolvedValue([]),
  fetchArkPassive: vi.fn().mockResolvedValue({ IsArkPassive: false, Points: null, Effects: null }),
  fetchArkGrid: vi.fn().mockResolvedValue({ Slots: null, Effects: null }),
  fetchGems: vi.fn().mockResolvedValue({ Gems: null, Effects: null }),
  fetchEngravings: vi.fn().mockResolvedValue({ Engravings: null, Effects: null, ArkPassiveEffects: null }),
  LS_NICKNAME: 'lostark_nickname',
}));

const mockedFetchProfile = vi.mocked(fetchProfile);

const sibling = (index: number): SiblingCharacter => ({
  ServerName: '루페온',
  CharacterName: `훅캐릭${index}`,
  CharacterLevel: 70,
  CharacterClassName: '슬레이어',
  ItemAvgLevel: `${(1700 - index).toFixed(2)}`,
  ItemMaxLevel: `${(1700 - index).toFixed(2)}`,
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockedFetchProfile.mockResolvedValue({ CharacterName: 'x' } as never);
});

describe('useExpeditionDashboard selection guard', () => {
  it('ignores individual toggles once the selection cap is reached', async () => {
    const siblings = Array.from({ length: MAX_SELECTION_LIMIT + 1 }, (_, index) => sibling(index));
    const { result } = renderHook(() => useExpeditionDashboard('cap-nick', siblings));
    await waitFor(() => expect(mockedFetchProfile).toHaveBeenCalled());

    for (let index = 6; index <= MAX_SELECTION_LIMIT; index++) {
      act(() => result.current.toggleCharacter(`훅캐릭${index}`));
    }

    expect(result.current.selectedNames.size).toBe(MAX_SELECTION_LIMIT);
    expect(result.current.selectedNames.has(`훅캐릭${MAX_SELECTION_LIMIT}`)).toBe(false);
  });

  it('merges rows when siblings arrive after mount', async () => {
    const { result, rerender } = renderHook(
      ({ sibs }: { sibs: SiblingCharacter[] }) => useExpeditionDashboard('sync-nick', sibs),
      { initialProps: { sibs: [sibling(0), sibling(1)] } },
    );
    await waitFor(() => expect(mockedFetchProfile).toHaveBeenCalled());

    rerender({ sibs: [sibling(0), sibling(1), sibling(2)] });

    await waitFor(() => {
      expect(Object.keys(result.current.rows)).toContain('훅캐릭2');
    });
  });

  it('retries an errored row when it is reselected', async () => {
    mockedFetchProfile.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExpeditionDashboard('retry-nick', [sibling(0)]));
    await waitFor(() => {
      expect(result.current.rows['훅캐릭0']?.profile.status).toBe('error');
    });

    mockedFetchProfile.mockResolvedValue({ CharacterName: '훅캐릭0' } as never);
    act(() => result.current.toggleCharacter('훅캐릭0'));
    act(() => result.current.toggleCharacter('훅캐릭0'));

    await waitFor(() => {
      expect(result.current.rows['훅캐릭0']?.profile.status).toBe('success');
    });
  });
});
