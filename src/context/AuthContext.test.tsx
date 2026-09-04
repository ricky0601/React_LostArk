import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  getSupabaseBrowserClient: mocks.getSupabaseBrowserClient,
  isSupabaseConfigured: true,
}));

import { AuthProvider, useAuth } from './AuthContext';

const session = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: '11111111-1111-1111-1111-111111111111',
    app_metadata: {},
    user_metadata: { global_name: '테스트 사용자' },
    aud: 'authenticated',
    created_at: '2026-09-04T00:00:00Z',
  },
} as Session;

const client = {
  auth: {
    exchangeCodeForSession: mocks.exchangeCodeForSession,
    getSession: mocks.getSession,
    onAuthStateChange: mocks.onAuthStateChange,
    signInWithOAuth: mocks.signInWithOAuth,
    signOut: mocks.signOut,
  },
};

const Probe = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="user">{auth.user?.id ?? 'none'}</span>
      {auth.errorMessage && <span role="alert">{auth.errorMessage}</span>}
      <button type="button" onClick={() => void auth.signInWithDiscord()}>login</button>
      <button type="button" onClick={() => void auth.signOut()}>logout</button>
    </div>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/');
  mocks.getSupabaseBrowserClient.mockReturnValue(client);
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null });
  mocks.signInWithOAuth.mockResolvedValue({ data: { provider: 'discord', url: null }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mocks.unsubscribe } },
  });
});

test('keeps children available when Supabase environment variables are missing', () => {
  mocks.getSupabaseBrowserClient.mockReturnValue(null);

  render(<AuthProvider><Probe /></AuthProvider>);

  expect(screen.getByTestId('status')).toHaveTextContent('unavailable');
  expect(mocks.getSession).not.toHaveBeenCalled();
});

test('restores an existing session and unsubscribes on unmount', async () => {
  mocks.getSession.mockResolvedValue({ data: { session }, error: null });

  const view = render(<AuthProvider><Probe /></AuthProvider>);

  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
  expect(screen.getByTestId('user')).toHaveTextContent(session.user.id);

  view.unmount();
  expect(mocks.unsubscribe).toHaveBeenCalledOnce();
});

test('exchanges a PKCE code on the callback route', async () => {
  window.history.replaceState({}, '', '/auth/callback?code=test-code');

  render(<AuthProvider><Probe /></AuthProvider>);

  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('test-code');
  expect(mocks.getSession).not.toHaveBeenCalled();
});

test('reports an OAuth cancellation without blocking anonymous use', async () => {
  window.history.replaceState({}, '', '/auth/callback?error=access_denied');

  render(<AuthProvider><Probe /></AuthProvider>);

  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
  expect(screen.getByRole('alert')).toHaveTextContent('다시 시도');
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
});

test('does not treat an error query on a public route as an OAuth callback', async () => {
  window.history.replaceState({}, '', '/?error=search-filter');

  render(<AuthProvider><Probe /></AuthProvider>);

  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
  expect(mocks.getSession).toHaveBeenCalledOnce();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('starts Discord OAuth with the exact callback and signs out', async () => {
  mocks.getSession.mockResolvedValue({ data: { session }, error: null });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

  await userEvent.click(screen.getByRole('button', { name: 'login' }));
  expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });

  await userEvent.click(screen.getByRole('button', { name: 'logout' }));
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
  expect(mocks.signOut).toHaveBeenCalledOnce();
});
