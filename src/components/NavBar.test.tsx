import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
      useLocation: () => ({ pathname: '/' }),
    };
  },
  { virtual: true },
);

import { ThemeProvider } from '../context/ThemeContext';
import NavBar from './NavBar';

const renderNavBar = () =>
  render(
    <ThemeProvider>
      <NavBar />
    </ThemeProvider>,
  );

test('theme toggle button switches label and root class on click', async () => {
  renderNavBar();

  const toggleButton = screen.getByRole('button', { name: '라이트 모드로 전환' });
  expect(document.documentElement).toHaveClass('dark');

  await userEvent.click(toggleButton);

  expect(document.documentElement).not.toHaveClass('dark');
  expect(screen.getByRole('button', { name: '다크 모드로 전환' })).toBeInTheDocument();
});

test('mobile menu opens as an overlay with a scrim and closes on scrim click', async () => {
  renderNavBar();

  await userEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));

  expect(document.getElementById('navbar-mobile-menu')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '메뉴 닫기' })).toHaveAttribute('aria-expanded', 'true');

  await userEvent.click(screen.getByTestId('mobile-menu-scrim'));

  expect(document.getElementById('navbar-mobile-menu')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute('aria-expanded', 'false');
});

test('mobile menu closes on Escape key', async () => {
  renderNavBar();

  await userEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
  expect(document.getElementById('navbar-mobile-menu')).toBeInTheDocument();

  await userEvent.keyboard('{Escape}');

  expect(document.getElementById('navbar-mobile-menu')).not.toBeInTheDocument();
});
