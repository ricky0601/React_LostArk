import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Expedition from './Expedition';
import { fetchSavedLokkiRoster, setLokkiRepresentative, syncLokkiRoster } from '../lib/lokkiRoster';
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
vi.mock('../lib/lokkiRoster', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/lokkiRoster')>();
  return {
    ...original,
    fetchSavedLokkiRoster: vi.fn(),
    syncLokkiRoster: vi.fn(),
    setLokkiRepresentative: vi.fn(),
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
  is_main: true,
  last_synced_at: '2026-09-04T12:00:00.000Z',
  created_at: '2026-09-04T12:00:00.000Z',
  updated_at: '2026-09-04T12:00:00.000Z',
};

const savedRoster = {
  roster: {
    id: 'roster-1',
    user_id: 'user-1',
    representative_character_name: '저장대표',
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

describe('Expedition account roster flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    auth = { status: 'authenticated', user: { id: 'user-1' } };
    searchParams = new URLSearchParams();
    vi.mocked(fetchSavedLokkiRoster).mockResolvedValue(null);
    vi.mocked(syncLokkiRoster).mockResolvedValue('2026-09-04T13:00:00.000Z');
    vi.mocked(setLokkiRepresentative).mockResolvedValue();
    vi.mocked(fetchSiblings).mockResolvedValue([sibling]);
  });

  it('restores the saved roster without requiring the public API', async () => {
    vi.mocked(fetchSavedLokkiRoster).mockResolvedValue(savedRoster);

    render(<Expedition />);

    expect(await screen.findByText('dashboard:저장대표')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '대표 캐릭터' })).toHaveValue('저장대표');
    expect(screen.getByText(/마지막 저장:/)).toBeInTheDocument();
    expect(fetchSiblings).not.toHaveBeenCalled();
  });

  it('saves a fetched roster with its representative and loaded combat power', async () => {
    searchParams = new URLSearchParams('nickname=검색대표');
    render(<Expedition />);

    expect(await screen.findByText('dashboard:검색대표')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '원정대 저장' }));

    await waitFor(() => expect(syncLokkiRoster).toHaveBeenCalledWith(
      client,
      '검색대표',
      [sibling],
      { 검색대표: '123,456' },
    ));
    expect(await screen.findByText('원정대와 대표 캐릭터를 계정에 저장했습니다.')).toBeInTheDocument();
  });

  it('keeps restored rows visible when a requested refresh fails', async () => {
    vi.mocked(fetchSavedLokkiRoster).mockResolvedValue(savedRoster);
    vi.mocked(fetchSiblings).mockRejectedValue(new Error('unavailable'));
    render(<Expedition />);

    expect(await screen.findByText('dashboard:저장대표')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '최신 정보 조회' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('마지막 정상 데이터를 표시합니다');
    expect(screen.getByText('dashboard:저장대표')).toBeInTheDocument();
  });

  it('clears the restored roster from the screen after sign-out', async () => {
    vi.mocked(fetchSavedLokkiRoster).mockResolvedValue(savedRoster);
    const { rerender } = render(<Expedition />);

    expect(await screen.findByText('dashboard:저장대표')).toBeInTheDocument();

    auth = { status: 'anonymous', user: null };
    rerender(<Expedition />);

    await waitFor(() => expect(screen.queryByText('dashboard:저장대표')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '원정대 저장' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '원정대 조회' })).toBeInTheDocument();
    expect(fetchSiblings).not.toHaveBeenCalled();
  });
});
