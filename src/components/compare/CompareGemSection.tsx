import React, { useState } from 'react';
import type { GemData, GemItem, GemSkillEffect } from '../../types/lostark';
import GlassCard from '../GlassCard';
import { GemBadge, SectionHeader } from './ComparePrimitives';

const GemSection: React.FC<{
  leftGems: GemData | null;
  rightGems: GemData | null;
}> = ({ leftGems, rightGems }) => {
  const sortGems = (gems: GemItem[] | null | undefined): GemItem[] => {
    if (!gems) return [];
    return [...gems].sort((a, b) => b.Level - a.Level);
  };

  // GemSlot → GemSkillEffect 매핑
  const buildSkillMap = (data: GemData | null): Map<number, GemSkillEffect> => {
    const map = new Map<number, GemSkillEffect>();
    if (data?.Effects?.Skills) {
      for (const s of data.Effects.Skills) {
        map.set(s.GemSlot, s);
      }
    }
    return map;
  };

  const leftSorted = sortGems(leftGems?.Gems);
  const rightSorted = sortGems(rightGems?.Gems);
  const leftSkillMap = buildSkillMap(leftGems);
  const rightSkillMap = buildSkillMap(rightGems);

  const sumLevel = (gems: GemItem[]) => gems.reduce((s, g) => s + g.Level, 0);
  const lSum = sumLevel(leftSorted);
  const rSum = sumLevel(rightSorted);

  const [expanded, setExpanded] = useState(true);

  return (
    <GlassCard className="p-5 animate-fade-in">
      <SectionHeader icon="💎" title="보석" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
      {/* Level sum comparison */}
      <div className="flex items-center justify-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">레벨 합</p>
          <p
            className={`text-lg font-bold tabular-nums ${
              lSum > rSum
                ? 'text-la-gold-dark dark:text-la-gold'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {lSum}
          </p>
        </div>
        <span className="text-gray-300 dark:text-gray-600 font-bold">vs</span>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">레벨 합</p>
          <p
            className={`text-lg font-bold tabular-nums ${
              rSum > lSum
                ? 'text-la-gold-dark dark:text-la-gold'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {rSum}
          </p>
        </div>
      </div>

      {/* Gem lists side by side */}
      <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-200/70 dark:bg-white/15" />
        <div className="space-y-0 min-w-0">
          {leftSorted.length > 0 ? (
            leftSorted.map((g, i) => (
              <GemBadge key={i} gem={g} skill={leftSkillMap.get(g.Slot)} />
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">보석 없음</p>
          )}
        </div>
        <div className="space-y-0 min-w-0">
          {rightSorted.length > 0 ? (
            rightSorted.map((g, i) => (
              <GemBadge key={i} gem={g} skill={rightSkillMap.get(g.Slot)} />
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">보석 없음</p>
          )}
        </div>
      </div>
      </div>
    </GlassCard>
  );
};

export default GemSection;
