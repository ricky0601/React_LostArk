import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Simulation from './Simulation';
import type { CharacterProfile, SiblingCharacter } from '../types/lostark';
import { fetchProfile, fetchSiblings } from '../utils/api';

jest.mock('../components/NavBar', () => () => <div>NavBar</div>);
jest.mock('../components/PullToRefresh', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('../components/NicknameInput', () => ({ onSubmit }: { onSubmit: (name: string) => void }) => (
  <button onClick={() => onSubmit('테스트캐릭터')}>골드 계산 시작</button>
));
jest.mock('../components/NicknameSearchBar', () => () => <div>NicknameSearchBar</div>);
jest.mock('../components/simulation/GoldLoadingSkeleton', () => () => <div>Loading</div>);
jest.mock('../components/simulation/CharacterRaidCard', () => ({ result }: { result: { characterName: string } }) => (
  <div>{result.characterName} RaidCard</div>
));
jest.mock('../utils/api', () => ({
  fetchSiblings: jest.fn(),
  fetchProfile: jest.fn(),
  LS_NICKNAME: 'lostark_nickname',
}));

const mockedFetchSiblings = jest.mocked(fetchSiblings);
const mockedFetchProfile = jest.mocked(fetchProfile);

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
    jest.clearAllMocks();
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
