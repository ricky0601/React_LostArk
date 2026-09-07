import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchSavedLokkiRoster,
  setLokkiRepresentative,
  sortSiblingCharacters,
  syncLokkiRoster,
  toSiblingCharacter,
} from '../../lib/lokkiRoster';
import { getSupabaseBrowserClient } from '../../lib/supabase';
import type { CharacterProfile, SiblingCharacter } from '../../types/lostark';

interface Options {
  readonly urlNickname: string | null;
  readonly siblings: readonly SiblingCharacter[];
  readonly setNickname: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setSiblings: React.Dispatch<React.SetStateAction<SiblingCharacter[]>>;
}

export const useAccountRoster = ({ urlNickname, siblings, setNickname, setSiblings }: Options) => {
  const { status: authStatus, user } = useAuth();
  const [representativeName, setRepresentativeName] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const skipNextFetchRef = useRef(false);
  const restoredUserRef = useRef<string | null>(null);
  const cloudRosterUserRef = useRef<string | null>(null);
  const combatPowersRef = useRef<Record<string, string | null>>({});

  useEffect(() => {
    if (authStatus !== 'authenticated' || !user || urlNickname || restoredUserRef.current === user.id) return;
    restoredUserRef.current = user.id;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let active = true;

    const restoreRoster = async (): Promise<void> => {
      setRestoring(true);
      try {
        const saved = await fetchSavedLokkiRoster(client, user.id);
        if (!active || !saved || saved.characters.length === 0) return;
        const restoredSiblings = sortSiblingCharacters(saved.characters.map(toSiblingCharacter));
        const restoredRepresentative = saved.roster.representative_character_name;
        skipNextFetchRef.current = true;
        cloudRosterUserRef.current = user.id;
        setSiblings(restoredSiblings);
        setRepresentativeName(restoredRepresentative);
        setLastSyncedAt(saved.characters.reduce<string | null>((latest, character) => {
          if (!character.last_synced_at) return latest;
          return !latest || character.last_synced_at > latest ? character.last_synced_at : latest;
        }, null));
        setNickname(restoredRepresentative ?? restoredSiblings[0].CharacterName);
        setMessage('계정에 저장된 원정대를 복원했습니다.');
      } catch {
        if (active) setMessage('저장된 원정대를 불러오지 못했습니다. 공개 조회는 계속 이용할 수 있습니다.');
      } finally {
        if (active) setRestoring(false);
      }
    };

    void restoreRoster();
    return () => { active = false; };
  }, [authStatus, setNickname, setSiblings, urlNickname, user?.id]);

  useEffect(() => {
    if (authStatus !== 'anonymous' || cloudRosterUserRef.current == null) return;
    cloudRosterUserRef.current = null;
    restoredUserRef.current = null;
    combatPowersRef.current = {};
    setNickname(urlNickname);
    setSiblings([]);
    setRepresentativeName(null);
    setLastSyncedAt(null);
    setMessage(null);
  }, [authStatus, setNickname, setSiblings, urlNickname]);

  const consumeSkipNextFetch = useCallback(() => {
    if (!skipNextFetchRef.current) return false;
    skipNextFetchRef.current = false;
    return true;
  }, []);

  const resetForSearch = useCallback(() => {
    skipNextFetchRef.current = false;
    cloudRosterUserRef.current = null;
    setRepresentativeName(null);
    setLastSyncedAt(null);
    setMessage(null);
  }, []);

  const handleProfilesChange = useCallback((profiles: readonly CharacterProfile[]) => {
    combatPowersRef.current = Object.fromEntries(profiles.map((profile) => [profile.CharacterName, profile.CombatPower]));
  }, []);

  const saveRoster = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client || !user || siblings.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      const syncedAt = await syncLokkiRoster(client, representativeName, siblings, combatPowersRef.current);
      setLastSyncedAt(syncedAt);
      setMessage('원정대와 대표 캐릭터를 계정에 저장했습니다.');
    } catch {
      setMessage('원정대를 저장하지 못했습니다. 기존 저장 데이터는 유지됩니다.');
    } finally {
      setSaving(false);
    }
  }, [representativeName, siblings, user]);

  const releaseRepresentative = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client || !user) return;
    setSaving(true);
    setMessage(null);
    try {
      await setLokkiRepresentative(client, null);
      setRepresentativeName(null);
      setMessage('대표 캐릭터를 해제했습니다.');
    } catch {
      setMessage('대표 캐릭터를 해제하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }, [user]);

  return {
    authStatus,
    representativeName,
    lastSyncedAt,
    restoring,
    saving,
    message,
    setRepresentativeName,
    setMessage,
    consumeSkipNextFetch,
    resetForSearch,
    handleProfilesChange,
    saveRoster,
    releaseRepresentative,
  };
};
