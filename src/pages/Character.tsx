import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PullToRefresh from '../components/PullToRefresh';
import type {
  CharacterProfile,
  EquipmentItem,
  GemData,
  EngravingData,
  ArkGridData,
} from '../types/lostark';
import NavBar from '../components/NavBar';
import NicknameInput from '../components/NicknameInput';
import NicknameSearchBar from '../components/NicknameSearchBar';
import StateFeedback from '../components/StateFeedback';
import { fetchProfile, fetchEquipment, fetchGems, fetchEngravings, fetchArkGrid, LS_NICKNAME } from '../utils/api';
import { safeLocalStorage } from '../utils/safeStorage';
import CharacterProfileCard from '../components/character/CharacterProfileCard';
import {
  ArkPassiveCard,
  ArkGridCard,
  EngravingsCard,
  StatsCard,
} from '../components/character/CharacterProgressionCards';
import { EquipmentCard, GemsCard } from '../components/character/CharacterInventoryCards';
import CharacterPageSkeleton from '../components/character/CharacterPageSkeleton';

const Character: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlNickname = searchParams.get('nickname');
  const [nickname, setNickname] = useState<string | null>(
    () => urlNickname || safeLocalStorage.getItem(LS_NICKNAME)
  );

  const [profile, setProfile] = useState<CharacterProfile | null>(null);
  const [equipment, setEquipment] = useState<EquipmentItem[] | null>(null);
  const [gems, setGems] = useState<GemData | null>(null);
  const [engravings, setEngravings] = useState<EngravingData | null>(null);
  const [arkGrid, setArkGrid] = useState<ArkGridData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // URL 쿼리 → state 동기화 (Simulation/Expedition과 동일 패턴).
  // 같은 라우트에 머문 상태에서 URL이 바뀔 때(다른 페이지에서 /character?nickname=X 링크 클릭 등) 재조회 트리거.
  useEffect(() => {
    if (urlNickname && urlNickname !== nickname) {
      setNickname(urlNickname);
      setProfile(null);
      setEquipment(null);
      setGems(null);
      setEngravings(null);
      setArkGrid(null);
      setError(null);
    }
  }, [urlNickname, nickname]);

  // AbortController로 이전 요청을 취소해 늦게 도착한 응답이 최신 상태를 덮지 않게 한다.
  useEffect(() => {
    if (!nickname) return;

    const controller = new AbortController();
    let active = true;

    safeLocalStorage.setItem(LS_NICKNAME, nickname);
    setLoading(true);
    setError(null);
    setProfile(null);
    setEquipment(null);
    setGems(null);
    setEngravings(null);
    setArkGrid(null);

    Promise.allSettled([
      fetchProfile(nickname, { signal: controller.signal }),
      fetchEquipment(nickname, { signal: controller.signal }),
      fetchGems(nickname, { signal: controller.signal }),
      fetchEngravings(nickname, { signal: controller.signal }),
      fetchArkGrid(nickname, { signal: controller.signal }),
    ]).then(([profileRes, equipRes, gemsRes, engravRes, arkRes]) => {
      if (!active || controller.signal.aborted) return;
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
      else setError('캐릭터 정보를 가져오는 중 오류가 발생했습니다.');
      if (equipRes.status === 'fulfilled') setEquipment(equipRes.value);
      if (gemsRes.status === 'fulfilled') setGems(gemsRes.value);
      if (engravRes.status === 'fulfilled') setEngravings(engravRes.value);
      if (arkRes.status === 'fulfilled') setArkGrid(arkRes.value);
    }).finally(() => {
      if (active && !controller.signal.aborted) setLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [nickname]);

  const handleSearch = (name: string) => {
    setSearchParams({ nickname: name });
  };

  const handleResetSearch = (): void => {
    setSearchParams({});
    setNickname(null);
    setProfile(null);
    setEquipment(null);
    setGems(null);
    setEngravings(null);
    setArkGrid(null);
    setError(null);
  };

  if (!nickname) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
        <NavBar />
        <NicknameInput
          title="로스트아크 캐릭터 조회"
          description="캐릭터 닉네임을 검색해 장비, 보석, 카드, 각인과 전투 정보를 한눈에 확인하세요."
          buttonText="캐릭터 조회"
          onSubmit={handleSearch}
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">로스트아크 캐릭터 조회</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            캐릭터의 장비, 보석, 카드, 각인과 전투 정보를 확인하고 현재 성장 상태를 살펴보세요.
          </p>
          <div className="mt-4">
            <NicknameSearchBar onSearch={handleSearch} placeholder="다른 캐릭터 검색" />
          </div>
        </div>

        {loading ? (
          <div role="status" aria-label={`${nickname} 캐릭터 정보 불러오는 중`}>
            <CharacterPageSkeleton />
          </div>
        ) : error ? (
          <StateFeedback
            tone="error"
            title="캐릭터 조회에 실패했습니다"
            description={`${error} 요청이 많거나 서버 응답이 지연될 수 있습니다. 잠시 후 다시 검색해 주세요.`}
            action={{ label: '닉네임 다시 입력', onClick: handleResetSearch }}
            className="animate-fade-in"
          />
        ) : profile ? (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
            {/* 왼쪽 컬럼 */}
            <div className="space-y-4">
              <CharacterProfileCard profile={profile} nickname={nickname} />
              {engravings && <ArkPassiveCard data={engravings} />}
              {arkGrid && <ArkGridCard data={arkGrid} />}
              {engravings && <EngravingsCard data={engravings} />}
              <StatsCard profile={profile} />
            </div>
            {/* 오른쪽 컬럼 */}
            <div className="space-y-4">
              {gems && <GemsCard data={gems} />}
              {equipment && <EquipmentCard items={equipment} />}
            </div>
          </div>
        ) : (
          <StateFeedback
            tone="empty"
            title="캐릭터 정보가 없습니다"
            description="닉네임을 확인한 뒤 다시 검색해 주세요."
            action={{ label: '닉네임 다시 입력', onClick: handleResetSearch }}
            className="animate-fade-in"
          />
        )}
      </main>
      </PullToRefresh>
    </div>
  );
};

export default Character;
