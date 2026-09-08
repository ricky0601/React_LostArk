import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { syncLokkiProfile } from '../../lib/lokkiAccount';
import {
  fetchSavedLokkiRoster,
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

type MessageTone = 'status' | 'alert';

export const useAccountRoster = ({ urlNickname, siblings, setNickname, setSiblings }: Options) => {
  const { status: authStatus, user } = useAuth();
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>('status');
  const [cloudRosterUserId, setCloudRosterUserId] = useState<string | null>(null);
  const skipNextFetchRef = useRef(false);
  const restoredUserRef = useRef<string | null>(null);
  const activeUserRef = useRef<string | null>(null);
  const cloudRosterUserRef = useRef<string | null>(null);
  const combatPowersRef = useRef<Record<string, string | null>>({});

  const showMessage = useCallback((nextMessage: string | null, tone: MessageTone = 'status') => {
    setMessage(nextMessage);
    setMessageTone(tone);
  }, []);

  const updateCloudRosterUser = useCallback((userId: string | null) => {
    cloudRosterUserRef.current = userId;
    setCloudRosterUserId(userId);
  }, []);

  useEffect(() => {
    const currentUserId = authStatus === 'authenticated' && user ? user.id : null;
    if (activeUserRef.current !== currentUserId) {
      const hadCloudRoster = cloudRosterUserRef.current != null;
      activeUserRef.current = currentUserId;
      restoredUserRef.current = null;
      skipNextFetchRef.current = false;
      combatPowersRef.current = {};
      if (!hadCloudRoster) updateCloudRosterUser(null);
      setLastSyncedAt(null);
      setRestoring(false);
      setSaving(false);
      showMessage(null);
      if (hadCloudRoster) {
        setNickname(null);
        setSiblings([]);
      }
    }

    if (!currentUserId || urlNickname || restoredUserRef.current === currentUserId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    restoredUserRef.current = currentUserId;
    let active = true;

    const restoreRoster = async (): Promise<void> => {
      setRestoring(true);
      try {
        const saved = await fetchSavedLokkiRoster(client, currentUserId);
        if (!active) return;
        if (!saved) return;
        updateCloudRosterUser(currentUserId);
        if (saved.characters.length === 0) return;
        const restoredSiblings = sortSiblingCharacters(saved.characters.map(toSiblingCharacter));
        skipNextFetchRef.current = true;
        setSiblings(restoredSiblings);
        setLastSyncedAt(saved.characters.reduce<string | null>((latest, character) => {
          if (!character.last_synced_at) return latest;
          return !latest || character.last_synced_at > latest ? character.last_synced_at : latest;
        }, null));
        setNickname(restoredSiblings[0].CharacterName);
        showMessage('계정에 저장된 원정대를 복원했습니다.');
      } catch {
        if (active) {
          restoredUserRef.current = null;
          showMessage('저장된 원정대를 불러오지 못했습니다. 닉네임 검색은 계속 이용할 수 있습니다.', 'alert');
        }
      } finally {
        if (active) setRestoring(false);
      }
    };

    void restoreRoster();
    return () => {
      active = false;
      // 개발 StrictMode가 첫 effect를 정리한 뒤 다시 실행할 수 있도록 미완료 복원 표시를 해제한다.
      if (restoredUserRef.current === currentUserId) restoredUserRef.current = null;
    };
  }, [authStatus, setNickname, setSiblings, showMessage, updateCloudRosterUser, urlNickname, user?.id]);

  const consumeSkipNextFetch = useCallback(() => {
    if (!skipNextFetchRef.current) return false;
    skipNextFetchRef.current = false;
    return true;
  }, []);

  const resetForSearch = useCallback(() => {
    skipNextFetchRef.current = false;
    combatPowersRef.current = {};
    updateCloudRosterUser(null);
    setLastSyncedAt(null);
    showMessage(null);
  }, [showMessage, updateCloudRosterUser]);

  const handleRosterFetched = useCallback(() => {
    combatPowersRef.current = {};
    updateCloudRosterUser(activeUserRef.current);
  }, [updateCloudRosterUser]);

  const handleProfilesChange = useCallback((profiles: readonly CharacterProfile[]) => {
    combatPowersRef.current = Object.fromEntries(profiles.map((profile) => [profile.CharacterName, profile.CombatPower]));
  }, []);

  const saveRoster = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client || !user || siblings.length === 0 || (cloudRosterUserId != null && cloudRosterUserId !== user.id)) return;
    const savingUserId = user.id;
    setSaving(true);
    showMessage(null);
    try {
      const profileReady = await syncLokkiProfile(client, user);
      if (!profileReady) throw new Error('profile sync failed');
      const syncedAt = await syncLokkiRoster(client, siblings, combatPowersRef.current);
      if (activeUserRef.current !== savingUserId) return;
      updateCloudRosterUser(savingUserId);
      setLastSyncedAt(syncedAt);
      showMessage('내 원정대를 계정에 저장했습니다.');
    } catch {
      if (activeUserRef.current === savingUserId) {
        showMessage('원정대를 저장하지 못했습니다. 기존 저장 데이터는 유지됩니다.', 'alert');
      }
    } finally {
      if (activeUserRef.current === savingUserId) setSaving(false);
    }
  }, [cloudRosterUserId, showMessage, siblings, updateCloudRosterUser, user]);

  return {
    authStatus,
    lastSyncedAt,
    restoring,
    saving,
    message,
    messageTone,
    showMessage,
    consumeSkipNextFetch,
    resetForSearch,
    handleRosterFetched,
    handleProfilesChange,
    saveRoster,
  };
};
