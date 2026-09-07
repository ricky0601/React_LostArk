import { fetchSavedLokkiRoster, setLokkiRepresentative, syncLokkiRoster, toSiblingCharacter } from './lokkiRoster';
import type { LokkiCharacter, LokkiRoster } from '../types/lokkiAccount';

const roster: LokkiRoster = {
  id: 'roster-1',
  user_id: 'user-1',
  representative_character_name: '대표캐릭',
  created_at: '2026-09-04T00:00:00.000Z',
  updated_at: '2026-09-04T00:00:00.000Z',
};

const character: LokkiCharacter = {
  id: 'character-1',
  user_id: 'user-1',
  roster_id: 'roster-1',
  character_name: '대표캐릭',
  server_name: '루페온',
  character_class: '슬레이어',
  item_level: 1710,
  combat_power: 123456,
  is_main: true,
  last_synced_at: '2026-09-04T00:00:00.000Z',
  created_at: '2026-09-04T00:00:00.000Z',
  updated_at: '2026-09-04T00:00:00.000Z',
};

describe('lokki roster storage', () => {
  it('maps a saved character back to the public siblings contract', () => {
    expect(toSiblingCharacter(character)).toEqual(expect.objectContaining({
      CharacterName: '대표캐릭',
      ServerName: '루페온',
      CharacterClassName: '슬레이어',
      ItemAvgLevel: '1710.00',
    }));
  });

  it('loads the owner roster and its characters', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: roster, error: null });
    const rosterQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle };
    rosterQuery.select.mockReturnValue(rosterQuery);
    rosterQuery.eq.mockReturnValue(rosterQuery);

    const order = vi.fn().mockResolvedValue({ data: [character], error: null });
    const characterQuery = { select: vi.fn(), eq: vi.fn(), order };
    characterQuery.select.mockReturnValue(characterQuery);
    characterQuery.eq.mockReturnValue(characterQuery);

    const client = {
      from: vi.fn()
        .mockReturnValueOnce(rosterQuery)
        .mockReturnValueOnce(characterQuery),
      rpc: vi.fn(),
    };

    await expect(fetchSavedLokkiRoster(client as never, 'user-1')).resolves.toEqual({ roster, characters: [character] });
    expect(rosterQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(characterQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('sends one atomic sync payload with normalized levels and combat power', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await syncLokkiRoster({ rpc, from: vi.fn() } as never, '대표캐릭', [{
      ServerName: '루페온',
      CharacterName: '대표캐릭',
      CharacterLevel: 70,
      CharacterClassName: '슬레이어',
      ItemAvgLevel: '1,710.00',
      ItemMaxLevel: '1,710.00',
    }], { 대표캐릭: '123,456' });

    expect(rpc).toHaveBeenCalledWith('lokki_sync_roster', expect.objectContaining({
      p_representative_character_name: '대표캐릭',
      p_characters: [expect.objectContaining({ item_level: 1710, combat_power: 123456 })],
    }));
  });

  it('surfaces sync errors and can release the representative character', async () => {
    const failedRpc = vi.fn().mockResolvedValue({ error: new Error('unavailable') });
    await expect(syncLokkiRoster({ rpc: failedRpc, from: vi.fn() } as never, null, [])).rejects.toThrow('unavailable');

    const rpc = vi.fn().mockResolvedValue({ error: null });
    await setLokkiRepresentative({ rpc, from: vi.fn() } as never, null);
    expect(rpc).toHaveBeenCalledWith('lokki_set_representative', { p_representative_character_name: null });
  });
});
