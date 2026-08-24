import {
  ARMLET_STEPS,
  SERKA_ARMOR_STEPS,
  AEGIR_ARMOR_STEPS,
} from '../../data/enhancement';
import {
  calcStepData,
  findCheapestAdv,
  getStepsForSlot,
  parseEnhLevel,
  parseTooltipData,
} from './enhancementModel';

describe('enhancement model', () => {
  it('parses enhancement and advanced honing state from equipment payloads', () => {
    const tooltip = JSON.stringify({
      Element_001: { value: { slotData: { petBorder: 6 } } },
      Element_002: { value: '<FONT>[상급 재련] 30단계</FONT>' },
    });

    expect(parseEnhLevel('+21 운명의 전율 무기')).toBe(21);
    expect(parseEnhLevel('강화 수치 없는 장비')).toBe(0);
    expect(parseTooltipData(tooltip)).toEqual({ isInherited: true, advLevel: 30 });
    expect(parseTooltipData('{invalid')).toEqual({ isInherited: false, advLevel: 0 });
  });

  it('selects step tables by slot and inheritance state', () => {
    expect(getStepsForSlot('완갑', false)).toBe(ARMLET_STEPS);
    expect(getStepsForSlot('투구', false)).toBe(AEGIR_ARMOR_STEPS);
    expect(getStepsForSlot('투구', true)).toBe(SERKA_ARMOR_STEPS);
  });

  it('produces average and ceiling totals for every selected step', () => {
    const [result] = calcStepData([AEGIR_ARMOR_STEPS[0]], false, true, {});

    expect(result.totalGold).toBe(result.directGold + result.matGold);
    expect(result.ceilingTotalGold).toBe(result.ceilingDirectGold + result.ceilingMatGold);
    expect(result.ceiling).toBeGreaterThanOrEqual(result.exp);
  });

  it('returns the neutral advanced honing options without active slots', () => {
    expect(findCheapestAdv([], {}, {}, {})).toEqual({
      normalOpt: 'none',
      ancestorOpt: 'none',
      enhancedOpt: 'none',
    });
  });
});
