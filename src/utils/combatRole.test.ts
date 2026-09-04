import { describe, expect, it } from 'vitest';
import type { ArkPassiveData } from '../types/lostark';
import { resolveCombatRole } from './combatRole';

const arkPassive = (Title: string | null, IsArkPassive = true): ArkPassiveData => ({
  IsArkPassive,
  Title,
  Points: [],
  Effects: [],
});

describe('resolveCombatRole', () => {
  it.each([
    ['바드', '절실한 구원'],
    ['홀리나이트', '축복의 오라'],
    ['도화가', '만개'],
    ['발키리', '해방자'],
  ])('resolves %s with %s as support', (className, title) => {
    expect(resolveCombatRole(className, arkPassive(title))).toEqual({ role: 'support' });
  });

  it.each(['바드', '홀리나이트', '도화가', '발키리'])('resolves another valid %s title as dealer', (className) => {
    expect(resolveCombatRole(className, arkPassive('심판자'))).toEqual({ role: 'dealer' });
  });

  it('does not inspect Tier 1 effects and keeps a missing title unknown', () => {
    const data = arkPassive(null);
    data.Effects = [{ Name: '깨달음', Description: '절실한 구원', ToolTip: 'Tier 1' }];
    expect(resolveCombatRole('바드', data).role).toBe('unknown');
  });

  it.each([undefined, arkPassive(null), arkPassive('절실한 구원', false)])(
    'keeps an unavailable support-capable class unknown',
    (data) => expect(resolveCombatRole('바드', data).role).toBe('unknown'),
  );

  it('resolves every other class as dealer without Ark Passive data', () => {
    expect(resolveCombatRole('버서커', undefined)).toEqual({ role: 'dealer' });
  });
});
