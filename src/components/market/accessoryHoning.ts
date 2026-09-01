export const HONING_EFFECT_VALUES: Readonly<Record<string, readonly number[]>> = {
  '추가 피해': [260, 160, 70],
  '적에게 주는 피해 증가': [200, 120, 55],
  '공격력 +': [390, 195, 80],
  '무기 공격력 +': [960, 480, 195],
  '세레나데, 신앙, 조화 게이지 획득량 증가': [600, 360, 160],
  낙인력: [800, 480, 215],
  '공격력 %': [155, 95, 40],
  '무기 공격력 %': [300, 180, 80],
  '치명타 적중률': [155, 95, 40],
  '치명타 피해': [400, 240, 110],
  '아군 공격력 강화 효과': [500, 300, 135],
  '아군 피해량 강화 효과': [750, 450, 200],
};

const DEALER_EFFECTS = new Set([
  '추가 피해', '적에게 주는 피해 증가', '공격력 +', '무기 공격력 +',
  '공격력 %', '무기 공격력 %', '치명타 적중률', '치명타 피해',
]);
const SUPPORT_EFFECTS = new Set([
  '세레나데, 신앙, 조화 게이지 획득량 증가', '낙인력',
  '아군 공격력 강화 효과', '아군 피해량 강화 효과',
]);
const SUPPORT_COMPROMISE_EFFECTS = new Set([
  '파티원 회복 효과', '파티원 보호막 효과', '최대 생명력', '최대 마나',
]);

export const HONING_TIER_COLORS = [
  'rgb(251, 160, 38)',
  'rgb(117, 4, 251)',
  'rgb(44, 130, 201)',
] as const;

export const getHoningEffectRoleColor = (optionName?: string): string | undefined => {
  if (!optionName) return undefined;
  if (DEALER_EFFECTS.has(optionName)) return 'rgb(224, 140, 20)';
  if (SUPPORT_EFFECTS.has(optionName)) return 'rgb(35, 82, 196)';
  if (SUPPORT_COMPROMISE_EFFECTS.has(optionName)) return 'rgb(23, 190, 199)';
  return 'rgb(156, 163, 175)';
};

export const normalizeHoningOptionName = (optionName: string, isPercentage?: boolean): string => {
  const trimmedName = optionName.trim();
  return isPercentage && ['공격력', '무기 공격력'].includes(trimmedName)
    ? `${trimmedName} %`
    : trimmedName;
};

const getHoningTierIndex = (optionName: string, value: number, isPercentage?: boolean): number => {
  const comparableValue = isPercentage ? Math.round(value * 100) : value;
  return HONING_EFFECT_VALUES[normalizeHoningOptionName(optionName, isPercentage)]?.indexOf(comparableValue) ?? -1;
};

export const getHoningTierColor = (
  optionName: string,
  value: number,
  isPercentage?: boolean,
): string | undefined => {
  const tierIndex = getHoningTierIndex(optionName, value, isPercentage);
  return tierIndex >= 0 ? HONING_TIER_COLORS[tierIndex] : undefined;
};

export const getHoningTierLabel = (
  optionName: string,
  value: number,
  isPercentage?: boolean,
): string | undefined => {
  const tierIndex = getHoningTierIndex(optionName, value, isPercentage);
  return tierIndex >= 0 ? ['상', '중', '하'][tierIndex] : undefined;
};
