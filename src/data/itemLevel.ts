/**
 * 장비 티어별 강화 레벨 → 아이템 레벨 테이블
 *
 * - 무기/방어구 부위 구분 없이 강화 수치에 따른 아이템 레벨이 동일
 * - 종합 아이템 레벨 = 6부위 아이템 레벨의 합 / 6
 */

export type ItemLevelTable = Record<number, number>;

export interface GearTierItemLevel {
  name: string;
  levels: ItemLevelTable;
}

export const GEAR_ITEM_LEVELS: GearTierItemLevel[] = [
  {
    name: '에기르',
    levels: {
      10: 1640,
      11: 1645,
      12: 1650,
      13: 1655,
      14: 1660,
      15: 1665,
      16: 1670,
      17: 1675,
      18: 1680,
      19: 1685,
      20: 1690,
      21: 1695,
      22: 1700,
      23: 1705,
      24: 1710,
      25: 1715,
    },
  },
  {
    name: '세르카 계승',
    levels: {
      11: 1730,
      12: 1735,
      13: 1740,
      14: 1745,
      15: 1750,
      16: 1755,
      17: 1760,
      18: 1765,
      19: 1770,
      20: 1775,
      21: 1780,
      22: 1785,
      23: 1790,
      24: 1795,
      25: 1800,
    },
  },
];
