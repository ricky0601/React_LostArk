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
  <GlassCard className="p-6 animate-fade-in">
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
      <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
        <NavBar />
        <NicknameInput
          title="전투력 점수 시뮬레이터 Beta"
          description="캐릭터 닉네임을 입력하면 현재 프로필 기준으로 점수 변화를 시뮬레이션합니다"
          buttonText="시뮬레이터 열기"
          onSubmit={handleSearch}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
      <NavBar />
      <PullToRefresh>
        <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <section className="text-center animate-fade-in">
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                Beta
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">전투력/스펙 점수 실험 기능</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-la-gold to-la-gold-light bg-clip-text text-transparent">
              전투력 점수 시뮬레이터
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              베타 기능입니다. 실제 효율 판단 전 기존 안내 문구와 제한 사항을 함께 확인해 주세요.
            </p>
          </section>

          <div className="text-center animate-fade-in">
            <NicknameSearchBar onSearch={handleSearch} placeholder="시뮬레이션할 캐릭터 검색" />
          </div>

          {loading ? (
            <ProfileLoadingCard />
          ) : error ? (
            <GlassCard className="p-8 text-center animate-fade-in">
              <p className="text-red-500 dark:text-red-400 text-lg">{error}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">다른 닉네임으로 다시 검색해 주세요.</p>
            </GlassCard>
          ) : profile ? (
            <>
              <GlassCard className="p-4 animate-fade-in">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 text-left">
                    {profile.CharacterImage && (
                      <img
                        src={profile.CharacterImage}
                        alt={profile.CharacterName}
                        className="h-14 w-14 rounded-xl object-cover object-top border border-gray-200/50 dark:border-white/10"
                      />
                    )}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">현재 대상 캐릭터</p>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{profile.CharacterName}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {profile.ServerName} · {profile.CharacterClassName} · Lv.{profile.ItemAvgLevel}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/character?nickname=${encodeURIComponent(profile.CharacterName)}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-la-gold/30 bg-la-gold/10 px-4 text-sm font-medium text-la-gold-dark transition-colors hover:bg-la-gold/20 focus:outline-none focus:ring-2 focus:ring-la-gold/40 dark:text-la-gold"
                  >
                    캐릭터 정보 보기
                  </Link>
                </div>
              </GlassCard>
              <SpecScoreSimulator profile={profile} />
            </>
          ) : (
            <GlassCard className="p-8 text-center animate-fade-in">
              <p className="text-gray-500 dark:text-gray-400">캐릭터 프로필을 불러오는 데 실패했습니다.</p>
            </GlassCard>
          )}
        </main>
      </PullToRefresh>
    </div>
  );
};

export default SpecSimulator;
