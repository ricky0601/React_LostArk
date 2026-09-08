import { fetchLokkiRepresentative, setLokkiRepresentative, syncLokkiProfile } from './lokkiAccount';
import type { User } from '@supabase/supabase-js';

const user = {
  id: 'user-1',
  user_metadata: {
    global_name: '테스트 사용자',
    avatar_url: 'https://example.com/avatar.png',
  },
} as User;

const updateQuery = (data: unknown) => {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return query;
};

describe('lokki profile synchronization', () => {
  it('reads and writes the representative on the account profile', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { representative_character_name: '대표캐릭' }, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn().mockReturnValue(query), rpc };

    await expect(fetchLokkiRepresentative(client as never, user.id)).resolves.toBe('대표캐릭');
    await setLokkiRepresentative(client as never, '대표캐릭');

    expect(client.from).toHaveBeenCalledWith('lokki_profiles');
    expect(rpc).toHaveBeenCalledWith('lokki_set_representative', {
      p_representative_character_name: '대표캐릭',
    });
  });

  it('updates profile fields without attempting to update the protected user_id column', async () => {
    const query = updateQuery({ user_id: user.id });
    const client = { from: vi.fn().mockReturnValue(query) };

    await expect(syncLokkiProfile(client as never, user)).resolves.toBe(true);

    expect(query.update).toHaveBeenCalledWith({
      display_name: '테스트 사용자',
      avatar_url: 'https://example.com/avatar.png',
    });
    expect(query.update).not.toHaveBeenCalledWith(expect.objectContaining({ user_id: expect.anything() }));
  });

  it('inserts the profile when an existing Auth user has no application profile', async () => {
    const query = updateQuery(null);
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn()
        .mockReturnValueOnce(query)
        .mockReturnValueOnce({ insert }),
    };

    await expect(syncLokkiProfile(client as never, user)).resolves.toBe(true);

    expect(insert).toHaveBeenCalledWith({
      user_id: user.id,
      display_name: '테스트 사용자',
      avatar_url: 'https://example.com/avatar.png',
    });
  });
});
