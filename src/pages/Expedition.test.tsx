import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Expedition from './Expedition';
import type { CharacterProfile } from '../types/lostark';
import { fetchProfile, fetchSiblings } from '../utils/api';

const mockSetSearchParams = jest.fn();
let mockCurrentSearchParams = new URLSearchParams('nickname=원정대장');

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useLocation: () => ({ pathname: '/expedition' }),
    useSearchParams: () => [mockCurrentSearchParams, mockSetSearchParams],
  }),
  { virtual: true },
);

jest.mock('../components/NavBar', () => () => <div>NavBar</div>);
jest.mock('../components/PullToRefresh', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);

jest.mock('../utils/api', () => ({
  fetchProfile: jest.fn(),
  fetchSiblings: jest.fn(),
  LS_NICKNAME: 'lostark_nickname',
}));

const mockedFetchProfile = fetchProfile as jest.MockedFunction<typeof fetchProfile>;
const mockedFetchSiblings = fetchSiblings as jest.MockedFunction<typeof fetchSiblings>;

const profile: CharacterProfile = {
  CharacterImage: 'https://example.com/expedition.png',
  CharacterName: '원정대장',
  CharacterClassName: '슬레이어',
  CharacterLevel: 70,
  ItemAvgLevel: '1,710.00',
  ItemMaxLevel: '1,710.00',
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

describe('Expedition route state affordances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentSearchParams = new URLSearchParams('nickname=원정대장');
    mockSetSearchParams.mockImplementation((nextInit) => {
      mockCurrentSearchParams = new URLSearchParams(nextInit);
    });
  });

  it('shows an intentional fallback when a character card image fails', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '원정대장', CharacterLevel: 70, CharacterClassName: '슬레이어', ItemAvgLevel: '1,710.00', ItemMaxLevel: '1,710.00' },
    ]);
    mockedFetchProfile.mockResolvedValue(profile);

    render(<Expedition />);

    const image = await screen.findByRole('img', { name: '원정대장' });
    fireEvent.error(image);

    expect(screen.getByRole('img', { name: '원정대장 이미지 없음' })).toBeInTheDocument();
  });

  it('explains a failed search and offers a next action', async () => {
    mockedFetchSiblings.mockRejectedValue(new Error('rate limited'));

    render(<Expedition />);

    expect(await screen.findByRole('alert')).toHaveTextContent('요청이 많거나 서버 응답이 지연될 수 있습니다');
    expect(screen.getByRole('button', { name: '닉네임 다시 입력' })).toBeInTheDocument();
  });

  it('returns to nickname input and clears query params after reset action', async () => {
    mockedFetchSiblings.mockRejectedValue(new Error('rate limited'));

    render(<Expedition />);

    await userEvent.click(await screen.findByRole('button', { name: '닉네임 다시 입력' }));

    expect(mockSetSearchParams).toHaveBeenCalledWith({});
    expect(await screen.findByRole('button', { name: '원정대 조회' })).toBeInTheDocument();
  });

  it('shows the empty branch when siblings lookup succeeds with no characters', async () => {
    mockedFetchSiblings.mockResolvedValue([]);

    render(<Expedition />);

    expect(await screen.findByText('원정대 캐릭터가 없습니다')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('원정대 캐릭터가 없습니다');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the no-profile branch when sibling profile lookups all return empty', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '부캐1', CharacterLevel: 70, CharacterClassName: '바드', ItemAvgLevel: '1,600.00', ItemMaxLevel: '1,600.00' },
    ]);
    mockedFetchProfile.mockResolvedValue(null as never);

    render(<Expedition />);

    expect(await screen.findByRole('alert')).toHaveTextContent('원정대 프로필을 불러오지 못했습니다');
  });
});
