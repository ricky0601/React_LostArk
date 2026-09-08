import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchLokkiRepresentative } from '../../lib/lokkiAccount';
import { getSupabaseBrowserClient } from '../../lib/supabase';

interface Options {
  readonly urlNickname: string | null;
  readonly disabled: boolean;
  readonly setNickname: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useSavedRepresentative = ({ urlNickname, disabled, setNickname }: Options): boolean => {
  const { status, user } = useAuth();
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    if (disabled || urlNickname) {
      setRestoring(false);
      return;
    }
    if (status === 'loading') {
      setRestoring(true);
      return;
    }
    if (status !== 'authenticated' || !user) {
      setNickname(null);
      setRestoring(false);
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setNickname(null);
      setRestoring(false);
      return;
    }

    let active = true;
    setNickname(null);
    setRestoring(true);
    void fetchLokkiRepresentative(client, user.id)
      .then((representativeName) => {
        if (active) setNickname(representativeName);
      })
      .catch(() => {
        if (active) setNickname(null);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });

    return () => { active = false; };
  }, [disabled, setNickname, status, urlNickname, user?.id]);

  return restoring;
};
