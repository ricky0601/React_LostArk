import type {
  AuctionEtcSubOption,
  AuctionOptionsResponse,
  AuctionSearchParams,
  MarketCategory,
  MarketOptionsResponse,
} from '../../utils/api';

export type AuctionDetailFilter = {
  readonly firstOption: number;
  readonly secondOption: number;
  readonly minValue?: number;
  readonly maxValue?: number;
};

export type AccessorySearchFilters = {
  readonly part: string;
  readonly tier?: number;
  readonly grade?: string;
  readonly quality?: number;
  readonly tradeAllowCount?: number;
  readonly options: readonly AuctionDetailFilter[];
  readonly sortCondition: 'ASC' | 'DESC';
  readonly pageNo: number;
};

export type BraceletStatFilter = {
  readonly name: string;
  readonly minValue?: number;
  readonly maxValue?: number;
};

export type BraceletSearchFilters = {
  readonly tier?: number;
  readonly grade?: string;
  readonly stats: readonly BraceletStatFilter[];
  readonly assignedEffectCount?: number;
  readonly sortCondition: 'ASC' | 'DESC';
  readonly pageNo: number;
};

export type ResolvedAuctionOption = AuctionEtcSubOption & {
  readonly firstOption: number;
  readonly groupName: string;
};

const normalize = (value: string): string => value.replace(/\s+/g, '').toLowerCase();

const flattenCategories = (
  categories: readonly MarketCategory[],
  parentNames: readonly string[] = [],
  parentCodes: readonly number[] = [],
): Array<{ readonly code: number; readonly name: string; readonly path: readonly string[]; readonly codes: readonly number[] }> =>
  categories.flatMap((category) => {
    const path = [...parentNames, category.CodeName];
    const codes = [...parentCodes, category.Code];
    return [
      { code: category.Code, name: category.CodeName, path, codes },
      ...flattenCategories(category.Subs ?? [], path, codes),
    ];
  });

export const findCategoryCode = (
  categories: readonly MarketCategory[],
  name: string,
  requiredPathText?: string,
): number | undefined => {
  const target = normalize(name);
  const required = requiredPathText ? normalize(requiredPathText) : null;
  const candidates = flattenCategories(categories).filter(({ path }) =>
    !required || path.some((part) => normalize(part).includes(required)),
  );
  return candidates.find((category) => normalize(category.name) === target)?.code
    ?? candidates.find((category) => normalize(category.name).includes(target))?.code;
};

export const getAuctionOptionsForCategory = (
  options: AuctionOptionsResponse,
  categoryCode: number,
  tier?: number,
): ResolvedAuctionOption[] => {
  const categoryCodes = flattenCategories(options.Categories)
    .find((category) => category.code === categoryCode)?.codes ?? [categoryCode];
  return options.EtcOptions.flatMap((group) =>
    (group.EtcSubs ?? [])
      .filter((option) => {
        const categoryFilters = option.Categorys ?? [];
        const tierFilters = option.Tiers ?? [];
        return (categoryFilters.length === 0 || categoryFilters.some((code) => categoryCodes.includes(code)))
          && (tier == null || tierFilters.length === 0 || tierFilters.includes(tier));
      })
      .map((option) => ({ ...option, firstOption: group.Value, groupName: group.Text })),
  );
};

const compactParams = (params: AuctionSearchParams): AuctionSearchParams =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value != null && value !== ''));

export const buildAccessoryRequest = (
  filters: AccessorySearchFilters,
  options: AuctionOptionsResponse,
): AuctionSearchParams => {
  const categoryCode = findCategoryCode(options.Categories, filters.part, '장신구');
  if (categoryCode == null) throw new Error(`${filters.part} 카테고리를 찾을 수 없습니다.`);

  return compactParams({
    CategoryCode: categoryCode,
    ItemTier: filters.tier,
    ItemGrade: filters.grade,
    ItemGradeQuality: filters.quality,
    ItemTradeAllowCount: filters.tradeAllowCount,
    EtcOptions: filters.options.map((option) => ({
      FirstOption: option.firstOption,
      SecondOption: option.secondOption,
      MinValue: option.minValue,
      MaxValue: option.maxValue,
    })),
    PageNo: filters.pageNo,
    Sort: 'BUY_PRICE',
    SortCondition: filters.sortCondition,
  });
};

const findStatOption = (
  options: AuctionOptionsResponse,
  categoryCode: number,
  statName: string,
  tier?: number,
): ResolvedAuctionOption | undefined => {
  const target = normalize(statName);
  return getAuctionOptionsForCategory(options, categoryCode, tier)
    .find((option) => normalize(option.Text) === target);
};

export const buildBraceletRequest = (
  filters: BraceletSearchFilters,
  options: AuctionOptionsResponse,
): AuctionSearchParams => {
  const categoryCode = findCategoryCode(options.Categories, '팔찌');
  if (categoryCode == null) throw new Error('팔찌 카테고리를 찾을 수 없습니다.');
  if (filters.stats.length !== 2 || filters.stats[0].name === filters.stats[1].name) {
    throw new Error('서로 다른 전투 특성 두 개를 선택해 주세요.');
  }

  const resolvedStats = filters.stats.map((stat) => {
    const option = findStatOption(options, categoryCode, stat.name, filters.tier);
    if (!option) throw new Error(`${stat.name} 옵션 코드를 찾을 수 없습니다.`);
    return {
      FirstOption: option.firstOption,
      SecondOption: option.Value,
      MinValue: stat.minValue,
      MaxValue: stat.maxValue,
    };
  });
  const assignedEffectOption = filters.assignedEffectCount == null
    ? undefined
    : getAuctionOptionsForCategory(options, categoryCode, filters.tier).find((option) =>
        normalize(option.groupName) === normalize('팔찌 옵션 수량')
        && normalize(option.Text) === normalize('부여 효과 수량'),
      );
  if (filters.assignedEffectCount != null && !assignedEffectOption) {
    throw new Error('부여 효과 수량 옵션 코드를 찾을 수 없습니다.');
  }

  return compactParams({
    CategoryCode: categoryCode,
    ItemTier: filters.tier,
    ItemGrade: filters.grade,
    EtcOptions: [
      ...resolvedStats,
      ...(assignedEffectOption && filters.assignedEffectCount != null ? [{
        FirstOption: assignedEffectOption.firstOption,
        SecondOption: assignedEffectOption.Value,
        MinValue: filters.assignedEffectCount,
        MaxValue: filters.assignedEffectCount,
      }] : []),
    ],
    PageNo: filters.pageNo,
    Sort: 'BUY_PRICE',
    SortCondition: filters.sortCondition,
  });
};

export const resolveAvatarPartCategories = (
  options: MarketOptionsResponse,
): Array<{ readonly part: string; readonly categoryCode: number }> => {
  const parts = ['무기', '머리', '상의', '하의'];
  return parts.flatMap((part) => {
    const categoryCode = findCategoryCode(options.Categories, part, '아바타');
    return categoryCode == null ? [] : [{ part, categoryCode }];
  });
};
