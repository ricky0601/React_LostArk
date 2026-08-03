import type { EquipmentItem } from '../types/lostark';
import { parseEquipmentList, parseEquipmentState } from './equipmentState';

const equipment = (
  tooltip: string,
  patch: Partial<EquipmentItem> = {},
): EquipmentItem => ({
  Type: '투구',
  Name: '+19 세르카의 투구',
  Icon: '',
  Grade: '고대',
  Tooltip: tooltip,
  ...patch,
});

describe('parseEquipmentState inherited equipment', () => {
  it('detects Serka inherited gear from Element_001 slotData petBorder', () => {
    const tooltip = JSON.stringify({
      Element_001: { value: { slotData: { petBorder: 6 } } },
      Element_006: { type: 'SingleTextBox', value: '<FONT>[상급 재련] 20단계</FONT>' },
    });

    const state = parseEquipmentState(equipment(tooltip, { Name: '+19 운명의 전율 투구' }));

    expect(state?.tier).toBe('전율');
    expect(state?.isInherited).toBe(true);
    expect(state?.advancedLevel).toBe(20);
  });

  it('keeps normal equipment available for advanced refining simulation', () => {
    const tooltip = JSON.stringify({
      Element_001: { value: { slotData: { petBorder: 3 } } },
      Element_006: { type: 'SingleTextBox', value: '<FONT>[상급 재련] 10단계</FONT>' },
    });

    const state = parseEquipmentState(equipment(tooltip));

    expect(state?.isInherited).toBe(false);
    expect(state?.advancedLevel).toBe(10);
  });
});

describe('parseEquipmentState normal honing power tables', () => {
  it('creates an unequipped armlet simulation state when API has no armlet', () => {
    const result = parseEquipmentList([]);

    expect(result.armlet).toMatchObject({
      slot: 'armlet',
      normalLevel: 0,
      advancedLevel: 0,
      tier: '미착용',
    });
  });

  it('parses armlet only at supported public simulation levels', () => {
    const supported = parseEquipmentState(equipment('{}', {
      Type: '완갑',
      Name: '+15 운명의 전용 완갑',
      Grade: '전설',
    }));
    const unsupported = parseEquipmentState(equipment('{}', {
      Type: '완갑',
      Name: '+13 운명의 전용 완갑',
      Grade: '영웅',
    }));

    expect(supported?.normalLevel).toBe(15);
    expect(supported?.tier).toBe('전설');
    expect(supported?.advancedLevel).toBe(0);
    expect(supported?.normalHoningDelta).toEqual({
      kind: 'armlet',
      weaponAttack: 14817,
      mainStat: 1968,
      baseAttackPercent: 1.5,
    });
    expect(unsupported?.normalLevel).toBe(0);
    expect(unsupported?.tier).toBe('미착용');
  });

  it('attaches Egir armor tooltip stat delta for the current normal level', () => {
    const tooltip = JSON.stringify({
      Element_001: { value: { slotData: { petBorder: 3 } } },
      Element_006: { type: 'SingleTextBox', value: '<FONT>[상급 재련] 20단계</FONT>' },
    });

    const state = parseEquipmentState(equipment(tooltip, {
      Type: '투구',
      Name: '+18 운명의 업화 머리장식',
      Grade: '고대',
    }));

    expect(state?.tier).toBe('업화');
    expect(state?.equipmentFamily).toBe('egir');
    expect(state?.normalHoningDelta).toEqual({
      kind: 'armor',
      stats: { health: 136, mainStat: 2061, magicDefense: 135, physicalDefense: 121 },
    });
  });

  it('attaches Egir weapon attack delta for the current normal level', () => {
    const tooltip = JSON.stringify({
      Element_001: { value: { slotData: { petBorder: 3 } } },
    });

    const state = parseEquipmentState(equipment(tooltip, {
      Type: '무기',
      Name: '+22 운명의 업화 장궁',
      Grade: '고대',
    }));

    expect(state?.tier).toBe('업화');
    expect(state?.equipmentFamily).toBe('egir');
    expect(state?.normalHoningDelta).toEqual({ kind: 'weapon', weaponAttack: 4387 });
  });

  it('keeps Serka inherited gear on the Serka normal honing table', () => {
    const tooltip = JSON.stringify({
      Element_001: { value: { slotData: { petBorder: 6 } } },
    });

    const state = parseEquipmentState(equipment(tooltip, {
      Type: '장갑',
      Name: '+17 운명의 전율 장갑',
      Grade: '고대',
    }));

    expect(state?.equipmentFamily).toBe('serka');
    expect(state?.normalHoningDelta).toEqual({
      kind: 'armor',
      stats: { health: 101, mainStat: 3350, magicDefense: 102, physicalDefense: 102 },
    });
  });

  it('keeps 운명의 전율 gear on the Serka mapping even when the API grade is 고대', () => {
    const tooltip = JSON.stringify({
      Element_001: { value: { slotData: { petBorder: 6 } } },
    });

    const state = parseEquipmentState(equipment(tooltip, {
      Type: '장갑',
      Name: '+17 운명의 전율 장갑',
      Grade: '고대',
    }));

    expect(state?.tier).toBe('전율');
    expect(state?.equipmentFamily).toBe('serka');
    expect(state?.isInherited).toBe(true);
  });
});
