import React from 'react';
import { Link } from 'react-router-dom';
import type { CharacterProfile } from '../../types/lostark';
import FallbackImage from '../FallbackImage';
import GlassCard from '../GlassCard';

const ProfileCard: React.FC<{ profile: CharacterProfile; nickname: string }> = ({ profile, nickname }) => (
  <GlassCard className="overflow-hidden animate-slide-up">
    {/* 캐릭터 이미지 + 이름 오버레이 */}
    <div className="relative">
      <FallbackImage
        src={profile.CharacterImage}
        alt={profile.CharacterName}
        className="w-full h-auto max-h-[240px] sm:max-h-[340px] md:max-h-none object-cover object-top"
        fallbackClassName="min-h-60 sm:min-h-80"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h2 className="text-2xl font-bold text-white leading-tight">{profile.CharacterName}</h2>
        <span className="text-sm text-la-gold">{profile.CharacterClassName}</span>
      </div>
    </div>

    {/* 아이템레벨 + 전투력 */}
    <div className="flex gap-5 px-4 py-2.5 sm:py-3 border-b border-gray-200/30 dark:border-white/5">
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">아이템</p>
        <p className="text-lg font-bold text-la-gold-dark dark:text-la-gold">{profile.ItemAvgLevel}</p>
      </div>
      {profile.CombatPower && (
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">전투력</p>
          <p className="text-lg font-bold text-la-gold-dark dark:text-la-gold">{profile.CombatPower}</p>
        </div>
      )}
    </div>

    {/* 캐릭터 정보 */}
    <div className="px-4 py-2.5 sm:py-3 space-y-1.5 sm:space-y-2 text-[13px] sm:text-sm">
      {[
        { label: '캐릭터 레벨', value: `Lv.${profile.CharacterLevel}` },
        { label: '원정대 레벨', value: `Lv.${profile.ExpeditionLevel}` },
        { label: '서버', value: profile.ServerName },
        ...(profile.GuildName ? [{ label: '길드', value: profile.GuildName }] : []),
        ...(profile.Title ? [{ label: '칭호', value: profile.Title }] : []),
        ...(profile.PvpGradeName ? [{ label: 'PvP', value: profile.PvpGradeName }] : []),
      ].map(({ label, value }) => (
        <div key={label} className="flex justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
          <span className="font-medium text-gray-900 dark:text-white text-right truncate">{value}</span>
        </div>
      ))}
    </div>

    {/* 주간 골드 계산 버튼 */}
    <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Link
        to={`/simulation?nickname=${encodeURIComponent(nickname)}`}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium
                   bg-la-gold/20 text-la-gold-dark dark:text-la-gold hover:bg-la-gold/30 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        주간 골드 계산
      </Link>
      <Link
        to={`/expedition?nickname=${encodeURIComponent(nickname)}`}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium
                   bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H11a4 4 0 00-4 4v2m10 0H7m10-10a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        원정대 조회
      </Link>
      <Link
        to={`/spec-simulator?nickname=${encodeURIComponent(nickname)}`}
        className="sm:col-span-2 flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium
                   bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 transition-colors"
        aria-label={`${nickname} 전투력 점수 시뮬레이터 Beta 열기`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4V7m4 14H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" />
        </svg>
        전투력 점수 시뮬레이터 <span className="text-[10px] font-bold">Beta</span>
      </Link>
    </div>
  </GlassCard>
);

export default ProfileCard;
