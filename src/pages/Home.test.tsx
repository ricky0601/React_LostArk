import { render, screen, within } from '@testing-library/react';
import Home from './Home';
import { fetchCalendar, fetchEvents } from '../utils/api';

jest.mock('../components/NavBar', () => () => <div>NavBar</div>);
jest.mock('../components/PullToRefresh', () => ({ children }: { readonly children: React.ReactNode }) => <>{children}</>);
jest.mock('../components/home/HomeDashboardIntro', () => () => <section>Dashboard intro</section>);

jest.mock('../utils/api', () => ({
  fetchEvents: jest.fn(),
  fetchCalendar: jest.fn(),
}));

const mockedFetchEvents = fetchEvents as jest.MockedFunction<typeof fetchEvents>;
const mockedFetchCalendar = fetchCalendar as jest.MockedFunction<typeof fetchCalendar>;

const activeDate = new Date(Date.now() + 86_400_000).toISOString();

describe('Home event links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchCalendar.mockResolvedValue([]);
  });

  it('renders only https Lost Ark and STOVE event links as anchors', async () => {
    mockedFetchEvents.mockResolvedValue([
      {
        Title: '공식 로스트아크 이벤트',
        Thumbnail: '/official.webp',
        Link: 'https://lostark.game.onstove.com/Promotion/Event/Views/1',
        StartDate: '2026-01-01T00:00:00',
        EndDate: activeDate,
        RewardDate: null,
      },
      {
        Title: 'STOVE 안내 이벤트',
        Thumbnail: '/stove.webp',
        Link: 'https://event.onstove.com/lostark/notice',
        StartDate: '2026-01-01T00:00:00',
        EndDate: activeDate,
        RewardDate: null,
      },
      {
        Title: '외부 도메인 이벤트',
        Thumbnail: '/external.webp',
        Link: 'https://example.com/phishing',
        StartDate: '2026-01-01T00:00:00',
        EndDate: activeDate,
        RewardDate: null,
      },
      {
        Title: '자바스크립트 이벤트',
        Thumbnail: '/script.webp',
        Link: 'javascript:alert(1)',
        StartDate: '2026-01-01T00:00:00',
        EndDate: activeDate,
        RewardDate: null,
      },
      {
        Title: 'HTTP 이벤트',
        Thumbnail: '/http.webp',
        Link: 'http://lostark.game.onstove.com/event',
        StartDate: '2026-01-01T00:00:00',
        EndDate: activeDate,
        RewardDate: null,
      },
      {
        Title: '깨진 이벤트',
        Thumbnail: '/broken.webp',
        Link: 'https://',
        StartDate: '2026-01-01T00:00:00',
        EndDate: activeDate,
        RewardDate: null,
      },
    ]);

    render(<Home />);

    const official = await screen.findByRole('link', { name: /공식 로스트아크 이벤트/ });
    expect(official).toHaveAttribute('href', 'https://lostark.game.onstove.com/Promotion/Event/Views/1');
    expect(screen.getByRole('link', { name: /STOVE 안내 이벤트/ })).toHaveAttribute(
      'href',
      'https://event.onstove.com/lostark/notice',
    );

    for (const title of ['외부 도메인 이벤트', '자바스크립트 이벤트', 'HTTP 이벤트', '깨진 이벤트']) {
      const card = screen.getByRole('article', { name: `${title} 이벤트 안내 링크 없음` });
      expect(within(card).getByText(title)).toBeInTheDocument();
      expect(within(card).getByText('링크 없음')).toBeInTheDocument();
      expect(card).toHaveClass('cursor-default');
      expect(card).not.toHaveClass('hover:shadow-gold-glow');
      expect(within(card).getByRole('img')).not.toHaveClass('group-hover:scale-105');
      expect(within(card).queryByRole('link')).not.toBeInTheDocument();
    }
  });
});
