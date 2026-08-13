import React from 'react';
import { Link } from 'react-router-dom';
import type { CharacterProfile } from '../../types/lostark';
import FallbackImage from '../FallbackImage';
import GlassCard from '../GlassCard';

type ExpeditionSummary = {
  readonly highestLevel: number | null;
  readonly averageLevel: number | null;
};

type ExpeditionProfilesProps = {
  readonly nickname: string;
  readonly profiles: readonly CharacterProfile[];
  readonly summary: ExpeditionSummary;
};

const ExpeditionProfiles: React.FC<ExpeditionProfilesProps> = ({ nickname, profiles, summary }) => (
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
                <FallbackImage
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
);

export default ExpeditionProfiles;
