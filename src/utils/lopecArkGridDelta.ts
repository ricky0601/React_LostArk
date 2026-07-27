import type { ArkGridData, ArkGridSlot } from '../types/lostark';

const ARK_GRID_GEM_FACTORS: Readonly<Record<string, number>> = {
  공격력: 1.00029590116738,
  '추가 피해': 1.00058968900552,
  '보스 피해': 1.00077098396996,
};

const ORDER_SUN_MOON: Readonly<Record<number, number>> = {
  10: 1.5,
  14: 4,
  17: 7.5,
  18: 7.67,
  19: 7.83,
  20: 8,
};

const ORDER_STAR: Readonly<Record<number, number>> = {
  10: 1,
  14: 2.5,
  17: 4.5,
  18: 4.67,
  19: 4.83,
  20: 5,
};

const CHAOS_HIGH: Readonly<Record<number, number>> = {
  10: 0.5,
  14: 1,
  17: 2.5,
  18: 2.67,
  19: 2.83,
  20: 3,
};

const CHAOS_LOW: Readonly<Record<number, number>> = {
  10: 0,
  14: 0.5,
  17: 1.5,
  18: 1.67,
  19: 1.83,
  20: 2,
};

const normalize = (value: string): string => value.replace(/\s+/g, '');

const isSupportedCoreGrade = (grade: string): boolean =>
  grade === '영웅' || grade === '전설' || grade === '유물' || grade === '고대';

const withAncientBonus = (grade: string, point: number, percent: number): number => {
  if (grade === '고대' && point >= 17 && point <= 20) return percent + 1;
  return percent;
};

const resolveActivePoint = (point: number): number => {
  if (point >= 20) return 20;
  if (point >= 19) return 19;
  if (point >= 18) return 18;
  if (point >= 17) return 17;
  if (point >= 14) return 14;
  if (point >= 10) return 10;
  return 0;
};

const pointPercent = (table: Readonly<Record<number, number>>, grade: string, point: number): number => {
  if (!isSupportedCoreGrade(grade)) return 0;
  const activePoint = resolveActivePoint(point);
  if (activePoint === 0) return 0;
  const percent = table[activePoint];
  if (percent === undefined) return 0;
  return withAncientBonus(grade, activePoint, percent);
};

const resolveOrderPercent = (slot: ArkGridSlot): number => {
  const name = normalize(slot.Name);
  if (name.includes('질서의해')) return pointPercent(ORDER_SUN_MOON, slot.Grade, slot.Point);
  if (name.includes('질서의달')) return pointPercent(ORDER_SUN_MOON, slot.Grade, slot.Point);
  if (name.includes('질서의별')) return pointPercent(ORDER_STAR, slot.Grade, slot.Point);
  return 0;
};

const resolveChaosPercent = (slot: ArkGridSlot): number => {
  const name = normalize(slot.Name);
  if (name.includes('무기')) return 0;
  if (name.includes('혼돈의해')) {
    if (name.includes('현란한공격') || name.includes('찬란한공격')) return pointPercent(CHAOS_HIGH, slot.Grade, slot.Point);
    if (name.includes('안정적인공격') || name.includes('재빠른공격')) return pointPercent(CHAOS_LOW, slot.Grade, slot.Point);
  }
  if (name.includes('혼돈의달')) {
    if (name.includes('불타는일격')) return pointPercent(CHAOS_HIGH, slot.Grade, slot.Point);
    if (name.includes('흡수의일격') || name.includes('부수는일격')) return pointPercent(CHAOS_LOW, slot.Grade, slot.Point);
  }
  if (name.includes('혼돈의별') && name.includes('공격')) return pointPercent(CHAOS_HIGH, slot.Grade, slot.Point);
  return 0;
};

const calcArkGridCoreDelta = (
  currentSlots: readonly ArkGridSlot[] | null | undefined,
  modifiedSlots: readonly ArkGridSlot[] | null | undefined,
): number => {
  if (!currentSlots || !modifiedSlots) return 1;
  const modifiedByIndex = new Map(modifiedSlots.map((slot) => [slot.Index, slot]));
  return currentSlots.reduce((factor, currentSlot) => {
    const modifiedSlot = modifiedByIndex.get(currentSlot.Index);
    if (!modifiedSlot || !isSupportedCoreGrade(currentSlot.Grade) || !isSupportedCoreGrade(modifiedSlot.Grade)) {
      return factor;
    }
    const currentPercent = resolveOrderPercent(currentSlot) || resolveChaosPercent(currentSlot);
    const modifiedPercent = resolveOrderPercent(modifiedSlot) || resolveChaosPercent(modifiedSlot);
    return factor * ((1 + modifiedPercent / 100) / (1 + currentPercent / 100));
  }, 1);
};

const calcArkGridGemFactor = (arkGrid: ArkGridData | null | undefined): number => {
  const effects = arkGrid?.Effects;
  if (!effects) return 1;
  return effects.reduce((factor, effect) => {
    const gemFactor = ARK_GRID_GEM_FACTORS[effect.Name];
    if (gemFactor === undefined || effect.Level <= 0) return factor;
    return factor * Math.pow(gemFactor, effect.Level);
  }, 1);
};

export const calcArkGridDelta = (
  currentArkGrid: ArkGridData | null | undefined,
  modifiedArkGrid: ArkGridData | null | undefined,
): number => {
  const currentGemFactor = calcArkGridGemFactor(currentArkGrid);
  if (currentGemFactor <= 0) return 1;
  return calcArkGridCoreDelta(currentArkGrid?.Slots, modifiedArkGrid?.Slots) *
    (calcArkGridGemFactor(modifiedArkGrid) / currentGemFactor);
};
