import { render, screen, within } from '@testing-library/react';
import HomeDashboardIntro from './HomeDashboardIntro';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...rest}>{children}</a>
    ),
  }),
  { virtual: true },
);

describe('HomeDashboardIntro', () => {
  it('groups the mobile quick menu with visible action affordances', () => {
    render(
      <HomeDashboardIntro
        activeEventCount={2}
        calendarGroupCount={3}
        loadingEvents={false}
        loadingCalendar={false}
      />,
    );

    expect(screen.getByRole('heading', { name: '성장에 필요한 도구를 한곳에' })).toHaveClass('break-keep');
    const quickMenu = screen.getByRole('navigation', { name: '빠른 메뉴' });
    expect(within(quickMenu).getAllByRole('link')).toHaveLength(4);
    const weeklyGoldLink = within(quickMenu).getByRole('link', { name: /주간 골드 계산/ });
    expect(within(weeklyGoldLink).getByText('계산하기').parentElement).toHaveClass('opacity-100');
    expect(within(quickMenu).getByRole('link', { name: /시세 랭킹/ })).toHaveAttribute('href', '/market');
  });
});
