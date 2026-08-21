import type { ReactElement } from 'react';
import { stripGemName } from '../../data/specScore/gems';
import type { GemData } from '../../types/lostark';
import { SpecSelect } from './SpecSelect';
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

const GLOW_GEM_TYPES = ['damage', 'cooldown'] as const;
type GlowGemType = typeof GLOW_GEM_TYPES[number];

const isGlowGemType = (value: string): value is GlowGemType =>
  GLOW_GEM_TYPES.some((type) => type === value);

const synthGlowTooltip = (type: GlowGemType): string => {
  if (type === 'damage') return '특정 스킬의 피해 36% 증가';
  return '특정 스킬의 재사용 대기시간 20% 감소';
};

const detectCurrentType = (tooltip: string | undefined): GlowGemType | 'unknown' => {
  if (!tooltip) return 'unknown';
  const t = tooltip.replace(/<[^>]+>/g, ' ');
  if (/피해\s*\d+(?:\.\d+)?\s*%?\s*증가/.test(t)) return 'damage';
  if (/재사용\s*대기시간\s*\d+(?:\.\d+)?\s*%?\s*감소/.test(t)) return 'cooldown';
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
    <div className="glass-card px-4 py-2 sm:px-5 sm:py-3">
      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2">
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
      <div className="-mx-1 grid grid-cols-[repeat(11,minmax(4rem,1fr))] snap-x gap-2 overflow-x-auto px-1 pb-1">
        {gems.Gems?.map((g) => {
          const cleanName = stripGemName(g.Name);
          const isGlow = cleanName.includes('광휘');
          const currentLevel = gemMods[g.Slot]?.Level ?? g.Level;
          const currentType = detectCurrentType(gemMods[g.Slot]?.Tooltip ?? g.Tooltip);
          const typeLabel =
            currentType === 'damage' ? '겁화'
              : currentType === 'cooldown' ? '작열'
                : isGlow ? '광휘' : (cleanName.split(' ').pop() ?? '');
          const skill = gems.Effects?.Skills?.find((s) => s.GemSlot === g.Slot);
          return (
            <div
              key={g.Slot}
              className="flex min-w-0 snap-start flex-col items-stretch gap-1"
            >
              {/* 아이콘 + 레벨 뱃지 */}
              <div className="relative w-full aspect-square rounded bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/5 overflow-hidden">
                <img src={g.Icon} alt="" loading="lazy" className="w-full h-full object-cover" />
                <span className="absolute top-0.5 right-0.5 text-[10px] font-bold text-white bg-black/70 rounded px-1 leading-tight">
                  {currentLevel}
                </span>
              </div>
              {/* 타입 select (광휘만 변경 가능, 외엔 readonly display) */}
              {isGlow ? (
                <SpecSelect
                  value={currentType === 'unknown' ? 'damage' : currentType}
                  onChange={(value) => {
                    const nextType = isGlowGemType(value) ? value : 'damage';
                    onGemChange(g.Slot, { Tooltip: synthGlowTooltip(nextType) });
                  }}
                  items={[
                    { value: 'damage', label: '겁화' },
                    { value: 'cooldown', label: '작열' },
                  ]}
                  ariaLabel={`${skill?.Name ?? '광휘 보석'} 타입`}
                  textAlign="center"
                />
              ) : (
                <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-[10px] text-center text-gray-500 dark:text-gray-400">
                  {typeLabel}
                </div>
              )}
              {/* 레벨 select */}
              <SpecSelect
                value={currentLevel}
                onChange={(value) => onGemChange(g.Slot, { Level: Number(value) })}
                items={Array.from({ length: 10 }, (_, i) => i + 1).map((level) => ({
                  value: level,
                  label: String(level),
                }))}
                ariaLabel={`${skill?.Name ?? '보석'} 레벨`}
                textAlign="center"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
