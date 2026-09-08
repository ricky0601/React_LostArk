import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { setLokkiRepresentative, syncLokkiProfile } from '../../lib/lokkiAccount';
import { getSupabaseBrowserClient } from '../../lib/supabase';
import GlassCard from '../GlassCard';

interface Props {
  readonly characterName: string;
}

const RepresentativeCharacterControl: React.FC<Props> = ({ characterName }) => {
  const { status, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const activeUserRef = useRef(user?.id ?? null);

  useEffect(() => {
    activeUserRef.current = user?.id ?? null;
    setSaving(false);
    setMessage(null);
    setFailed(false);
  }, [user?.id]);

  const saveRepresentative = useCallback(async (): Promise<void> => {
    const client = getSupabaseBrowserClient();
    if (!client || !user) return;
    const savingUserId = user.id;
    setSaving(true);
    setMessage(null);
    setFailed(false);
    try {
      const profileReady = await syncLokkiProfile(client, user);
      if (!profileReady) throw new Error('profile sync failed');
      await setLokkiRepresentative(client, characterName);
      if (activeUserRef.current !== savingUserId) return;
      setMessage(`${characterName} 캐릭터를 대표 캐릭터로 저장했습니다.`);
    } catch {
      if (activeUserRef.current !== savingUserId) return;
      setFailed(true);
      setMessage('대표 캐릭터를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (activeUserRef.current === savingUserId) setSaving(false);
    }
  }, [characterName, user]);

  if (status !== 'authenticated' || !user) return null;

  return (
    <GlassCard className="p-4 animate-slide-up">
      <button
        type="button"
        onClick={() => void saveRepresentative()}
        disabled={saving}
        className="w-full rounded-lg bg-la-gold px-4 py-2 text-sm font-bold text-la-dark transition-opacity disabled:opacity-50"
      >
        {saving ? '저장 중…' : '대표 캐릭터로 저장'}
      </button>
      {message && <p role={failed ? 'alert' : 'status'} className="mt-2 text-xs text-gray-600 dark:text-gray-300">{message}</p>}
    </GlassCard>
  );
};

export default RepresentativeCharacterControl;
