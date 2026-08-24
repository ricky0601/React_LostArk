import type { EquipmentItem } from '../../types/lostark';
import { findEquipBySlots, parseEquipDetails, parseItemLevel, parseQuality } from './compareModel';

const equipment = (type: string, name: string): EquipmentItem => ({
  Type: type,
  Name: name,
  Icon: '',
  Grade: '고대',
  Tooltip: '{}',
});

describe('compare model', () => {
  it('parses item levels and equipment quality safely', () => {
    const tooltip = JSON.stringify({
      Element_001: { value: { qualityValue: 93 } },
    });

    expect(parseItemLevel('1,700.50')).toBe(1700.5);
    expect(parseQuality(tooltip)).toBe(93);
    expect(parseQuality('{invalid')).toBe(-1);
  });

  it('parses colored accessory details and excludes base effects', () => {
    const tooltip = JSON.stringify({
      Element_000: {
        type: 'ItemPartBox',
        value: {
          Element_000: '기본 효과',
          Element_001: '힘 +100',
        },
      },
      Element_001: {
        type: 'ItemPartBox',
        value: {
          Element_000: '연마 효과',
          Element_001: '<FONT COLOR="#FFD200">추가 피해 +2.00%</FONT><br>무기 공격력 +1.00%',
        },
      },
    });

    const details = parseEquipDetails(tooltip, '목걸이');

    expect(details.map((detail) => detail.text)).toEqual([
      '추가 피해 +2.00%',
      '무기 공격력 +1.00%',
    ]);
    expect(details.every((detail) => detail.segments && detail.segments.length > 0)).toBe(true);
  });

  it('matches duplicate equipment slots in their original order', () => {
    const items = [
      equipment('귀걸이', '첫 번째 귀걸이'),
      equipment('반지', '첫 번째 반지'),
      equipment('귀걸이', '두 번째 귀걸이'),
    ];

    expect(findEquipBySlots(items, ['귀걸이', '귀걸이']).map((item) => item?.Name)).toEqual([
      '첫 번째 귀걸이',
      '두 번째 귀걸이',
    ]);
  });
});
