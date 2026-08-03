import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { CharacterProfile } from '../types/lostark';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import NicknameInput from '../components/NicknameInput';
import NicknameSearchBar from '../components/NicknameSearchBar';
import GlassCard from '../components/GlassCard';
import { SkeletonBlock } from '../components/Loading';
import SpecScoreSimulator from '../components/simulation/SpecScoreSimulator';
import { fetchProfile, LS_NICKNAME } from '../utils/api';
import { safeLocalStorage } from '../utils/safeStorage';

const ProfileLoadingCard: React.FC = () => (
  <GlassCard className="spec-lab-card p-5 animate-fade-in sm:p-6">
    <div className="flex items-center gap-4">
      <SkeletonBlock className="h-16 w-16 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-4 w-52" />
      </div>
    </div>
  </GlassCard>
);

const SpecSimulator: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlNickname = searchParams.get('nickname');
  const [nickname, setNickname] = useState<string | null>(() => {
    return urlNickname || safeLocalStorage.getItem(LS_NICKNAME);
  });
  const [profile, setProfile] = useState<CharacterProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlNickname && urlNickname !== nickname) {
      setNickname(urlNickname);
      setProfile(null);
      setError(null);
    }
  }, [urlNickname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!nickname) return;

    const controller = new AbortController();
    let active = true;

    safeLocalStorage.setItem(LS_NICKNAME, nickname);
    setLoading(true);
    setError(null);
    setProfile(null);

    fetchProfile(nickname, { signal: controller.signal })
      .then((data) => {
        if (!active || controller.signal.aborted) return;
        if (data?.CharacterName) {
          setProfile(data);
          return;
        }
        setError('캐릭터 프로필을 찾을 수 없습니다. 닉네임을 다시 확인해 주세요.');
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        console.error(err);
        setError('캐릭터 프로필을 불러오는 중 오류가 발생했습니다.');
      })
      .finally(() => {
        if (active && !controller.signal.aborted) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [nickname]);

  const handleSearch = (name: string): void => {
    setSearchParams({ nickname: name });
    setNickname(name);
  };

  if (!nickname) {
    return (
      <div className="spec-lab-shell min-h-[100dvh]">
        <NavBar />
        <NicknameInput
          title="전투력 점수 시뮬레이터"
          description="캐릭터 닉네임을 입력하면 현재 프로필 기준으로 점수 변화를 시뮬레이션합니다"
          buttonText="시뮬레이터 열기"
          onSubmit={handleSearch}
        />
      </div>
    );
  }

  return (
    <div className="spec-lab-shell min-h-[100dvh]">
      <NavBar />
      <PullToRefresh>
        <main className="mx-auto w-full max-w-7xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-4 sm:py-8 lg:px-6">
          <section className="spec-lab-card overflow-hidden animate-fade-in" aria-labelledby="spec-simulator-title">
            <div className="h-1 bg-gradient-to-r from-la-gold/80 via-la-gold-light/70 to-transparent" />
            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:gap-6">
              <div className="text-left">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-la-gold/30 bg-la-gold/10 text-la-gold-dark dark:text-la-gold" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5V9.75M9.33 19.5V4.5m5.34 15v-7.25M20 19.5V7" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.75 19.5h18.5" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-la-gold-dark dark:text-la-gold">
                      Combat power workbench
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                      프로필 기반 실시간 계산
                    </p>
                  </div>
                </div>
                <h1 id="spec-simulator-title" className="text-2xl font-black tracking-tight text-gray-950 dark:text-white md:text-3xl">
                  전투력 점수 시뮬레이터
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  현재 세팅을 기준으로 옵션을 조정하고, 전투력과 아이템 레벨 변화를 한 화면에서 비교합니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400" aria-label="시뮬레이터 지원 범위">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/70 bg-gray-50 px-2.5 py-1 dark:border-white/10 dark:bg-black/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-la-gold" /> 프로필 연동
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/70 bg-gray-50 px-2.5 py-1 dark:border-white/10 dark:bg-black/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-la-gold" /> 즉시 비교
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/70 bg-gray-50 px-2.5 py-1 dark:border-white/10 dark:bg-black/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-la-gold" /> 세팅 초기화
                  </span>
                </div>
              </div>
              <div className="w-full rounded-xl border border-gray-200/70 bg-gray-50/80 p-3 dark:border-white/10 dark:bg-black/20 lg:justify-self-end">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200">캐릭터 불러오기</p>
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">닉네임 검색</span>
                </div>
                <NicknameSearchBar onSearch={handleSearch} placeholder="시뮬레이션할 캐릭터 검색" />
              </div>
            </div>
          </section>

          {loading ? (
            <ProfileLoadingCard />
          ) : error ? (
            <GlassCard className="spec-lab-card p-8 text-center animate-fade-in">
              <p className="text-lg text-red-500 dark:text-red-400">{error}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">다른 닉네임으로 다시 검색해 주세요.</p>
            </GlassCard>
          ) : profile ? (
            <>
              <section className="spec-lab-card overflow-hidden animate-fade-in" aria-labelledby="current-character-title">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3 text-left">
                    {profile.CharacterImage && (
                      <img
                        src={profile.CharacterImage}
                        alt={profile.CharacterName}
                        className="h-14 w-14 flex-shrink-0 rounded-xl border border-gray-200 object-cover object-top dark:border-white/10 sm:h-16 sm:w-16"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">현재 시뮬레이션 대상</p>
                        <span className="spec-chip">프로필 연동</span>
                      </div>
                      <h2 id="current-character-title" className="truncate text-xl font-bold text-gray-950 dark:text-white">
                        {profile.CharacterName}
                      </h2>
                      <p className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                        {profile.ServerName} · {profile.CharacterClassName} · Lv.{profile.ItemAvgLevel}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/character?nickname=${encodeURIComponent(profile.CharacterName)}`}
                    className="inline-flex min-h-11 w-full flex-shrink-0 items-center justify-center rounded-xl border border-la-gold/30 bg-la-gold/10 px-4 text-sm font-bold text-la-gold-dark transition-colors hover:bg-la-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-la-gold sm:w-auto"
                  >
                    캐릭터 정보 보기
                  </Link>
                </div>
              </section>
              <SpecScoreSimulator profile={profile} />
            </>
          ) : (
            <GlassCard className="spec-lab-card p-8 text-center animate-fade-in">
              <p className="text-gray-500 dark:text-gray-400">캐릭터 프로필을 불러오는 데 실패했습니다.</p>
            </GlassCard>
          )}
        </main>
      </PullToRefresh>
    </div>
  );
};

export default SpecSimulator;
