import type { ReactElement } from 'react';
import { stripGemName } from '../../data/specScore/gems';
import type { GemData } from '../../types/lostark';
import type { GemMod } from './specScoreSimulatorTypes';

interface SpecScoreGemPanelProps {
  readonly visible: boolean;
  readonly gems: GemData;
  readonly gemMods: Record<number, GemMod>;
  readonly changedCount: number;
  readonly summaryLabel: string;
  readonly onGemChange: (slot: number, patch: GemMod) => void;
  readonly onApplyBulkGems: (level: number) => void;
}

const GLOW_GEM_TYPES = ['damage', 'cooldown', 'support'] as const;
type GlowGemType = typeof GLOW_GEM_TYPES[number];

const isGlowGemType = (value: string): value is GlowGemType =>
  GLOW_GEM_TYPES.some((type) => type === value);

const synthGlowTooltip = (type: 'damage' | 'cooldown' | 'support'): string => {
  if (type === 'damage') return '특정 스킬의 피해 36% 증가';
  if (type === 'cooldown') return '특정 스킬의 재사용 대기시간 20% 감소';
  return '아군 공격력 강화 효과 증가';
};

const detectCurrentType = (tooltip: string | undefined): 'damage' | 'cooldown' | 'support' | 'unknown' => {
  if (!tooltip) return 'unknown';
  const t = tooltip.replace(/<[^>]+>/g, ' ');
  if (/피해\s*\d+(?:\.\d+)?\s*%?\s*증가/.test(t)) return 'damage';
  if (/재사용\s*대기시간\s*\d+(?:\.\d+)?\s*%?\s*감소/.test(t)) return 'cooldown';
  if (/아군.*(?:공격력|피해량|보호막|치유).*강화|지원\s*효과/.test(t)) return 'support';
  return 'unknown';
};

export const SpecScoreGemPanel = ({
  visible,
  gems,
  gemMods,
  changedCount,
  summaryLabel,
  onGemChange,
  onApplyBulkGems,
}: SpecScoreGemPanelProps): ReactElement | null => {
  if (!visible) return null;

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">보석</h3>
          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{summaryLabel}</p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {changedCount > 0 && <span className="spec-chip mr-1">변경 {changedCount}</span>}
          <span className="text-[10px] text-gray-400">일괄 변경</span>
          {[10, 9, 8, 7, 6].map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => onApplyBulkGems(lv)}
              className="spec-touch-control px-2 py-0.5 text-[11px] rounded border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-la-gold/50 hover:text-la-gold-dark dark:hover:text-la-gold"
            >
              {lv}겁작
            </button>
          ))}
        </div>
      </div>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
        {gems.Gems?.map((g) => {
          const cleanName = stripGemName(g.Name);
          const isGlow = cleanName.includes('광휘');
          const currentLevel = gemMods[g.Slot]?.Level ?? g.Level;
          const currentType = detectCurrentType(gemMods[g.Slot]?.Tooltip ?? g.Tooltip);
          const typeLabel =
            currentType === 'damage' ? '겁화'
              : currentType === 'cooldown' ? '작열'
                : currentType === 'support' ? '지원'
                  : isGlow ? '광휘' : (cleanName.split(' ').pop() ?? '');
          const skill = gems.Effects?.Skills?.find((s) => s.GemSlot === g.Slot);
          const skillShort = skill?.Name?.slice(0, 3) ?? '';
          return (
            <div
              key={g.Slot}
              className="flex w-16 flex-shrink-0 snap-start flex-col items-stretch gap-1 sm:w-[56px]"
            >
              {/* 아이콘 + 레벨 뱃지 */}
              <div className="relative w-full aspect-square rounded bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/5 overflow-hidden">
                <img src={g.Icon} alt="" className="w-full h-full object-cover" />
                <span className="absolute top-0.5 right-0.5 text-[10px] font-bold text-white bg-black/70 rounded px-1 leading-tight">
                  {currentLevel}
                </span>
              </div>
              {/* 타입 select (광휘만 변경 가능, 외엔 readonly display) */}
              {isGlow ? (
                <select
                  value={currentType === 'unknown' ? 'damage' : currentType}
                  onChange={(e) => {
                    const nextType = isGlowGemType(e.target.value) ? e.target.value : 'damage';
                    onGemChange(g.Slot, { Tooltip: synthGlowTooltip(nextType) });
                  }}
                  className="spec-touch-control bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-[10px] text-center"
                >
                  <option value="damage">겁화</option>
                  <option value="cooldown">작열</option>
                  <option value="support">지원</option>
                </select>
              ) : (
                <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-[10px] text-center text-gray-500 dark:text-gray-400">
                  {typeLabel}
                </div>
              )}
              {/* 레벨 select */}
              <select
                value={currentLevel}
                onChange={(e) => onGemChange(g.Slot, { Level: Number(e.target.value) })}
                className="spec-touch-control bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-[10px] text-center"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
              {/* 스킬명 (truncate) */}
              <div
                title={skill?.Name ?? ''}
                className="text-[10px] text-center text-gray-500 dark:text-gray-400 truncate"
              >
                {skillShort || '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
