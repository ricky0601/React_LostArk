import type { EquipmentItem } from '../types/lostark';
import { parseEquipmentState } from './equipmentState';

const equipment = (tooltip: string): EquipmentItem => ({
  Type: '투구',
  Name: '+19 세르카의 투구',
  Icon: '',
  Grade: '고대',
  Tooltip: tooltip,
});

describe('parseEquipmentState inherited equipment', () => {
  it('detects Serka inherited gear from Element_001 slotData petBorder', () => {
    const tooltip = JSON.stringify({
      Element_001: { value: { slotData: { petBorder: 6 } } },
      Element_006: { type: 'SingleTextBox', value: '<FONT>[상급 재련] 20단계</FONT>' },
    });

    const state = parseEquipmentState(equipment(tooltip));

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
