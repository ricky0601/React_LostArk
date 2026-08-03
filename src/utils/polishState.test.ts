import type { EquipmentItem } from '../types/lostark';
import { parseAccessoryList, parseBraceletState } from './polishState';

const accessory = (tooltip: string): EquipmentItem => ({
  Grade: '고대',
  Icon: '',
  Name: '목걸이',
  Tooltip: tooltip,
  Type: '목걸이',
});

describe('parseAccessoryList', () => {
  it('parses accessory polish effect lines into matching options', () => {
    // Given
    const tooltip = JSON.stringify({
      Element_001: {
        type: 'ItemPartBox',
        value: {
          Element_000: '연마 효과',
          Element_001: '적에게 주는 피해 +1.20%<br>추가 피해 +1.60%<br>공격력 +390',
        },
      },
    });

    // When
    const parsed = parseAccessoryList([accessory(tooltip)]);

    // Then
    expect(parsed.necklace?.polishOptions.map((option) => option.label)).toEqual([
      '적에게 주는 피해 +1.20%',
      '추가 피해 +1.60%',
      '공격력 +390',
    ]);
  });
});


describe('parseBraceletState', () => {
  it('continues to parse compact standalone bracelet weapon attack labels', () => {
    // Given
    const item: EquipmentItem = {
      Grade: '고대',
      Icon: '',
      Name: '팔찌',
      Type: '팔찌',
      Tooltip: JSON.stringify({
        Element_001: {
          type: 'ItemPartBox',
          value: {
            Element_000: '팔찌 효과',
            Element_001: '무기 공격력 +7200',
          },
        },
      }),
    };

    // When
    const parsed = parseBraceletState(item);

    // Then
    expect(parsed?.options[0]).toMatchObject({ type: '무기 공격력', value: 7200 });
  });
});
