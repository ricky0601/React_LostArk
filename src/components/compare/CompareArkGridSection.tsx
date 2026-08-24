import React, { useState } from 'react';
import type { ArkGridData } from '../../types/lostark';
import { gradeFrame } from '../../utils/equipmentColors';
import GlassCard from '../GlassCard';
import { shortCoreName } from './compareModel';
import { SectionHeader } from './ComparePrimitives';

const ArkGridSection: React.FC<{
  leftArkGrid: ArkGridData | null;
  rightArkGrid: ArkGridData | null;
}> = ({ leftArkGrid, rightArkGrid }) => {
  const leftSlots = leftArkGrid?.Slots ?? [];
  const rightSlots = rightArkGrid?.Slots ?? [];
  const [expanded, setExpanded] = useState(true);

  const totalPoint = (slots: typeof leftSlots) =>
    slots.reduce((sum, s) => sum + s.Point, 0);
  const lPoint = totalPoint(leftSlots);
  const rPoint = totalPoint(rightSlots);

  const renderSlots = (slots: typeof leftSlots) => {
    if (slots.length === 0) {
      return <p className="text-xs text-gray-400 dark:text-gray-500 italic py-4 text-center">아크 그리드 없음</p>;
    }
    return (
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const frame = gradeFrame(slot.Grade, 'bg');
          const name = shortCoreName(slot.Name);
          return (
            <div key={slot.Index} className="flex flex-col items-center gap-0.5 text-center">
              <div
                className={`w-10 h-10 rounded-lg border-2 overflow-hidden flex-shrink-0 ${frame.className}`}
                style={frame.style}
              >
                {slot.Icon ? (
                  <img src={slot.Icon} alt={name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <p className="text-[9px] text-gray-600 dark:text-gray-400 leading-tight line-clamp-2 w-full">{name}</p>
              <span className="text-[9px] font-bold text-la-gold-dark dark:text-la-gold">{slot.Point}P</span>
            </div>
          );
        })}
      </div>
    );
  };

  /** 옵션 총합: 항목별로 한 줄씩 위→아래, 좌 vs 우 비교 */
  const leftEffects = leftArkGrid?.Effects ?? [];
  const rightEffects = rightArkGrid?.Effects ?? [];
  const effectNameToLevel = (list: { Name: string; Level: number }[]) => {
    const m = new Map<string, number>();
    list.forEach((e) => m.set(e.Name, e.Level));
    return m;
  };
  const leftMap = effectNameToLevel(leftEffects);
  const rightMap = effectNameToLevel(rightEffects);
  const optionOrder = ['공격력', '추가피해', '보스피해', '낙인력', '아공강', '아피강'];
  const normalizeOption = (name: string) => name.replace(/\s+/g, '');
  const toOrderKey = (name: string) => {
    const normalized = normalizeOption(name);
    if (normalized === '아군공격강화') return '아공강';
    if (normalized === '아군피해강화') return '아피강';
    return normalized;
  };

  const allOptionNames = Array.from(new Set([...Array.from(leftMap.keys()), ...Array.from(rightMap.keys())])).sort((a, b) => {
    const aIdx = optionOrder.indexOf(toOrderKey(a));
    const bIdx = optionOrder.indexOf(toOrderKey(b));
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b, 'ko');
  });

  return (
    <GlassCard className="p-5 animate-fade-in">
      <SectionHeader icon="◇" title="아크 그리드" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
        <div className="flex items-center justify-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">포인트 합</p>
            <p
              className={`text-lg font-bold tabular-nums ${
                lPoint > rPoint ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {lPoint}P
            </p>
          </div>
          <span className="text-gray-300 dark:text-gray-600 font-bold">vs</span>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">포인트 합</p>
            <p
              className={`text-lg font-bold tabular-nums ${
                rPoint > lPoint ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {rPoint}P
            </p>
          </div>
        </div>
        <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-200/70 dark:bg-white/15" />
          <div className="min-w-0">{renderSlots(leftSlots)}</div>
          <div className="min-w-0">{renderSlots(rightSlots)}</div>
        </div>

        {/* 옵션 총합: 위→아래 한 줄씩 비교, 가운데 정렬 */}
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/10">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 text-center">옵션 총합</p>
          {allOptionNames.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center">옵션 없음</p>
          ) : (
            <div className="space-y-1.5 flex flex-col items-center">
              {allOptionNames.map((name) => {
                const lv = leftMap.get(name) ?? null;
                const rv = rightMap.get(name) ?? null;
                const lNum = lv !== null ? lv : null;
                const rNum = rv !== null ? rv : null;
                const lWin = lNum !== null && rNum !== null && lNum > rNum;
                const rWin = lNum !== null && rNum !== null && rNum > lNum;
                return (
                  <div
                    key={name}
                    className="flex items-center justify-center gap-3 py-1.5 px-2 rounded-lg bg-gray-50/50 dark:bg-white/5 text-sm w-full max-w-xs"
                  >
                    <span className="w-24 flex-shrink-0 text-center text-gray-700 dark:text-gray-300 truncate" title={name}>
                      {name}
                    </span>
                    <span
                      className={`w-10 text-center font-bold tabular-nums ${
                        lWin ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {lNum !== null ? lNum : '-'}
                    </span>
                    <span className="flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs">vs</span>
                    <span
                      className={`w-10 text-center font-bold tabular-nums ${
                        rWin ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {rNum !== null ? rNum : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default ArkGridSection;
