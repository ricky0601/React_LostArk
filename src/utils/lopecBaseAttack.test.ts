import type { ArkPassiveData } from '../types/lostark';
import type { BraceletState } from './polishState';
import {
  composeEffectiveWeaponAttack,
  invertMainStat,
  parseKarmaState,
  resolveEnlightenmentKarmaWeaponAttackPercent,
  resolvePureBaseAttack,
  sumBraceletFlatWeaponAttack,
} from './lopecBaseAttack';

/** /armories/characters/{name}/arkpassive 응답에서 필요한 부분만 */
const arkPassive = (descriptions: Record<string, string>): ArkPassiveData => ({
  IsArkPassive: true,
  Points: Object.entries(descriptions).map(([Name, Description]) => ({
    Name,
    Value: 0,
    Tooltip: '',
    Description,
  })),
  Effects: null,
});

describe('parseKarmaState', () => {
  it('reads rank and level out of the Points description', () => {
    // Given
    const data = arkPassive({ 진화: '6랭크 25레벨', 깨달음: '6랭크 26레벨', 도약: '6랭크 25레벨' });

    // When / Then
    expect(parseKarmaState(data, '깨달음')).toEqual({ rank: 6, level: 26 });
    expect(parseKarmaState(data, '도약')).toEqual({ rank: 6, level: 25 });
  });

  it('returns undefined when the point or description is missing', () => {
    expect(parseKarmaState(arkPassive({ 진화: '6랭크 25레벨' }), '깨달음')).toBeUndefined();
    expect(parseKarmaState(arkPassive({ 깨달음: '' }), '깨달음')).toBeUndefined();
    expect(parseKarmaState(undefined, '깨달음')).toBeUndefined();
  });
});

describe('resolveEnlightenmentKarmaWeaponAttackPercent', () => {
  it('gives 0.1% weapon attack per enlightenment karma level', () => {
    expect(resolveEnlightenmentKarmaWeaponAttackPercent(arkPassive({ 깨달음: '6랭크 26레벨' }))).toBeCloseTo(2.6, 10);
    expect(resolveEnlightenmentKarmaWeaponAttackPercent(arkPassive({ 깨달음: '6랭크 17레벨' }))).toBeCloseTo(1.7, 10);
  });

  it('contributes nothing when ark passive data is unavailable', () => {
    expect(resolveEnlightenmentKarmaWeaponAttackPercent(undefined)).toBe(0);
  });
});

describe('composeEffectiveWeaponAttack', () => {
  // 한건뜬 2026-07-30: 무기 툴팁 218667, 귀걸이 1.8% x2, 깨달음 카르마 Lv.26 => 2.6%
  it('applies the percent sum once, after flat weapon attack is added', () => {
    const result = composeEffectiveWeaponAttack({
      weaponTooltipAttack: 218_667,
      flatWeaponAttack: 0,
      weaponAttackPercentSum: 1.8 + 1.8 + 2.6,
    });

    expect(result).toBeCloseTo(232_224.354, 3);
  });

  // 동물으나 2026-07-30: 무기 툴팁 145904, 반지 +195 x2, 귀걸이 0.8% + 1.8%, 깨달음 Lv.17 => 1.7%
  it('includes flat weapon attack inside the percent multiplier', () => {
    const result = composeEffectiveWeaponAttack({
      weaponTooltipAttack: 145_904,
      flatWeaponAttack: 195 * 2,
      weaponAttackPercentSum: 1.7 + 0.8 + 1.8,
    });

    expect(result).toBeCloseTo(152_584.642, 3);
  });

  it('returns 0 when the weapon tooltip attack is unavailable', () => {
    expect(composeEffectiveWeaponAttack({
      weaponTooltipAttack: 0,
      flatWeaponAttack: 585,
      weaponAttackPercentSum: 4.3,
    })).toBe(0);
  });
});


describe('sumBraceletFlatWeaponAttack', () => {
  it('includes only the standalone weapon attack option', () => {
    // Given
    const bracelet: BraceletState = {
      tier: '고대',
      effects: [],
      stats: [
        { type: '없음', value: 0 },
        { type: '없음', value: 0 },
        { type: '없음', value: 0 },
        { type: '없음', value: 0 },
      ],
      options: [
        { type: '무기 공격력', grade: '하', label: '무기 공격력 +7200', value: 7200, combatPowerIncreasePercent: 0 },
        { type: '체력 조건 무공 버프', grade: '하', label: '무공 +7200 | 체력 50% 이상 무공 +2000', value: 2000, combatPowerIncreasePercent: 0.54 },
        { type: '에테르 포식자 무공 버프', grade: '하', label: '무공 +6900 | 30초마다 무공 +130 x30', value: 3900, combatPowerIncreasePercent: 1.05 },
        { type: '없음', grade: '하', label: '없음', value: 0, combatPowerIncreasePercent: 0 },
      ],
      raw: { Type: '팔찌', Name: '테스트 팔찌', Icon: '', Grade: '고대', Tooltip: '{}' },
    };

    // When / Then
    expect(sumBraceletFlatWeaponAttack(bracelet)).toBe(7200);
  });
});

describe('resolvePureBaseAttack', () => {
  it('removes the base attack percent bucket from the displayed value', () => {
    // 한건뜬: T4 보석 9.0% + 97돌 1.5%
    expect(resolvePureBaseAttack(181_813, 10.5)).toBeCloseTo(164_536.65, 2);
    // 동물으나: T4 보석 5.7%, 97돌 없음
    expect(resolvePureBaseAttack(124_645, 5.7)).toBeCloseTo(117_923.368, 3);
  });
});

describe('invertMainStat', () => {
  /**
   * 교차 검증: 2026-07-29 인게임 주스탯 696152 + 어깨 +17->+18 (테이블 3045, 배율 1.09)
   * 이 예측하는 699471 과 입력을 전혀 공유하지 않고 일치한다.
   */
  it('reproduces the cross-checked main stat for 한건뜬', () => {
    const result = invertMainStat({
      displayedBaseAttack: 181_813,
      effectiveWeaponAttack: 232_224.354,
      baseAttackPercentSum: 10.5,
    });

    expect(result).toBeCloseTo(699_469.5, 1);
    expect(Math.abs(result - (696_152 + 3045 * 1.09))).toBeLessThan(2);
  });

  it('reproduces the decomposed main stat for 동물으나', () => {
    const result = invertMainStat({
      displayedBaseAttack: 124_645,
      effectiveWeaponAttack: 152_584.642,
      baseAttackPercentSum: 5.7,
    });

    expect(result).toBeCloseTo(546_814.694, 3);
  });

  it('returns 0 rather than guessing when an input is missing', () => {
    expect(invertMainStat({ displayedBaseAttack: 0, effectiveWeaponAttack: 232_224, baseAttackPercentSum: 10.5 })).toBe(0);
    expect(invertMainStat({ displayedBaseAttack: 181_813, effectiveWeaponAttack: 0, baseAttackPercentSum: 10.5 })).toBe(0);
  });
});
