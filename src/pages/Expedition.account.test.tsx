import { StrictMode, useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Expedition from './Expedition';
import { syncLokkiProfile } from '../lib/lokkiAccount';
import { fetchSavedLokkiRoster, syncLokkiRoster } from '../lib/lokkiRoster';
import { fetchSiblings } from '../utils/api';

let searchParams = new URLSearchParams();
const setSearchParams = vi.fn((next: URLSearchParamsInit) => { searchParams = new URLSearchParams(next); });
const client = { from: vi.fn(), rpc: vi.fn() };
let auth: { status: string; user: { id: string } | null } = { status: 'authenticated', user: { id: 'user-1' } };

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocation: () => ({ pathname: '/expedition' }),
  useSearchParams: () => [searchParams, setSearchParams],
}));
vi.mock('../components/NavBar', () => ({ default: () => <div>NavBar</div> }));
vi.mock('../components/PullToRefresh', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../components/expedition/ExpeditionDashboard', () => ({
  default: ({ siblings, onProfilesChange }: {
    siblings: Array<{ CharacterName: string }>;
    onProfilesChange?: (profiles: Array<{ CharacterName: string; CombatPower: string }>) => void;
  }) => {
    useEffect(() => onProfilesChange?.(siblings.map((character) => ({ CharacterName: character.CharacterName, CombatPower: '123,456' }))), [onProfilesChange, siblings]);
    return <div>dashboard:{siblings.map((character) => character.CharacterName).join(',')}</div>;
  },
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => auth,
}));
vi.mock('../lib/supabase', () => ({ getSupabaseBrowserClient: () => client }));
vi.mock('../lib/lokkiAccount', () => ({ syncLokkiProfile: vi.fn() }));
vi.mock('../lib/lokkiRoster', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/lokkiRoster')>();
  return {
    ...original,
    fetchSavedLokkiRoster: vi.fn(),
    syncLokkiRoster: vi.fn(),
  };
});
vi.mock('../utils/api', () => ({
  fetchSiblings: vi.fn(),
  LS_NICKNAME: 'lostark_nickname',
}));

const savedCharacter = {
  id: 'character-1',
  user_id: 'user-1',
  roster_id: 'roster-1',
  character_name: '저장대표',
  server_name: '루페온',
  character_class: '슬레이어',
  item_level: 1710,
  combat_power: 123456,
  last_synced_at: '2026-09-04T12:00:00.000Z',
  created_at: '2026-09-04T12:00:00.000Z',
  updated_at: '2026-09-04T12:00:00.000Z',
};

const savedRoster = {
  roster: {
    id: 'roster-1',
    user_id: 'user-1',
    created_at: '2026-09-04T12:00:00.000Z',
    updated_at: '2026-09-04T12:00:00.000Z',
  },
  characters: [savedCharacter],
};

const sibling = {
  ServerName: '루페온',
  CharacterName: '검색대표',
  CharacterLevel: 70,
  CharacterClassName: '바드',
  ItemAvgLevel: '1,700.00',
  ItemMaxLevel: '1,700.00',
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => { resolve = promiseResolve; });
  return { promise, resolve };
};

