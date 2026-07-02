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

test('mobile menu hides background content from assistive tech and restores focus on close', async () => {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);

  renderNavBar();
  const menuButton = screen.getByRole('button', { name: '메뉴 열기' });

  await userEvent.click(menuButton);

  expect(root).toHaveAttribute('aria-hidden', 'true');
  const panel = document.getElementById('navbar-mobile-menu');
  expect(panel).toHaveAttribute('role', 'dialog');
  expect(panel).toHaveAttribute('aria-modal', 'true');
  expect(document.activeElement).toBe(panel?.querySelector('a'));

  await userEvent.keyboard('{Escape}');

  expect(root).not.toHaveAttribute('aria-hidden');
  expect(document.activeElement).toBe(screen.getByRole('button', { name: '메뉴 열기' }));

  document.body.removeChild(root);
});

test('Tab wraps focus inside the open mobile menu', async () => {
  renderNavBar();

  await userEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));

  const panel = document.getElementById('navbar-mobile-menu') as HTMLElement;
  const links = panel.querySelectorAll('a');
  const first = links[0];
  const last = links[links.length - 1];

  expect(document.activeElement).toBe(first);

  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(last);

  await userEvent.tab();
  expect(document.activeElement).toBe(first);
});
