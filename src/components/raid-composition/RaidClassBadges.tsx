import React from 'react';
import { getRaidClassBadges, type RaidRosterSlot } from './roster';

const TONE_CLASS = {
  position: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  synergy: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  support: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
} as const;

const RaidClassBadges: React.FC<{
  slot: Pick<RaidRosterSlot, 'className' | 'resolvedRole' | 'resolvedPosition' | 'arkPassiveTitle'>;
  compact?: boolean;
}> = ({ slot, compact = false }) => {
  const badges = getRaidClassBadges(slot.className, {
    role: slot.resolvedRole,
    position: slot.resolvedPosition,
    arkPassiveTitle: slot.arkPassiveTitle,
  });
  if (badges.length === 0) return null;

  return (
    <div aria-label="직업 역할, 포지션 및 시너지" className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <span
          key={`${badge.tone}-${badge.label}`}
          className={`rounded font-semibold ${TONE_CLASS[badge.tone]} ${compact ? 'px-1 py-px text-[9px]' : 'px-1.5 py-0.5 text-[11px]'}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
};

export default RaidClassBadges;
