import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import NicknameInput from '../components/NicknameInput';
import NicknameSearchBar from '../components/NicknameSearchBar';
import GlassCard from '../components/GlassCard';
import StateFeedback from '../components/StateFeedback';
import { SkeletonBlock } from '../components/Loading';
import ExpeditionDashboard from '../components/expedition/ExpeditionDashboard';
import type { SiblingCharacter } from '../types/lostark';
import { fetchSiblings, LS_NICKNAME } from '../utils/api';
import { safeLocalStorage } from '../utils/safeStorage';

const Expedition: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlNickname = searchParams.get('nickname');
  const [nickname, setNickname] = useState<string | null>(() => urlNickname || safeLocalStorage.getItem(LS_NICKNAME));
  const [siblings, setSiblings] = useState<SiblingCharacter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!urlNickname || urlNickname === nickname) return;
    setNickname(urlNickname);
    setSiblings([]);
    setError(null);
  }, [nickname, urlNickname]);

  const handleNicknameSubmit = (name: string): void => {
    setSearchParams({ nickname: name });
    setNickname(name);
    setSiblings([]);
    setError(null);
  };

  const handleResetSearch = (): void => {
    setSearchParams({});
    setNickname(null);
    setSiblings([]);
    setError(null);
  };

  useEffect(() => {
    if (!nickname) return;
    const controller = new AbortController();
    let active = true;

    const loadExpedition = async (): Promise<void> => {
      safeLocalStorage.setItem(LS_NICKNAME, nickname);
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSiblings(nickname, { signal: controller.signal });
        if (!active || controller.signal.aborted) return;
        if (!Array.isArray(data)) {
          setSiblings([]);
          setError('원정대 캐릭터 정보를 불러올 수 없습니다.');
          return;
        }
        setSiblings([...data].sort((left, right) => {
          const serverOrder = left.ServerName.localeCompare(right.ServerName, 'ko');
          if (serverOrder !== 0) return serverOrder;
          return Number(right.ItemAvgLevel.replace(/,/g, '')) - Number(left.ItemAvgLevel.replace(/,/g, ''));
        }));
      } catch (requestError) {
        if (!active || controller.signal.aborted) return;
        setSiblings([]);
        setError('원정대 조회에 실패했습니다.');
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    };

    void loadExpedition();
    return () => {
      active = false;
      controller.abort();
    };
  }, [nickname]);

  if (!nickname) {
    return (
      <div className="min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-la-dark">
        <NavBar />
        <NicknameInput title="원정대 스펙 관리" description="캐릭터 닉네임을 입력하면 같은 원정대 전체를 불러옵니다" buttonText="원정대 조회" onSubmit={handleNicknameSubmit} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-la-dark">
      <NavBar />
      <PullToRefresh>
        <main className="mx-auto max-w-[1600px] px-3 py-8 sm:px-4">
          <header className="mb-6 text-center animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white"><span className="text-la-gold-dark dark:text-la-gold">{nickname}</span>님의 원정대 스펙</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{siblings.length > 0 ? `${new Set(siblings.map((sibling) => sibling.ServerName)).size}개 서버 · ${siblings.length} 캐릭터` : '원정대 전체 캐릭터를 조회합니다'}</p>
            <div className="mt-3"><NicknameSearchBar onSearch={handleNicknameSubmit} placeholder="다른 원정대 검색" /></div>
          </header>

          {loading ? (
            <div role="status" aria-label={`${nickname} 원정대 정보 불러오는 중`} className="space-y-4">
              <GlassCard className="p-5"><SkeletonBlock className="h-10 w-full" /></GlassCard>
              {Array.from({ length: 4 }).map((_, index) => <GlassCard key={index} className="p-5"><SkeletonBlock className="h-24 w-full" /></GlassCard>)}
            </div>
          ) : error ? (
            <StateFeedback tone="error" title="원정대 조회에 실패했습니다" description={`${error} 요청이 많거나 서버 응답이 지연될 수 있습니다. 잠시 후 다시 검색해 주세요.`} action={{ label: '닉네임 다시 입력', onClick: handleResetSearch }} />
          ) : siblings.length === 0 ? (
            <StateFeedback tone="empty" title="원정대 캐릭터가 없습니다" description="다른 닉네임을 입력해 원정대를 다시 조회해 주세요." action={{ label: '닉네임 다시 입력', onClick: handleResetSearch }} />
          ) : (
            <ExpeditionDashboard key={nickname} nickname={nickname} siblings={siblings} />
          )}
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Expedition;
