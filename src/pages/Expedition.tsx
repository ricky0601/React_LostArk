import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import NicknameInput from '../components/NicknameInput';
import NicknameSearchBar from '../components/NicknameSearchBar';
import GlassCard from '../components/GlassCard';
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

        if (!Array.isArray(data) || data.length === 0) {
          setSiblings([]);
          setProfiles([]);
          setServer(null);
          setError('원정대 캐릭터 정보를 불러올 수 없습니다.');
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <GlassCard key={index} className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="skeleton w-16 h-16 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-5 w-28" />
                      <div className="skeleton h-4 w-20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-5/6" />
                    <div className="skeleton h-4 w-2/3" />
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : error ? (
            <GlassCard className="p-8 text-center animate-fade-in">
              <p className="text-red-500 dark:text-red-400 text-lg">{error}</p>
            </GlassCard>
          ) : profiles.length > 0 ? (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">원정대 캐릭터</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{profiles.length}</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">최고 레벨</p>
                  <p className="text-2xl font-bold text-la-gold-dark dark:text-la-gold">
                    {summary.highestLevel?.toFixed(2) ?? '-'}
                  </p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">평균 레벨</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {summary.averageLevel?.toFixed(2) ?? '-'}
                  </p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">주간 골드</p>
                  <Link
                    to={`/simulation?nickname=${encodeURIComponent(nickname)}`}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium bg-la-gold/20 text-la-gold-dark dark:text-la-gold hover:bg-la-gold/30 transition-colors"
                  >
                    계산하러 가기
                  </Link>
                </GlassCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                {profiles.map((profile) => (
                  <Link
                    key={profile.CharacterName}
                    to={`/character?nickname=${encodeURIComponent(profile.CharacterName)}`}
                    className="block self-start"
                  >
                    <GlassCard className="p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-gold-glow hover:border-la-gold/30 dark:hover:border-la-gold/20">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5 flex-shrink-0">
                          <img
                            src={profile.CharacterImage}
                            alt={profile.CharacterName}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{profile.CharacterName}</h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{profile.CharacterClassName}</p>
                          <div className="mt-2 inline-flex items-center rounded-full bg-la-gold/15 px-2.5 py-1 text-xs font-medium text-la-gold-dark dark:text-la-gold">
                            아이템 레벨 {profile.ItemAvgLevel}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">캐릭터 레벨</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">Lv.{profile.CharacterLevel}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">원정대 레벨</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">Lv.{profile.ExpeditionLevel}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">서버</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{profile.ServerName}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">길드</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white truncate">{profile.GuildName || '-'}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </div>
          ) : siblings.length === 0 ? (
            <GlassCard className="p-8 text-center animate-fade-in">
              <p className="text-gray-500 dark:text-gray-400">원정대 캐릭터가 없습니다.</p>
            </GlassCard>
          ) : (
            <GlassCard className="p-8 text-center animate-fade-in">
              <p className="text-gray-500 dark:text-gray-400">캐릭터 프로필을 불러오지 못했습니다.</p>
            </GlassCard>
          )}
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Expedition;
