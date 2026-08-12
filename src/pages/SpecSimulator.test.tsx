import { render, screen } from '@testing-library/react';
import SpecSimulator from './SpecSimulator';
import { fetchProfile } from '../utils/api';

const longNickname = '모바일에서도아주긴캐릭터닉네임이잘리는일없이표시되어야합니다';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSearchParams: () => [new URLSearchParams(`nickname=${longNickname}`), jest.fn()],
  }),
  { virtual: true },
);

jest.mock('../components/NavBar', () => () => <div>NavBar</div>);
jest.mock('../components/PullToRefresh', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('../components/simulation/SpecScoreSimulator', () => () => <div>SpecScoreSimulator</div>);

jest.mock('../utils/api', () => ({
  fetchProfile: jest.fn(),
  LS_NICKNAME: 'lostark_nickname',
}));

const mockedFetchProfile = fetchProfile as jest.MockedFunction<typeof fetchProfile>;

describe('SpecSimulator route error guidance', () => {
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
});
