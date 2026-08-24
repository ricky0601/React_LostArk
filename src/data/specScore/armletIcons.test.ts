import { resolveArmletIconUrl } from './armletIcons';

const CDN_BASE = 'https://cdn-lostark.game.onstove.com/efui_iconatlas/bracer/bracer_';

describe('armlet class-group icons', () => {
  it.each([
    ['디스트로이어', 1], ['버서커', 1], ['워로드', 1], ['홀리나이트', 1],
    ['발키리', 2], ['슬레이어', 2],
    ['바드', 3], ['서머너', 3], ['소서리스', 3], ['아르카나', 3],
    ['인파이터', 4], ['배틀마스터', 4], ['창술사', 4], ['기공사', 4],
    ['브레이커', 5], ['스트라이커', 5],
    ['데모닉', 6], ['리퍼', 6], ['블레이드', 6], ['소울이터', 6],
    ['호크아이', 7], ['스카우터', 7], ['블래스터', 7], ['데빌헌터', 7],
    ['건슬링어', 8],
    ['도화가', 9], ['기상술사', 9], ['환수사', 9],
    ['차원술사', 10],
    ['가디언나이트', 11],
  ] as const)('maps %s to bracer group %i', (characterClassName, baseNumber) => {
    expect(resolveArmletIconUrl(characterClassName, '영웅')).toBe(`${CDN_BASE}${baseNumber}.png`);
    expect(resolveArmletIconUrl(characterClassName, '미착용')).toBe(`${CDN_BASE}${baseNumber}.png`);
  });

  it.each([
    ['영웅', 3],
    ['전설', 14],
    ['유물', 25],
    ['고대', 36],
  ] as const)('adds the %s grade offset', (grade, imageNumber) => {
    expect(resolveArmletIconUrl('바드', grade)).toBe(`${CDN_BASE}${imageNumber}.png`);
  });

  it('returns null for an unknown class or grade', () => {
    expect(resolveArmletIconUrl('알 수 없는 직업', '영웅')).toBeNull();
    expect(resolveArmletIconUrl('바드', '알 수 없는 등급')).toBeNull();
  });
});
