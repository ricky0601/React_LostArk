import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import type { CharacterProfile } from '../types/lostark';
import NavBar from '../components/NavBar';
import NicknameInput from '../components/NicknameInput';
import NicknameSearchBar from '../components/NicknameSearchBar';
import GlassCard from '../components/GlassCard';
import { fetchProfile, LS_NICKNAME } from '../utils/api';

const StatItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-gray-100 dark:bg-white/5 rounded-lg p-3">
    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
    <p className="text-xl font-bold text-la-gold-dark dark:text-la-gold">{value}</p>
  </div>
);

const Character: React.FC = () => {
  const [characterData, setCharacterData] = useState<CharacterProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { search } = useLocation();
  const urlNickname = new URLSearchParams(search).get('nickname');
  const [nickname, setNickname] = useState<string | null>(
    urlNickname || localStorage.getItem(LS_NICKNAME)
  );

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (nickname) {
        localStorage.setItem(LS_NICKNAME, nickname);
        setLoading(true);
        setError(null);
        try {
          const data = await fetchProfile(nickname);
          setCharacterData(data);
        } catch (err) {
          setError('캐릭터 정보를 가져오는 중 오류가 발생했습니다.');
        }
        setLoading(false);
      }
    };

    fetchData();
  }, [nickname]);

  if (!nickname) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
        <NavBar />
        <NicknameInput
          title="캐릭터 프로필"
          description="캐릭터 닉네임을 입력하면 상세 정보를 조회합니다"
          buttonText="캐릭터 조회"
          onSubmit={(name) => {
            setLoading(true);
            setNickname(name);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
      <NavBar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 text-center animate-fade-in">
          <NicknameSearchBar onSearch={(name) => {
            setCharacterData(null);
            setError(null);
            setLoading(true);
            setNickname(name);
          }} />
        </div>

        {loading ? (
          <GlassCard className="p-8 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="skeleton w-64 h-80 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-4 w-full">
                <div className="skeleton h-8 w-48" />
                <div className="skeleton h-6 w-32" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-16 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        ) : error ? (
          <GlassCard className="p-8 text-center animate-fade-in">
            <p className="text-red-500 dark:text-red-400 text-lg">{error}</p>
          </GlassCard>
        ) : characterData ? (
          <GlassCard className="p-6 md:p-8 animate-slide-up">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {/* Character image */}
              <div className="flex-shrink-0">
                <img
                  src={characterData.CharacterImage}
                  alt={characterData.CharacterName}
                  className="w-64 h-auto rounded-xl border border-gray-200 dark:border-white/10 shadow-lg"
                />
              </div>

              {/* Character info */}
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {characterData.CharacterName}
                  </h1>
                  <span className="inline-block mt-2 px-3 py-1 bg-la-gold/20 text-la-gold-dark dark:text-la-gold text-sm font-medium rounded-full">
                    {characterData.CharacterClassName}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatItem label="전투 레벨" value={characterData.CharacterLevel} />
                  <StatItem label="아이템 레벨" value={characterData.ItemAvgLevel} />
                  <StatItem label="서버" value={characterData.ServerName} />
                  <StatItem label="원정대 레벨" value={characterData.ExpeditionLevel} />
                </div>

                {characterData.GuildName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    길드: <span className="text-gray-700 dark:text-gray-200">{characterData.GuildName}</span>
                  </p>
                )}
                {characterData.Title && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    칭호: <span className="text-gray-700 dark:text-gray-200">{characterData.Title}</span>
                  </p>
                )}

                <Link
                  to={`/simulation?nickname=${encodeURIComponent(nickname)}`}
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg text-sm font-medium
                             bg-la-gold/20 text-la-gold-dark dark:text-la-gold
                             hover:bg-la-gold/30 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  주간 골드 계산
                </Link>
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-8 text-center animate-fade-in">
            <p className="text-gray-500 dark:text-gray-400">캐릭터 정보를 불러오는 데 실패했습니다.</p>
          </GlassCard>
        )}
      </main>
    </div>
  );
};

export default Character;
