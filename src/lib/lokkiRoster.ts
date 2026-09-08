import type { SupabaseClient } from '@supabase/supabase-js';
import type { LokkiCharacter, LokkiRoster } from '../types/lokkiAccount';
import type { SiblingCharacter } from '../types/lostark';

type SupabaseLike = Pick<SupabaseClient, 'from' | 'rpc'>;

export interface SavedLokkiRoster {
  readonly roster: LokkiRoster;
  readonly characters: readonly LokkiCharacter[];
}

export interface RosterCombatPowers {
  readonly [characterName: string]: string | null | undefined;
}

const parseNumber = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

export const sortSiblingCharacters = (siblings: readonly SiblingCharacter[]): SiblingCharacter[] => [...siblings].sort((left, right) => {
  const serverOrder = left.ServerName.localeCompare(right.ServerName, 'ko');
  if (serverOrder !== 0) return serverOrder;
  return (parseNumber(right.ItemAvgLevel) ?? 0) - (parseNumber(left.ItemAvgLevel) ?? 0);
});

export const toSiblingCharacter = (character: LokkiCharacter): SiblingCharacter => ({
  ServerName: character.server_name ?? '',
  CharacterName: character.character_name,
  CharacterLevel: 0,
  CharacterClassName: character.character_class ?? '',
  ItemAvgLevel: character.item_level?.toFixed(2) ?? '0.00',
  ItemMaxLevel: character.item_level?.toFixed(2) ?? '0.00',
  CombatPower: character.combat_power?.toLocaleString('en-US', { maximumFractionDigits: 2 }) ?? null,
});

export const fetchSavedLokkiRoster = async (
  client: SupabaseLike,
  userId: string,
): Promise<SavedLokkiRoster | null> => {
  const rosterResult = await client
    .from('lokki_rosters')
    .select('id, user_id, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (rosterResult.error) throw rosterResult.error;
  if (!rosterResult.data) return null;

  const characterResult = await client
    .from('lokki_characters')
    .select('id, user_id, roster_id, character_name, server_name, character_class, item_level, combat_power, last_synced_at, created_at, updated_at')
    .eq('user_id', userId)
    .order('item_level', { ascending: false });

  if (characterResult.error) throw characterResult.error;
  return {
    roster: rosterResult.data as LokkiRoster,
    characters: (characterResult.data ?? []) as LokkiCharacter[],
  };
};

export const syncLokkiRoster = async (
  client: SupabaseLike,
  siblings: readonly SiblingCharacter[],
  combatPowers: RosterCombatPowers = {},
): Promise<string> => {
  const syncedAt = new Date().toISOString();
  const characters = siblings.map((sibling) => ({
    character_name: sibling.CharacterName,
    server_name: sibling.ServerName || null,
    character_class: sibling.CharacterClassName || null,
    item_level: parseNumber(sibling.ItemAvgLevel),
    combat_power: parseNumber(combatPowers[sibling.CharacterName]),
    last_synced_at: syncedAt,
  }));

  const { error } = await client.rpc('lokki_sync_roster', {
    p_characters: characters,
  });
  if (error) throw error;
  return syncedAt;
};
