import React, { useState } from 'react';
import type { CharacterProfile } from '../../types/lostark';
import GlassCard from '../GlassCard';
import { parseItemLevel } from './compareModel';
import { SectionHeader, StatBar } from './ComparePrimitives';

const ProfileSection: React.FC<{ left: CharacterProfile; right: CharacterProfile }> = ({
  left,
  right,
}) => {
  const [expanded, setExpanded] = useState(true);
  const lLv = parseItemLevel(left.ItemAvgLevel);
  const rLv = parseItemLevel(right.ItemAvgLevel);
  const lWin = lLv > rLv;
  const rWin = rLv > lLv;

  // Find common stat types
  const statTypes = ['치명', '특화', '신속'];
  const getStatVal = (profile: CharacterProfile, type: string): number => {
    const stat = profile.Stats.find((s) => s.Type === type);
    return stat ? parseInt(stat.Value, 10) || 0 : 0;
  };

  return (
    <GlassCard className="p-5 animate-fade-in">
      <SectionHeader icon="👤" title="기본 정보" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
      {/* Character images + basic info */}
      <div className="relative grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-200/70 dark:bg-white/15" />
        {[left, right].map((p, i) => {
          const isWin = i === 0 ? lWin : rWin;
          return (
            <div key={i} className="text-center">
              {p.CharacterImage ? (
                <img
                  src={p.CharacterImage}
                  alt={p.CharacterName}
                  className="w-full max-w-[160px] mx-auto rounded-xl mb-3 bg-gray-100 dark:bg-white/5"
                />
              ) : (
                <div className="w-full max-w-[160px] mx-auto aspect-[3/4] rounded-xl mb-3 bg-gray-100 dark:bg-white/5 flex items-center justify-center text-3xl text-gray-300">
                  ?
                </div>
              )}
              <p className="text-sm font-bold text-gray-900 dark:text-white">{p.CharacterName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {p.ServerName} · {p.CharacterClassName}
              </p>
              {p.GuildName && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{p.GuildName}</p>
              )}
              <p
                className={`text-lg font-bold mt-1 tabular-nums ${
                  isWin
                    ? 'text-la-gold-dark dark:text-la-gold'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Lv. {p.ItemAvgLevel}
              </p>
            </div>
          );
        })}
      </div>

      {/* Combat power comparison */}
      {(() => {
        const lCp = parseItemLevel(left.CombatPower || '0');
        const rCp = parseItemLevel(right.CombatPower || '0');
        const lWinCp = lCp > rCp;
        const rWinCp = rCp > lCp;
        return (
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-4 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              전투력
            </p>
            <div className="flex items-center justify-center gap-4">
              <span
                className={`text-lg font-bold tabular-nums ${
                  lWinCp ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {left.CombatPower || '-'}
              </span>
              <span className="text-xs text-gray-300 dark:text-gray-600 font-bold">vs</span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  rWinCp ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {right.CombatPower || '-'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Stat comparison bars */}
      <div className="space-y-0.5">
        {statTypes.map((type) => (
          <StatBar
            key={type}
            label={type}
            leftVal={getStatVal(left, type)}
            rightVal={getStatVal(right, type)}
          />
        ))}
      </div>
      </div>
    </GlassCard>
  );
};

export default ProfileSection;
