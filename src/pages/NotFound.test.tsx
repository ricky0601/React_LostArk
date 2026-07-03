import { render, screen } from '@testing-library/react';

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
        <a href={to} {...rest}>
          {children}
        </a>
      ),
      useLocation: () => ({ pathname: '/no-such-route' }),
    };
  },
  { virtual: true },
);

import { ThemeProvider } from '../context/ThemeContext';
import NotFound from './NotFound';

test('renders a 404 message with a link back home', () => {
  render(
    <ThemeProvider>
      <NotFound />
    </ThemeProvider>,
  );

  expect(screen.getByText('404')).toBeInTheDocument();
  expect(screen.getByText('페이지를 찾을 수 없습니다')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
});
