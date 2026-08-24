import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Character from './Character';
import type { CharacterProfile, EquipmentItem } from '../types/lostark';
import { getCombatEquipmentItems } from '../utils/characterEquipment';
import {
  fetchArkGrid,
  fetchEngravings,
  fetchEquipment,
  fetchGems,
  fetchProfile,
} from '../utils/api';

const mockSetSearchParams = vi.fn();
let mockCurrentSearchParams = new URLSearchParams('nickname=테스트캐릭터');

vi.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useLocation: () => ({ pathname: '/character' }),
    useSearchParams: () => [mockCurrentSearchParams, mockSetSearchParams],
  }),
  { virtual: true },
);

vi.mock('../components/NavBar', () => ({ default: () => <div>NavBar</div> }));
vi.mock('../components/PullToRefresh', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

vi.mock('../utils/api', () => ({
  fetchProfile: vi.fn(),
  fetchEquipment: vi.fn(),
  fetchGems: vi.fn(),
  fetchEngravings: vi.fn(),
  fetchArkGrid: vi.fn(),
  LS_NICKNAME: 'lostark_nickname',
}));

const mockedFetchProfile = vi.mocked(fetchProfile);
const mockedFetchEquipment = vi.mocked(fetchEquipment);
const mockedFetchGems = vi.mocked(fetchGems);
const mockedFetchEngravings = vi.mocked(fetchEngravings);
const mockedFetchArkGrid = vi.mocked(fetchArkGrid);

const profile: CharacterProfile = {
  CharacterImage: 'https://example.com/character.png',
  CharacterName: '테스트캐릭터',
  CharacterClassName: '바드',
  CharacterLevel: 70,
  ItemAvgLevel: '1,700.00',
  ItemMaxLevel: '1,700.00',
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

const equipment = (type: string, name: string): EquipmentItem => ({
  Type: type,
  Name: name,
  Icon: '',
  Grade: '고대',
  Tooltip: '{}',
});

describe('getCombatEquipmentItems', () => {
  it('places 완갑 directly below 무기 when present', () => {
    const items = [
      equipment('투구', '+19 운명의 전율 투구'),
      equipment('완갑', '+9 운명의 전율 완갑'),
      equipment('무기', '+21 운명의 전율 한손검'),
      equipment('목걸이', '도래한 결전의 목걸이'),
    ];

    expect(getCombatEquipmentItems(items).map((item) => item.Type)).toEqual(['무기', '완갑', '투구']);
  });
});

describe('Character route state affordances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentSearchParams = new URLSearchParams('nickname=테스트캐릭터');
    mockSetSearchParams.mockImplementation((nextInit) => {
      mockCurrentSearchParams = new URLSearchParams(nextInit);
    });
    mockedFetchEquipment.mockResolvedValue(null);
    mockedFetchGems.mockResolvedValue(null);
    mockedFetchEngravings.mockResolvedValue(null);
    mockedFetchArkGrid.mockResolvedValue(null);
  });

  it('shows an intentional fallback when the profile image fails', async () => {
    mockedFetchProfile.mockResolvedValue(profile);

    render(<Character />);

    const image = await screen.findByRole('img', { name: '테스트캐릭터' });
    fireEvent.error(image);

    expect(screen.getByRole('img', { name: '테스트캐릭터 이미지 없음' })).toBeInTheDocument();
  });

  it('explains a failed search and offers a next action', async () => {
    mockedFetchProfile.mockRejectedValue(new Error('rate limited'));

    render(<Character />);

    expect(await screen.findByRole('alert')).toHaveTextContent('요청이 많거나 서버 응답이 지연될 수 있습니다');
    expect(screen.getByRole('button', { name: '닉네임 다시 입력' })).toBeInTheDocument();
  });

  it('returns to nickname input and clears query params after reset action', async () => {
    mockedFetchProfile.mockRejectedValue(new Error('rate limited'));

    render(<Character />);

    await userEvent.click(await screen.findByRole('button', { name: '닉네임 다시 입력' }));

    expect(mockSetSearchParams).toHaveBeenCalledWith({});
    expect(screen.getByRole('button', { name: '캐릭터 조회' })).toBeInTheDocument();
  });

  it('shows the empty branch when profile lookup succeeds with no data', async () => {
    mockedFetchProfile.mockResolvedValue(null as never);

    render(<Character />);

    expect(await screen.findByRole('status', { name: '캐릭터 정보가 없습니다' })).toHaveTextContent(
      '닉네임을 확인한 뒤 다시 검색해 주세요',
    );
  });

  it('aborts an outdated request and ignores its late response', async () => {
    let resolveFirst!: (value: CharacterProfile) => void;
    let firstSignal: AbortSignal | undefined;
    mockedFetchProfile
      .mockImplementationOnce((_nickname, options) => {
        firstSignal = options?.signal ?? undefined;
        return new Promise<CharacterProfile>((resolve) => { resolveFirst = resolve; });
      })
      .mockResolvedValueOnce({ ...profile, CharacterName: '최신캐릭터' });

    const { rerender } = render(<Character />);
    await waitFor(() => expect(mockedFetchProfile).toHaveBeenCalledTimes(1));

    mockCurrentSearchParams = new URLSearchParams('nickname=최신캐릭터');
    rerender(<Character />);

    expect(await screen.findByRole('img', { name: '최신캐릭터' })).toBeInTheDocument();
    expect(firstSignal?.aborted).toBe(true);

    await act(async () => { resolveFirst(profile); });
    expect(screen.queryByRole('img', { name: '테스트캐릭터' })).not.toBeInTheDocument();
  });
});
