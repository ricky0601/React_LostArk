import { parseEnchantFromName, parseEquipmentInfo } from './equipmentTooltip';

describe('character equipment tooltip parser', () => {
  it('parses enhancement, quality, advanced honing, and accessory effects', () => {
    const tooltip = JSON.stringify({
      Element_000: {
        type: 'ItemTitle',
        value: { qualityValue: 87 },
      },
      Element_001: {
        type: 'SingleTextBox',
        value: '<FONT>[상급 재련] 40단계</FONT>',
      },
      Element_002: {
        type: 'ItemPartBox',
        value: {
          Element_000: '연마 효과',
          Element_001: '<FONT COLOR="#FFD200">추가 피해 +2.00%</FONT><br>무기 공격력 +1.00%',
        },
      },
    });

    const result = parseEquipmentInfo('+20 테스트 목걸이', tooltip);

    expect(result.quality).toBe(87);
    expect(result.enchantLevel).toBe(20);
    expect(result.transcendenceLevel).toBe(40);
    expect(result.effects.map((effect) => effect.text)).toEqual([
      '추가 피해 +2.00%',
      '무기 공격력 +1.00%',
    ]);
    expect(result.effects.every((effect) => effect.segments && effect.segments.length > 0)).toBe(true);
  });

  it('extracts ability stone engraving effects', () => {
    const tooltip = JSON.stringify({
      Element_000: {
        type: 'IndentStringGroup',
        value: {
          Element_000: {
            topStr: '각인 효과',
            contentStr: {
              Element_000: { contentStr: '<FONT COLOR="#FFFFFF">원한 Lv.3</FONT>' },
            },
          },
        },
      },
    });

    expect(parseEquipmentInfo('테스트 어빌리티 스톤', tooltip).effects.map((effect) => effect.text))
      .toEqual(['원한 Lv.3']);
  });

  it('returns a safe fallback for malformed tooltip JSON', () => {
    expect(parseEnchantFromName('강화 수치 없는 장비')).toBeNull();
    expect(parseEquipmentInfo('+9 테스트 완갑', '{invalid')).toEqual({
      quality: null,
      enchantLevel: 9,
      transcendenceLevel: null,
      effects: [],
    });
  });
});
