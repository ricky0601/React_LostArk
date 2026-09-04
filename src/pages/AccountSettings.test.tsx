import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import type { LokkiDataScopeSummary } from '../lib/lokkiAccount';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/supabase', () => ({ getSupabaseBrowserClient: vi.fn() }));
vi.mock('../lib/lokkiAccount', async () => {
  const actual = await vi.importActual<typeof import('../lib/lokkiAccount')>('../lib/lokkiAccount');
  return { ...actual, fetchLokkiDataScope: vi.fn(), syncLokkiProfile: vi.fn() };
});

import { useAuth } from '../context/AuthContext';
import { getSupabaseBrowserClient } from '../lib/supabase';
import { fetchLokkiDataScope, syncLokkiProfile } from '../lib/lokkiAccount';
import AccountSettings from './AccountSettings';

const client = { from: vi.fn() } as unknown as ReturnType<typeof getSupabaseBrowserClient>;
const testUser = {
  id: 'user-1',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-09-04T00:00:00Z',
} as unknown as User;

const scopeSummary: LokkiDataScopeSummary = {
  profile: {
    user_id: 'user-1',
    display_name: '1_d_g',
    avatar_url: null,
    discord_id: null,
    created_at: '2026-09-04T00:00:00Z',
    updated_at: '2026-09-04T01:00:00Z',
  },
  rosterCount: 0,
  characterCount: 0,
  weeklyStateCount: 0,
  lastUpdatedAt: '2026-09-04T01:00:00Z',
};

const authValue = (overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> => ({
  status: 'authenticated',
  session: { access_token: 'token-1' } as ReturnType<typeof useAuth>['session'],
  user: testUser,
  isBusy: false,
  errorMessage: null,
  errorScope: null,
  signInWithDiscord: vi.fn(),
  signOut: vi.fn(),
  clearError: vi.fn(),
  ...overrides,
});

const renderPage = (initialEntries = ['/account']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/account" element={<AccountSettings />} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue(authValue());
  vi.mocked(getSupabaseBrowserClient).mockReturnValue(client);
  vi.mocked(fetchLokkiDataScope).mockResolvedValue(scopeSummary);
  vi.mocked(syncLokkiProfile).mockResolvedValue(true);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('shows the profile and stored data scope for a signed-in user', async () => {
  renderPage();

  expect(await screen.findByRole('heading', { name: '프로필' })).toBeInTheDocument();
  expect(screen.getByText('1_d_g')).toBeInTheDocument();
  expect(screen.getByText(/Discord 연동 대기 중/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '저장 중인 데이터' })).toBeInTheDocument();
  expect(screen.getByText(/마지막 갱신/)).toBeInTheDocument();
  expect(screen.getByText('계정 설정', { selector: 'h1' })).toBeInTheDocument();
  expect(syncLokkiProfile).toHaveBeenCalledWith(client, testUser);
});

test('refreshes the Discord profile on demand', async () => {
  renderPage();

  await userEvent.click(await screen.findByRole('button', { name: 'Discord 프로필 정보 갱신' }));

  expect(await screen.findByRole('status')).toHaveTextContent('갱신했습니다');
  expect(syncLokkiProfile).toHaveBeenCalledTimes(2);
});

test('redirects anonymous visitors to the home route', async () => {
  vi.mocked(useAuth).mockReturnValue(authValue({ status: 'anonymous', user: null, session: null }));

  renderPage();

  expect(await screen.findByText('Home Page')).toBeInTheDocument();
});

test('shows a notice when auth is unavailable', async () => {
  vi.mocked(useAuth).mockReturnValue(authValue({ status: 'unavailable', user: null, session: null }));

  renderPage();

  expect(await screen.findByText('현재 환경에는 로그인 기능이 설정되어 있지 않습니다.')).toBeInTheDocument();
});

test('requires typed confirmation before account deletion', async () => {
  renderPage();

  await userEvent.click(await screen.findByRole('button', { name: '계정 삭제' }));
  const confirmButton = screen.getByRole('button', { name: '계정 영구 삭제' });
  expect(confirmButton).toBeDisabled();

  await userEvent.type(screen.getByLabelText(/계속하려면/), '삭제');

  expect(confirmButton).toBeEnabled();
});

test('deletes the account with the session token and reloads the app', async () => {
  const replaceMock = vi.fn();
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', { configurable: true, value: { replace: replaceMock } });

  try {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: '계정 삭제' }));
    await userEvent.type(screen.getByLabelText(/계속하려면/), '삭제');
    await userEvent.click(screen.getByRole('button', { name: '계정 영구 삭제' }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'));
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/account-delete', {
      method: 'POST',
      headers: { authorization: 'Bearer token-1' },
    });
  } finally {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  }
});

test('shows a recovery message when deletion fails', async () => {
  renderPage();

  vi.mocked(fetch).mockResolvedValue({ ok: false, status: 502 } as Response);
  await userEvent.click(await screen.findByRole('button', { name: '계정 삭제' }));
  await userEvent.type(screen.getByLabelText(/계속하려면/), '삭제');
  await userEvent.click(screen.getByRole('button', { name: '계정 영구 삭제' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('계정을 삭제하지 못했습니다');
});
