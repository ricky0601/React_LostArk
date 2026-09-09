import { describe, expect, it } from 'vitest';
import { resolveRaidBuild } from './raidBuildPositions';

describe('resolveRaidBuild', () => {
  it('separates position variants of the same class', () => {
    expect(resolveRaidBuild('가디언나이트', '드레드 로어')).toMatchObject({
      role: 'dealer', position: 'entropy-head', needsReview: false,
    });
    expect(resolveRaidBuild('가디언나이트', '업화의 계승자')).toMatchObject({
      role: 'dealer', position: 'hit-master', needsReview: false,
    });
  });

  it('separates support and dealer builds', () => {
    expect(resolveRaidBuild('홀리나이트', '축복의 오라')).toMatchObject({
      role: 'support', position: 'unknown', needsReview: false,
    });
    expect(resolveRaidBuild('홀리나이트', '심판자')).toMatchObject({
      role: 'dealer', position: 'entropy-back', needsReview: false,
    });
  });

  it('resolves dealer synergies for support-capable classes', () => {
    expect(resolveRaidBuild('바드', '진실된 용맹').synergies).toEqual([
      { name: '방어력 감소', stackingGroup: 'bard:방어력 감소' },
    ]);
    expect(resolveRaidBuild('도화가', '회귀').synergies).toEqual([
      { name: '방어력 감소', stackingGroup: 'artist:방어력 감소' },
    ]);
    expect(resolveRaidBuild('홀리나이트', '심판자').synergies?.[0].name)
      .toBe('치명타 피해 증가');
    expect(resolveRaidBuild('발키리', '빛의 기사').synergies?.[0].name)
      .toBe('치명타 피해 증가');
    expect(resolveRaidBuild('바드', '절실한 구원').synergies).toBeUndefined();
  });

  it('resolves dimensional master ark passive positions', () => {
    expect(resolveRaidBuild('차원술사', '공간 검사')).toMatchObject({
      role: 'dealer', position: 'entropy-back', needsReview: false,
    });
    expect(resolveRaidBuild('차원술사', '시간 관리자')).toMatchObject({
      role: 'dealer', position: 'hit-master', needsReview: false,
    });
  });

  it('does not guess unknown titles', () => {
    expect(resolveRaidBuild('차원술사', '알 수 없는 타이틀')).toEqual({
      role: 'unknown', position: 'unknown', title: '알 수 없는 타이틀', needsReview: true,
    });
  });
});
