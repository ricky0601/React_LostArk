import React, { useState } from 'react';
import type { ArkPassiveEffect, EngravingData } from '../../types/lostark';
import { stripHtml } from '../../utils/tooltipParser';
import { gradeText } from '../../utils/equipmentColors';
import GlassCard from '../GlassCard';
import { GradeTag, SectionHeader } from './ComparePrimitives';

const LevelDots: React.FC<{ level: number }> = ({ level }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className={`w-1.5 h-1.5 rounded-full ${
          i <= level
            ? level >= 4
              ? 'bg-la-gold'
              : level >= 3
                ? 'bg-purple-500'
                : 'bg-blue-500'
            : 'bg-gray-200 dark:bg-white/10'
        }`}
      />
    ))}
  </div>
);

/** 각인 1개 카드 */
const EngravingCard: React.FC<{ effect: ArkPassiveEffect }> = ({ effect }) => {
  const t = gradeText(effect.Grade);
  return (
    <div className="py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <GradeTag grade={effect.Grade} small />
        <span className="text-xs font-bold text-gray-900 dark:text-white flex-1 min-w-0 truncate">
          {effect.Name}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LevelDots level={effect.Level} />
          <span className={`text-[10px] font-bold ${t.className}`} style={t.style}>Lv.{effect.Level}</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
        {stripHtml(effect.Description)}
      </p>
    </div>
  );
};

const EngravingSection: React.FC<{
  leftEng: EngravingData | null;
  rightEng: EngravingData | null;
}> = ({ leftEng, rightEng }) => {
  const leftEffects = leftEng?.ArkPassiveEffects ?? [];
  const rightEffects = rightEng?.ArkPassiveEffects ?? [];
  const [expanded, setExpanded] = useState(true);

  return (
    <GlassCard className="p-5 animate-fade-in">
      <SectionHeader icon="📜" title="각인" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
      {leftEffects.length === 0 && rightEffects.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">각인 정보가 없습니다</p>
      ) : (
        <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-200/70 dark:bg-white/15" />
          <div className="min-w-0">
            {leftEffects.length > 0 ? (
              leftEffects.map((e, i) => <EngravingCard key={i} effect={e} />)
            ) : (
              <p className="text-xs text-gray-400 italic py-2">정보 없음</p>
            )}
          </div>
          <div className="min-w-0">
            {rightEffects.length > 0 ? (
              rightEffects.map((e, i) => <EngravingCard key={i} effect={e} />)
            ) : (
              <p className="text-xs text-gray-400 italic py-2">정보 없음</p>
            )}
          </div>
        </div>
      )}
      </div>
    </GlassCard>
  );
};

export default EngravingSection;
