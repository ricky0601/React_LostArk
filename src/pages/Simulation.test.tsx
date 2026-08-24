import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Simulation from './Simulation';
import type { CharacterProfile, SiblingCharacter } from '../types/lostark';
import { fetchProfile, fetchSiblings } from '../utils/api';

vi.mock('../components/NavBar', () => ({ default: () => <div>NavBar</div> }));
vi.mock('../components/PullToRefresh', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../components/NicknameInput', () => ({
  default: ({ onSubmit }: { onSubmit: (name: string) => void }) => (
    <button onClick={() => onSubmit('테스트캐릭터')}>골드 계산 시작</button>
  ),
}));
vi.mock('../components/NicknameSearchBar', () => ({ default: () => <div>NicknameSearchBar</div> }));
vi.mock('../components/simulation/GoldLoadingSkeleton', () => ({ default: () => <div>Loading</div> }));
vi.mock('../components/simulation/CharacterRaidCard', () => ({
  default: ({ result }: { result: { characterName: string } }) => (
    <div>{result.characterName} RaidCard</div>
  ),
}));
vi.mock('../utils/api', () => ({
  fetchSiblings: vi.fn(),
  fetchProfile: vi.fn(),
  LS_NICKNAME: 'lostark_nickname',
}));

const mockedFetchSiblings = vi.mocked(fetchSiblings);
const mockedFetchProfile = vi.mocked(fetchProfile);

const sibling: SiblingCharacter = {
  ServerName: '루페온',
  CharacterName: '테스트캐릭터',
  CharacterLevel: 70,
  CharacterClassName: '바드',
  ItemAvgLevel: '1,700.00',
  ItemMaxLevel: '1,700.00',
};

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

describe('Simulation page orchestration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockedFetchSiblings.mockResolvedValue([sibling]);
    mockedFetchProfile.mockResolvedValue(profile);
  });

  it('shows the nickname entry state without a persisted or URL nickname', () => {
    render(<MemoryRouter><Simulation /></MemoryRouter>);

    expect(screen.getByRole('button', { name: '골드 계산 시작' })).toBeInTheDocument();
    expect(mockedFetchSiblings).not.toHaveBeenCalled();
  });

  it('loads the expedition after nickname submission and renders the weekly summary', async () => {
    render(<MemoryRouter><Simulation /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: '골드 계산 시작' }));

    await waitFor(() => expect(mockedFetchSiblings).toHaveBeenCalledWith('테스트캐릭터'));
    await waitFor(() => expect(mockedFetchProfile).toHaveBeenCalledWith('테스트캐릭터'));
    expect(await screen.findByRole('heading', { name: /테스트캐릭터.*주간 골드/ })).toBeInTheDocument();
    expect(screen.getByText((_, element) =>
      element?.tagName === 'P' && element.textContent?.includes('루페온 서버 | 1 캐릭터') === true,
    )).toBeInTheDocument();
  });
});
