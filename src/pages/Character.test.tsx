import type { EquipmentItem } from '../types/lostark';
import { getCombatEquipmentItems } from '../utils/characterEquipment';

const equipment = (type: string, name: string): EquipmentItem => ({
  Type: type,
  Name: name,
  Icon: '',
  Grade: '고대',
  Tooltip: '{}',
});

describe('getCombatEquipmentItems', () => {
  it('places 완갑 directly below 무기 when present', () => {
    const items = [
      equipment('투구', '+19 운명의 전율 투구'),
      equipment('완갑', '+9 운명의 전율 완갑'),
      equipment('무기', '+21 운명의 전율 한손검'),
      equipment('목걸이', '도래한 결전의 목걸이'),
    ];

    expect(getCombatEquipmentItems(items).map((item) => item.Type)).toEqual(['무기', '완갑', '투구']);
  });
});
