import { describe, expect, it } from 'vitest';
import { resolveRaidSynergyEffect } from './raidSynergyEffects';

describe('raid synergy effect model', () => {
  it('models head/back synergy as 4% general plus 5% directional damage', () => {
    expect(resolveRaidSynergyEffect('헤드·백어택 피해 증가')).toEqual({
      category: 'directional-damage',
      generalRate: 0.04,
      directionalRate: 0.05,
      estimated: false,
      sourceId: 'community-synergy-2026-01-26',
    });
  });

  it('marks stat-dependent critical efficiency as estimated', () => {
    expect(resolveRaidSynergyEffect('치명타 적중률 증가')).toMatchObject({
      generalRate: 0.06,
      estimated: true,
    });
  });

  it('does not invent a damage value for utility or unknown effects', () => {
    expect(resolveRaidSynergyEffect('무력화 피해 증가')?.generalRate).toBe(0);
    expect(resolveRaidSynergyEffect('미확인 시너지')).toBeNull();
  });
});
