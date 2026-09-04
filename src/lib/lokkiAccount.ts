import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { IsoTimestamp, LokkiProfile } from '../types/lokkiAccount';

const DISPLAY_NAME_MAX_LENGTH = 50;
const AVATAR_URL_MAX_LENGTH = 2048;

type SupabaseLike = Pick<SupabaseClient, 'from'>;

const pickTrimmedString = (metadata: Record<string, unknown> | undefined, keys: readonly string[], maxLength: number): string | null => {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim().slice(0, maxLength);
    }
  }
  return null;
};

export const getDiscordProfileFromMetadata = (user: User) => ({
  displayName: pickTrimmedString(user.user_metadata, ['global_name', 'full_name', 'name'], DISPLAY_NAME_MAX_LENGTH),
  avatarUrl: pickTrimmedString(user.user_metadata, ['avatar_url'], AVATAR_URL_MAX_LENGTH),
});

/** Discord 프로필 변경을 반영해 로아끼욧 프로필을 갱신한다. discord_id는 브라우저에서 쓸 수 없다. */
export const syncLokkiProfile = async (client: SupabaseLike, user: User): Promise<boolean> => {
  const { displayName, avatarUrl } = getDiscordProfileFromMetadata(user);
  const { error } = await client
    .from('lokki_profiles')
    .upsert({ user_id: user.id, display_name: displayName, avatar_url: avatarUrl }, { onConflict: 'user_id' });
  return !error;
};

export interface LokkiDataScopeSummary {
  readonly profile: LokkiProfile | null;
  readonly rosterCount: number;
  readonly characterCount: number;
  readonly weeklyStateCount: number;
  readonly lastUpdatedAt: IsoTimestamp;
}

export const fetchLokkiDataScope = async (
  client: SupabaseLike,
  userId: string,
): Promise<LokkiDataScopeSummary | null> => {
  const [profileResult, rosterCountResult, characterCountResult, weeklyStateCountResult] = await Promise.all([
    client.from('lokki_profiles').select('user_id, display_name, avatar_url, discord_id, created_at, updated_at').eq('user_id', userId).maybeSingle(),
    client.from('lokki_rosters').select('user_id', { count: 'exact', head: true }).eq('user_id', userId),
    client.from('lokki_characters').select('user_id', { count: 'exact', head: true }).eq('user_id', userId),
    client.from('lokki_weekly_states').select('user_id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  if (profileResult.error) return null;

  return {
    profile: profileResult.data ?? null,
    rosterCount: rosterCountResult.count ?? 0,
    characterCount: characterCountResult.count ?? 0,
    weeklyStateCount: weeklyStateCountResult.count ?? 0,
    lastUpdatedAt: profileResult.data?.updated_at ?? profileResult.data?.created_at ?? '',
  };
};
