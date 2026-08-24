import { act, render, screen, waitFor } from '@testing-library/react';
import SpecSimulator from './SpecSimulator';
import type { CharacterProfile } from '../types/lostark';
import { fetchProfile } from '../utils/api';

const longNickname = '모바일에서도아주긴캐릭터닉네임이잘리는일없이표시되어야합니다';
let mockCurrentSearchParams = new URLSearchParams(`nickname=${longNickname}`);

vi.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSearchParams: () => [mockCurrentSearchParams, vi.fn()],
  }),
  { virtual: true },
);

vi.mock('../components/NavBar', () => ({ default: () => <div>NavBar</div> }));
vi.mock('../components/PullToRefresh', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../components/simulation/SpecScoreSimulator', () => ({ default: () => <div>SpecScoreSimulator</div> }));

vi.mock('../utils/api', () => ({
  fetchProfile: vi.fn(),
  LS_NICKNAME: 'lostark_nickname',
}));

const mockedFetchProfile = vi.mocked(fetchProfile);

describe('SpecSimulator route error guidance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentSearchParams = new URLSearchParams(`nickname=${longNickname}`);
  });

  it('keeps the searched nickname in a wrapping-friendly error heading', async () => {
    mockedFetchProfile.mockRejectedValue(new Error('rate limited'));

    render(<SpecSimulator />);

    const alert = await screen.findByRole('alert');
    const heading = screen.getByRole('heading', { name: `${longNickname} 프로필을 불러오지 못했습니다` });
    expect(alert).toHaveTextContent('다른 닉네임으로 다시 검색해 주세요');
    expect(heading).toHaveClass('break-words');
  });

  it('shows the not-found branch when profile lookup succeeds with no data', async () => {
    mockedFetchProfile.mockResolvedValue(null as never);

    render(<SpecSimulator />);

    expect(await screen.findByRole('status', { name: `${longNickname} 프로필을 찾을 수 없습니다` })).toHaveTextContent(
      '닉네임을 확인한 뒤 다른 캐릭터를 다시 검색해 주세요',
    );
  });

  it('aborts an outdated profile request and ignores its late response', async () => {
    let resolveFirst!: (value: CharacterProfile) => void;
    let firstSignal: AbortSignal | undefined;
    const oldProfile = { CharacterName: longNickname } as CharacterProfile;
    const latestProfile = { CharacterName: '최신캐릭터' } as CharacterProfile;
    mockedFetchProfile
      .mockImplementationOnce((_nickname, options) => {
        firstSignal = options?.signal ?? undefined;
        return new Promise<CharacterProfile>((resolve) => { resolveFirst = resolve; });
      })
      .mockResolvedValueOnce(latestProfile);

    const { rerender } = render(<SpecSimulator />);
    await waitFor(() => expect(mockedFetchProfile).toHaveBeenCalledTimes(1));

    mockCurrentSearchParams = new URLSearchParams('nickname=최신캐릭터');
    rerender(<SpecSimulator />);

    expect(await screen.findByRole('heading', { name: '최신캐릭터' })).toBeInTheDocument();
    expect(firstSignal?.aborted).toBe(true);

    await act(async () => { resolveFirst(oldProfile); });
    expect(screen.queryByRole('heading', { name: longNickname })).not.toBeInTheDocument();
  });
});
