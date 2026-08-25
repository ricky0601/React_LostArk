import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Simulation from './Simulation';
import type { CharacterProfile, SiblingCharacter } from '../types/lostark';
import { fetchProfile, fetchSiblings } from '../utils/api';

vi.mock('../components/NavBar', () => ({ default: () => <div>NavBar</div> }));
vi.mock('../components/PullToRefresh', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../components/NicknameInput', () => ({
  default: ({ title, description, onSubmit }: { title: string; description: string; onSubmit: (name: string) => void }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      <button onClick={() => onSubmit('테스트캐릭터')}>골드 계산 시작</button>
    </div>
  ),
}));
vi.mock('../components/NicknameSearchBar', () => ({
  default: ({ onSearch }: { onSearch: (name: string) => void }) => (
    <button onClick={() => onSearch('최신캐릭터')}>다른 캐릭터 검색</button>
  ),
}));
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

    expect(screen.getByRole('heading', { level: 1, name: '로아 주간 골드 계산기' })).toBeInTheDocument();
    expect(screen.getByText(/레이드 보상과 더보기 비용/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '골드 계산 시작' })).toBeInTheDocument();
    expect(mockedFetchSiblings).not.toHaveBeenCalled();
  });

  it('loads the expedition after nickname submission and renders the weekly summary', async () => {
    render(<MemoryRouter><Simulation /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: '골드 계산 시작' }));

    await waitFor(() => expect(mockedFetchSiblings).toHaveBeenCalledWith(
      '테스트캐릭터',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
    await waitFor(() => expect(mockedFetchProfile).toHaveBeenCalledWith(
      '테스트캐릭터',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
    expect(await screen.findByText((_, element) =>
      element?.tagName === 'P' && element.textContent?.includes('테스트캐릭터님의 레이드 보상과 더보기 비용') === true,
    )).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '로아 주간 골드 계산기' })).toBeInTheDocument();
    expect(screen.getByText((_, element) =>
      element?.tagName === 'P' && element.textContent?.includes('루페온 서버 | 1 캐릭터') === true,
    )).toBeInTheDocument();
  });

  it('aborts an outdated expedition request when the nickname changes', async () => {
    let firstSignal: AbortSignal | undefined;
    mockedFetchSiblings
      .mockImplementationOnce((_nickname, options) => {
        firstSignal = options?.signal ?? undefined;
        return new Promise(() => undefined);
      })
      .mockResolvedValueOnce([{ ...sibling, CharacterName: '최신캐릭터' }]);
    mockedFetchProfile.mockResolvedValue({ ...profile, CharacterName: '최신캐릭터' });

    render(<MemoryRouter><Simulation /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '골드 계산 시작' }));
    await waitFor(() => expect(mockedFetchSiblings).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '다른 캐릭터 검색' }));

    await waitFor(() => expect(firstSignal?.aborted).toBe(true));
    expect(await screen.findByText((_, element) =>
      element?.tagName === 'P' && element.textContent?.includes('최신캐릭터님의 레이드 보상과 더보기 비용') === true,
    )).toBeInTheDocument();
  });
});
