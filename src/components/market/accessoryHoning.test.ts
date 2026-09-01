import { getHoningEffectRoleColor, getHoningTierColor, getHoningTierLabel } from './accessoryHoning';

describe('accessory honing colors', () => {
  it('classifies honing effect roles using the reference colors', () => {
    expect(getHoningEffectRoleColor('추가 피해')).toBe('rgb(224, 140, 20)');
    expect(getHoningEffectRoleColor('낙인력')).toBe('rgb(35, 82, 196)');
    expect(getHoningEffectRoleColor('최대 생명력')).toBe('rgb(23, 190, 199)');
    expect(getHoningEffectRoleColor('전투 중 생명력 회복량')).toBe('rgb(156, 163, 175)');
  });

  it('colors high, medium, and low honing values as legendary, heroic, and rare', () => {
    expect(getHoningTierColor('적에게 주는 피해 증가', 2, true)).toBe('rgb(251, 160, 38)');
    expect(getHoningTierColor('적에게 주는 피해 증가', 1.2, true)).toBe('rgb(117, 4, 251)');
    expect(getHoningTierColor('적에게 주는 피해 증가', 0.55, true)).toBe('rgb(44, 130, 201)');
    expect(getHoningTierLabel('적에게 주는 피해 증가', 2, true)).toBe('상');
    expect(getHoningTierLabel('적에게 주는 피해 증가', 1.2, true)).toBe('중');
    expect(getHoningTierLabel('적에게 주는 피해 증가', 0.55, true)).toBe('하');
    expect(getHoningTierLabel('공격력 ', 1.55, true)).toBe('상');
    expect(getHoningTierLabel('무기 공격력 ', 1.8, true)).toBe('중');
  });
});