describe('Expedition account roster flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    auth = { status: 'authenticated', user: { id: 'user-1' } };
    searchParams = new URLSearchParams();
    vi.mocked(fetchSavedLokkiRoster).mockResolvedValue(null);
    vi.mocked(syncLokkiProfile).mockResolvedValue(true);
    vi.mocked(syncLokkiRoster).mockResolvedValue('2026-09-04T13:00:00.000Z');
    vi.mocked(fetchSiblings).mockResolvedValue([sibling]);
  });

  it('restores the saved roster without requiring the public API', async () => {
    vi.mocked(fetchSavedLokkiRoster).mockResolvedValue(savedRoster);

    render(<Expedition />);

    expect(await screen.findByText('dashboard:저장대표')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '내 원정대 저장' })).toBeInTheDocument();
    expect(screen.getByText(/마지막 저장:/)).toBeInTheDocument();
    expect(fetchSiblings).not.toHaveBeenCalled();
  });

  it('shows a blank search instead of using the local nickname when no roster is saved', async () => {
    window.localStorage.setItem('lostark_nickname', '로컬대표');

    render(<Expedition />);

    const input = await screen.findByRole('textbox', { name: '캐릭터 닉네임' });
    expect(input).toHaveValue('');
    expect(fetchSiblings).not.toHaveBeenCalled();
  });

  it('finishes an empty roster restoration in React StrictMode', async () => {
    render(<StrictMode><Expedition /></StrictMode>);

    expect(await screen.findByRole('button', { name: '원정대 조회' })).toBeInTheDocument();
    expect(screen.queryByText('저장된 원정대를 불러오는 중입니다')).not.toBeInTheDocument();
    expect(fetchSiblings).not.toHaveBeenCalled();
  });

  it('returns to search and retries restoration after a saved roster lookup failure', async () => {
    vi.mocked(fetchSavedLokkiRoster).mockRejectedValueOnce(new Error('temporary failure'));

    const { rerender } = render(<Expedition />);

    expect(await screen.findByRole('button', { name: '원정대 조회' })).toBeInTheDocument();
    expect(fetchSiblings).not.toHaveBeenCalled();

    auth = { status: 'anonymous', user: null };
    rerender(<Expedition />);
    auth = { status: 'authenticated', user: { id: 'user-1' } };
    rerender(<Expedition />);
    await waitFor(() => expect(fetchSavedLokkiRoster).toHaveBeenCalledTimes(2));
  });

  it('saves a fetched roster and loaded combat power', async () => {
    searchParams = new URLSearchParams('nickname=검색대표');
    render(<Expedition />);

    expect(await screen.findByText('dashboard:검색대표')).toBeInTheDocument();
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: '내 원정대 저장' }));
    });

    await waitFor(() => expect(syncLokkiRoster).toHaveBeenCalledWith(
      client,
      [sibling],
      { 검색대표: '123,456' },
    ));
    expect(await screen.findByText('내 원정대를 계정에 저장했습니다.')).toBeInTheDocument();
  });

  it('keeps restored rows visible when a requested refresh fails', async () => {
    vi.mocked(fetchSavedLokkiRoster).mockResolvedValue(savedRoster);
    vi.mocked(fetchSiblings).mockRejectedValue(new Error('unavailable'));
    render(<Expedition />);

    expect(await screen.findByText('dashboard:저장대표')).toBeInTheDocument();
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: '최신 정보 조회' }));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('마지막 정상 데이터를 표시합니다');
    expect(screen.getAllByText(/마지막 정상 데이터를 표시합니다/)).toHaveLength(1);
    expect(screen.queryByRole('status', { name: /마지막 정상 데이터/ })).not.toBeInTheDocument();
    expect(screen.getByText('dashboard:저장대표')).toBeInTheDocument();
  });

  it('clears user A roster while user B restoration is delayed', async () => {
    const savedUserBRoster = {
      roster: { ...savedRoster.roster, id: 'roster-2', user_id: 'user-2' },
      characters: [{
        ...savedCharacter,
        id: 'character-2',
        user_id: 'user-2',
        roster_id: 'roster-2',
        character_name: 'B대표',
      }],
    };
    const userBRoster = deferred<typeof savedUserBRoster>();
    vi.mocked(fetchSavedLokkiRoster).mockImplementation((_client, userId) => (
      userId === 'user-1' ? Promise.resolve(savedRoster) : userBRoster.promise
    ));
    const { rerender } = render(<Expedition />);

    expect(await screen.findByText('dashboard:저장대표')).toBeInTheDocument();
    expect(window.localStorage.getItem('lostark_nickname')).toBeNull();

    auth = { status: 'authenticated', user: { id: 'user-2' } };
    rerender(<Expedition />);

    await waitFor(() => expect(screen.queryByText('dashboard:저장대표')).not.toBeInTheDocument());
    await waitFor(() => expect(fetchSavedLokkiRoster).toHaveBeenCalledWith(client, 'user-2'));
    expect(screen.queryByRole('button', { name: '내 원정대 저장' })).not.toBeInTheDocument();
    expect(syncLokkiRoster).not.toHaveBeenCalled();

    await act(async () => { userBRoster.resolve(savedUserBRoster); });
    expect(await screen.findByText('dashboard:B대표')).toBeInTheDocument();
    expect(fetchSiblings).not.toHaveBeenCalled();
  });

  it('clears the restored roster from the screen after sign-out', async () => {
    vi.mocked(fetchSavedLokkiRoster).mockResolvedValue(savedRoster);
    const { rerender } = render(<Expedition />);

    expect(await screen.findByText('dashboard:저장대표')).toBeInTheDocument();

    auth = { status: 'anonymous', user: null };
    rerender(<Expedition />);

    await waitFor(() => expect(screen.queryByText('dashboard:저장대표')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '내 원정대 저장' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '원정대 조회' })).toBeInTheDocument();
    expect(fetchSiblings).not.toHaveBeenCalled();
  });
});
