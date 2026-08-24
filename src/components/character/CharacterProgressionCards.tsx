import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ArkGridData, CharacterProfile, EngravingData } from '../../types/lostark';
import { type EffectSegment, stripHtml, parseBraceletLine } from '../../utils/tooltipParser';
import { gradeFrame, gradeStyles } from '../../utils/equipmentColors';
import GlassCard from '../GlassCard';

function shortCoreName(fullName: string | null): string {
  if (!fullName) return '이름 없음';
  const m = fullName.match(/^(.+?)\s*코어/);
  return m ? m[1].trim() : fullName;
}

const ArkPassiveCard: React.FC<{ data: EngravingData }> = ({ data }) => {
  const passives = data.ArkPassiveEffects ?? [];
  const isCoarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const [activeTooltip, setActiveTooltip] = useState<{
    key: string;
    x: number;
    y: number;
    placeAbove: boolean;
    segments: EffectSegment[];
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target)) return;
      if ((target as Element).closest?.('[data-engraving-tooltip="true"]')) return;
      setActiveTooltip(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveTooltip(null);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (passives.length === 0) return null;

  const showTooltip = (key: string, target: HTMLDivElement, segments: EffectSegment[], plainText: string) => {
    if (!plainText) return;
    const rect = target.getBoundingClientRect();
    const width = 320;
    const padding = 12;
    const half = width / 2;
    const x = Math.min(Math.max(rect.left + rect.width / 2, padding + half), window.innerWidth - padding - half);
    const placeAbove = window.innerHeight - rect.bottom < 180;
    const y = placeAbove ? rect.top - 8 : rect.bottom + 8;
    setActiveTooltip({ key, x, y, placeAbove, segments });
  };

  return (
    <>
      <GlassCard className="p-4 animate-fade-in">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <span className="h-3 w-0.5 rounded-full bg-la-gold/80" />
          <span>각인</span>
        </h2>
        <div ref={wrapperRef} className="flex flex-wrap gap-2">
          {passives.map((effect, i) => {
            const frame = gradeStyles(effect.Grade, 'subtle');
            const key = `${effect.Name}-${effect.Level}-${i}`;
            const segments = parseBraceletLine(effect.Description || '');
            const plainText = stripHtml(effect.Description || '').replace(/\s+/g, ' ').trim();
            const tooltipSegments = segments.length > 0 ? segments : [{ text: plainText, color: null }];

            return (
              <div
                key={key}
                className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-default ${frame.className}`}
                style={frame.style}
                onMouseEnter={(e) => {
                  if (isCoarsePointer) return;
                  showTooltip(key, e.currentTarget, tooltipSegments, plainText);
                }}
                onMouseLeave={() => {
                  if (isCoarsePointer) return;
                  setActiveTooltip((prev) => (prev?.key === key ? null : prev));
                }}
                onFocus={(e) => showTooltip(key, e.currentTarget as HTMLDivElement, tooltipSegments, plainText)}
                onBlur={() => setActiveTooltip((prev) => (prev?.key === key ? null : prev))}
                onClick={(e) => {
                  if (!isCoarsePointer) return;
                  if (activeTooltip?.key === key) {
                    setActiveTooltip(null);
                    return;
                  }
                  showTooltip(key, e.currentTarget as HTMLDivElement, tooltipSegments, plainText);
                }}
                tabIndex={0}
              >
                <span className="text-sm font-medium">{effect.Name}</span>
                <span className="text-xs font-bold px-1 py-0.5 rounded bg-white/10">
                  Lv.{effect.Level}
                </span>
              </div>
            );
          })}
        </div>
      </GlassCard>
      {activeTooltip && createPortal(
        <div
          data-engraving-tooltip="true"
          role="tooltip"
          className="pointer-events-none fixed z-[9999] w-80 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs leading-relaxed text-gray-800 shadow-lg dark:border-white/10 dark:bg-la-dark/95 dark:text-gray-100"
          style={{
            left: `${activeTooltip.x}px`,
            top: `${activeTooltip.y}px`,
            transform: activeTooltip.placeAbove ? 'translate(-50%, -100%)' : 'translateX(-50%)',
          }}
        >
          {activeTooltip.segments.map((seg, idx) => (
            <span key={idx} style={{ color: seg.color || undefined }}>
              {seg.text}
            </span>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
};

const ArkGridCard: React.FC<{ data: ArkGridData }> = ({ data }) => {
  if (!data.Slots || data.Slots.length === 0) return null;
  return (
    <GlassCard className="p-4 animate-fade-in">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"><span className="h-3 w-0.5 rounded-full bg-la-gold/80" /><span>아크 그리드</span></h2>
      <div className="grid grid-cols-3 gap-3">
        {data.Slots.map((slot) => {
          const frame = gradeFrame(slot.Grade, 'bg');
          const name = shortCoreName(slot.Name);
          return (
            <div key={slot.Index} className="flex flex-col items-center gap-1 text-center">
              <div
                className={`w-12 h-12 rounded-xl border-2 overflow-hidden ${frame.className}`}
                style={frame.style}
              >
                {slot.Icon
                  ? <img src={slot.Icon} alt={name} loading="lazy" className="w-full h-full object-cover" />
                  : <div className="w-full h-full" />
                }
              </div>
              <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight line-clamp-2 w-full">{name}</p>
              <span className="text-[10px] font-bold text-la-gold-dark dark:text-la-gold">{slot.Point}P</span>
            </div>
          );
        })}
      </div>
      {data.Effects && data.Effects.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200/30 dark:border-white/5 flex flex-wrap gap-1.5">
          {data.Effects.map((effect, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-la-gold/10 text-la-gold-dark dark:text-la-gold font-medium">
              {effect.Name} Lv.{effect.Level}
            </span>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

const EngravingsCard: React.FC<{ data: EngravingData }> = ({ data }) => {
  const effects = data.Effects ?? [];
  if (effects.length === 0) return null;
  return (
    <GlassCard className="p-4 animate-fade-in">
      <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">각인</h2>
      <div className="space-y-1.5">
        {effects.map((effect, i) => (
          <div key={i} className="flex items-center gap-2 text-sm py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-la-gold flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-200">{effect.Name}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

const StatsCard: React.FC<{ profile: CharacterProfile }> = ({ profile }) => {
  const combatStatNames = ['치명', '특화', '제압', '신속', '인내', '숙련'];
  const stats = (profile.Stats ?? []).filter((s) => combatStatNames.includes(s.Type));
  if (stats.length === 0) return null;
  return (
    <GlassCard className="p-4 animate-fade-in">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"><span className="h-3 w-0.5 rounded-full bg-la-gold/80" /><span>전투 스탯</span></h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {stats.map((stat) => (
          <div key={stat.Type} className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{stat.Type}</span>
            <span className="font-bold text-gray-900 dark:text-white">{Number(stat.Value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export { ArkPassiveCard, ArkGridCard, EngravingsCard, StatsCard };
