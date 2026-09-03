import type { ArkPassiveData, EquipmentItem } from '../../types/lostark';
import { equipmentCells, formatArkGrid, formatArkGridGemTooltip, formatKarma, isBoundGem, isPrimaryArkGridEffect, parseArkPassiveNode, sortArkGridEffects } from './expeditionModel';

const equipment = (Type: string, Name: string, quality: number, advanced: number): EquipmentItem => ({
  Type,
  Name,
  Icon: '',
  Grade: '고대',
  Tooltip: JSON.stringify({
    Element_000: { type: 'ItemTitle', value: { qualityValue: quality } },
    Element_006: { type: 'SingleTextBox', value: `<FONT>[상급 재련] ${advanced}단계</FONT>` },
  }),
});

describe('expedition dashboard model', () => {
  it('parses honing, advanced honing, and quality by equipment slot', () => {
    const cells = equipmentCells([
      equipment('무기', '+20 운명의 업화 무기', 97, 40),
      equipment('상의', '+18 운명의 업화 상의', 82, 20),
      equipment('완갑', '+15 고대 완갑', 76, 0),
    ]);

    expect(cells.find((cell) => cell.label === '무기')).toEqual({
      label: '무기', name: '+20 운명의 업화 무기', icon: null, grade: '고대', normalLevel: 20, advancedLevel: 40, quality: 97,
    });
    expect(cells.find((cell) => cell.label === '상의')).toEqual({
      label: '상의', name: '+18 운명의 업화 상의', icon: null, grade: '고대', normalLevel: 18, advancedLevel: 20, quality: 82,
    });
    expect(cells.find((cell) => cell.label === '완갑')).toEqual({
      label: '완갑', name: '+15 고대 완갑', icon: null, grade: '고대', normalLevel: 15, advancedLevel: null, quality: 76,
    });
    expect(cells.find((cell) => cell.label === '투구')?.normalLevel).toBeNull();
  });

  it('distinguishes bound gems from tradeable gems by the API name', () => {
    const gem = (Name: string) => ({ Slot: 0, Name, Icon: '', Level: 8, Grade: '고대', Tooltip: '' });
    expect(isBoundGem(gem("<FONT>8레벨 광휘의 보석 (귀속)</FONT>"))).toBe(true);
    expect(isBoundGem(gem('<FONT>8레벨 광휘의 보석</FONT>'))).toBe(false);
  });

  it('parses ark passive tier, node name, and level from the API description', () => {
    expect(parseArkPassiveNode({
      Name: '진화',
      Description: "<FONT color='#F1D594'>진화</FONT> 1티어 <FONT color='#F1D594'>치명 Lv.29</FONT>",
      Icon: '/passive.png',
    })).toEqual({ tier: 1, name: '치명', level: 29 });
  });

  it.each([
    ['dealer', ['공격력', '추가 피해', '보스 피해', '낙인력', '아군 공격 강화', '아군 피해 강화']],
    ['support', ['낙인력', '아군 공격 강화', '아군 피해 강화', '공격력', '추가 피해', '보스 피해']],
  ] as const)('sorts ark grid effects for the %s role', (role, expected) => {
    const effects = ['아군 피해 강화', '보스 피해', '낙인력', '공격력', '아군 공격 강화', '추가 피해']
      .map((Name, index) => ({ Name, Level: index + 1, Tooltip: '' }));

    expect(sortArkGridEffects(effects, role).map((effect) => effect.Name)).toEqual(expected);
  });

  it('highlights only role-primary ark grid effects', () => {
    expect(isPrimaryArkGridEffect('공격력', 'dealer')).toBe(true);
    expect(isPrimaryArkGridEffect('낙인력', 'dealer')).toBe(false);
    expect(isPrimaryArkGridEffect('낙인력', 'support')).toBe(true);
    expect(isPrimaryArkGridEffect('공격력', 'support')).toBe(false);
    expect(isPrimaryArkGridEffect('공격력', 'unknown')).toBe(false);
  });

  it('formats an ark grid gem tooltip with only its key information', () => {
    expect(formatArkGridGemTooltip({
      Index: 0,
      Icon: '',
      IsActive: true,
      Grade: '전설',
      Tooltip: JSON.stringify({
        Element_000: { type: 'NameTagBox', value: '질서의 젬 : 안정' },
        Element_004: { type: 'ItemPartBox', value: { Element_001: '젬 타입 : 질서 젬 포인트 : 15' } },
        Element_005: { type: 'ItemPartBox', value: { Element_001: '필요 의지력 : 3 질서 포인트 : 4 [공격력] Lv.3 공격력 +0.11% [아군 피해 강화] Lv.3' } },
      }),
    })).toBe('질서의 젬 : 안정 (전설) · 필요 의지력 3 · 질서 포인트 4 · 공격력 Lv.3, 아군 피해 강화 Lv.3');
  });

  it('summarizes karma and ark grid without inventing missing values', () => {
    const passive: ArkPassiveData = {
      IsArkPassive: true,
      Points: [
        { Name: '진화', Value: 120, Tooltip: '', Description: '6랭크 25레벨' },
        { Name: '깨달음', Value: 100, Tooltip: '', Description: '6랭크 26레벨' },
      ],
      Effects: null,
    };

    expect(formatKarma(passive)).toBe('진화 6R/25 · 깨달음 6R/26');
    expect(formatKarma({ IsArkPassive: false, Points: null, Effects: null })).toBe('-');
    expect(formatArkGrid({
      Slots: [{ Index: 0, Icon: '', Name: '질서 코어', Point: 18, Grade: '고대', Tooltip: '', Gems: null }],
      Effects: [{ Name: '해 효과', Level: 2, Tooltip: '' }],
    })).toBe('1코어 18P · 해 효과 Lv.2');
  });
});
