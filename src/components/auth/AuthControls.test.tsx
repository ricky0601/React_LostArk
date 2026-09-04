import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@supabase/supabase-js';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

import { useAuth } from '../../context/AuthContext';
import { AuthControls } from './AuthControls';

const signInWithDiscord = vi.fn();
const signOut = vi.fn();
const clearError = vi.fn();

const authValue = (overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> => ({
  status: 'anonymous',
  session: null,
  user: null,
  isBusy: false,
  errorMessage: null,
  signInWithDiscord,
  signOut,
  clearError,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue(authValue());
});

test('anonymous users can start Discord login', async () => {
  render(<AuthControls />);

  await userEvent.click(screen.getByRole('button', { name: 'Discord 로그인' }));

  expect(signInWithDiscord).toHaveBeenCalledOnce();
});

test('authenticated users see their profile and can log out', async () => {
  const user = {
    id: 'user-id',
    app_metadata: {},
    user_metadata: {
      global_name: 'Lokki 사용자',
      avatar_url: 'https://example.com/avatar.png',
    },
    aud: 'authenticated',
    created_at: '2026-09-04T00:00:00Z',
  } as User;
  vi.mocked(useAuth).mockReturnValue(authValue({ status: 'authenticated', user }));

  const { container } = render(<AuthControls />);

  expect(screen.getByText('Lokki 사용자')).toBeInTheDocument();
  expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/avatar.png');
  await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
  expect(signOut).toHaveBeenCalledOnce();
});

test('login errors are recoverable and dismissible', async () => {
  vi.mocked(useAuth).mockReturnValue(authValue({ errorMessage: '로그인 오류' }));

  render(<AuthControls variant="mobile" />);

  expect(screen.getByRole('alert')).toHaveTextContent('로그인 오류');
  await userEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(clearError).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Discord 로그인' })).toBeEnabled();
});

test('does not render authentication UI when Supabase is not configured', () => {
  vi.mocked(useAuth).mockReturnValue(authValue({ status: 'unavailable' }));

  const { container } = render(<AuthControls />);

  expect(container).toBeEmptyDOMElement();
});
