import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import NicknameInput from '../components/NicknameInput';
import NicknameSearchBar from '../components/NicknameSearchBar';
import GlassCard from '../components/GlassCard';
import StateFeedback from '../components/StateFeedback';
import { SkeletonBlock } from '../components/Loading';
import ExpeditionProfiles from '../components/expedition/ExpeditionProfiles';
import type { CharacterProfile, SiblingCharacter } from '../types/lostark';
import { fetchProfile, fetchSiblings, LS_NICKNAME } from '../utils/api';
import { safeLocalStorage } from '../utils/safeStorage';

function parseItemLevel(level: string): number {
  return parseFloat(level.replace(/,/g, '')) || 0;
}

const Expedition: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlNickname = searchParams.get('nickname');
  const [nickname, setNickname] = useState<string | null>(() => urlNickname || safeLocalStorage.getItem(LS_NICKNAME));
  const [server, setServer] = useState<string | null>(null);
  const [siblings, setSiblings] = useState<SiblingCharacter[]>([]);
  const [profiles, setProfiles] = useState<CharacterProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!urlNickname || urlNickname === nickname) return;
    setNickname(urlNickname);
    setServer(null);
    setSiblings([]);
    setProfiles([]);
    setError(null);
  }, [nickname, urlNickname]);

  const handleNicknameSubmit = (name: string): void => {
    setSearchParams({ nickname: name });
    setNickname(name);
    setServer(null);
    setSiblings([]);
    setProfiles([]);
    setError(null);
  };

  const handleResetSearch = (): void => {
    setSearchParams({});
    setNickname(null);
    setServer(null);
    setSiblings([]);
    setProfiles([]);
    setError(null);
  };

  const fetchCharacterProfile = useCallback(async (characterName: string): Promise<CharacterProfile | null> => {
    try {
      const profile = await fetchProfile(characterName);
      return profile?.CharacterName ? profile : null;
    } catch {
      return null;
    }
  }, []);

  // cancelled 플래그로 race 방지: 닉네임을 빠르게 바꿔도 늦게 도착한 응답은 무시.
  useEffect(() => {
    if (!nickname) return;
    let cancelled = false;

    const loadExpedition = async (): Promise<void> => {
      safeLocalStorage.setItem(LS_NICKNAME, nickname);
      setLoading(true);
      setError(null);

      try {
        const data = await fetchSiblings(nickname);
        if (cancelled) return;

        if (!Array.isArray(data)) {
          setSiblings([]);
          setProfiles([]);
          setServer(null);
          setError('원정대 캐릭터 정보를 불러올 수 없습니다.');
          return;
        }

        if (data.length === 0) {
          setSiblings([]);
          setProfiles([]);
          setServer(null);
          return;
        }

        const serverCounts = new Map<string, number>();
        data.forEach((character) => {
          serverCounts.set(character.ServerName, (serverCounts.get(character.ServerName) || 0) + 1);
        });

        let expeditionServer = data[0].ServerName;
        let maxCount = 0;
        serverCounts.forEach((count, currentServer) => {
          if (count > maxCount) {
            maxCount = count;
            expeditionServer = currentServer;
          }
        });

        const filteredSiblings = data.filter((character) => character.ServerName === expeditionServer);
        setServer(expeditionServer);
        setSiblings(filteredSiblings);

        const result = await Promise.all(filteredSiblings.map((character) => fetchCharacterProfile(character.CharacterName)));
        if (cancelled) return;

        const validProfiles = result
          .filter((profile): profile is CharacterProfile => profile !== null)
          .sort((a, b) => parseItemLevel(b.ItemAvgLevel) - parseItemLevel(a.ItemAvgLevel));

        setProfiles(validProfiles);
      } catch {
        if (cancelled) return;
        setSiblings([]);
        setProfiles([]);
        setServer(null);
        setError('원정대 조회에 실패했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadExpedition();
    return () => { cancelled = true; };
  }, [fetchCharacterProfile, nickname]);

  const summary = useMemo(() => {
    if (profiles.length === 0) {
      return { highestLevel: null as number | null, averageLevel: null as number | null };
    }

    const levels = profiles.map((profile) => parseItemLevel(profile.ItemAvgLevel));
    const total = levels.reduce((sum, level) => sum + level, 0);
    return {
      highestLevel: Math.max(...levels),
      averageLevel: total / levels.length,
    };
  }, [profiles]);

  if (!nickname) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
        <NavBar />
        <NicknameInput
          title="원정대 조회"
          description="캐릭터 닉네임을 입력하면 같은 원정대 캐릭터를 조회합니다"
          buttonText="원정대 조회"
          onSubmit={handleNicknameSubmit}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
      <NavBar />
      <PullToRefresh>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6 text-center animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              <span className="text-la-gold-dark dark:text-la-gold">{nickname}</span>님의 원정대
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {server ? `${server} 서버` : ''}
              {profiles.length > 0 ? ` | ${profiles.length} 캐릭터` : ''}
            </p>
            <div className="mt-3">
              <NicknameSearchBar onSearch={handleNicknameSubmit} placeholder="다른 원정대 검색" />
            </div>
          </div>

          {loading ? (
            <div
              role="status"
              aria-label={`${nickname} 원정대 정보 불러오는 중`}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <GlassCard key={index} className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <SkeletonBlock className="w-16 h-16 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <SkeletonBlock className="h-5 w-28" />
                      <SkeletonBlock className="h-4 w-20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-4 w-5/6" />
                    <SkeletonBlock className="h-4 w-2/3" />
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : error ? (
            <StateFeedback
              tone="error"
              title="원정대 조회에 실패했습니다"
              description={`${error} 요청이 많거나 서버 응답이 지연될 수 있습니다. 잠시 후 다시 검색해 주세요.`}
              action={{ label: '닉네임 다시 입력', onClick: handleResetSearch }}
              className="animate-fade-in"
            />
          ) : profiles.length > 0 ? (
            <ExpeditionProfiles nickname={nickname} profiles={profiles} summary={summary} />
          ) : siblings.length === 0 ? (
            <StateFeedback
              tone="empty"
              title="원정대 캐릭터가 없습니다"
              description="다른 닉네임을 입력해 원정대를 다시 조회해 주세요."
              action={{ label: '닉네임 다시 입력', onClick: handleResetSearch }}
              className="animate-fade-in"
            />
          ) : (
            <StateFeedback
              tone="error"
              title="원정대 프로필을 불러오지 못했습니다"
              description="일부 캐릭터 응답이 지연되었습니다. 잠시 후 다시 검색해 주세요."
              action={{ label: '닉네임 다시 입력', onClick: handleResetSearch }}
              className="animate-fade-in"
            />
          )}
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Expedition;
