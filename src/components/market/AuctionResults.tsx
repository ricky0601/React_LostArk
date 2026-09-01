import React from 'react';
import type { AuctionItem } from '../../utils/api';
import { qualityTextColor } from '../../utils/equipmentColors';
import GlassCard from '../GlassCard';
import StateFeedback from '../StateFeedback';
import { getHoningTierColor, getHoningTierLabel, normalizeHoningOptionName } from './accessoryHoning';
import { formatGold } from './marketFormat';

export type SearchState = 'idle' | 'loading' | 'success' | 'error';

interface AuctionResultsProps {
  readonly kind: '장신구' | '팔찌';
  readonly state: SearchState;
  readonly items: readonly AuctionItem[];
  readonly error: string;
  readonly pageNo: number;
  readonly totalCount: number;
  readonly pageSize: number;
  readonly sortCondition: 'ASC' | 'DESC';
  readonly selectedHoningOptionNames?: readonly string[];
  readonly onPageChange: (pageNo: number) => void;
}

export const formatRemainingTime = (endDate: string, now = new Date()): string => {
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime()) || end.getTime() <= now.getTime()) return '만료';
  const minutes = Math.ceil((end.getTime() - now.getTime()) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${remainingMinutes}분`;
  return `${remainingMinutes}분`;
};

const visibleOptions = (
  item: AuctionItem,
  kind: AuctionResultsProps['kind'],
  selectedHoningOptionNames?: readonly string[],
) => {
  if (kind === '팔찌') {
    return item.Options
      .filter((option) => option.Type === 'STAT' || option.Type === 'BRACELET_RANDOM_SLOT')
      .sort((a, b) => Number(a.Type === 'BRACELET_RANDOM_SLOT') - Number(b.Type === 'BRACELET_RANDOM_SLOT'));
  }

  const honingEffects = item.Options.filter((option) =>
    option.Type === 'ACCESSORY_UPGRADE'
    && (!selectedHoningOptionNames || selectedHoningOptionNames.includes(normalizeHoningOptionName(option.OptionName, option.IsValuePercentage))),
  );
  const primaryStat = item.Options.find((option) => option.Type === 'STAT' && ['힘', '민첩', '지능'].includes(option.OptionName));
  const vitality = item.Options.find((option) => option.Type === 'STAT' && option.OptionName === '체력');
  return [
    ...honingEffects,
    ...(primaryStat ? [{ ...primaryStat, OptionName: '힘/민/지' }] : []),
    ...(vitality ? [vitality] : []),
  ];
};

export const getBraceletStatColor = (value: number): string => {
  if (value >= 120) return 'rgb(251, 160, 38)';
  if (value >= 103) return 'rgb(117, 4, 251)';
  if (value >= 85) return 'rgb(44, 130, 201)';
  return 'rgb(97, 189, 109)';
};

export const getAuctionGradeImageStyle = (grade: string): React.CSSProperties | undefined => {
  if (grade === '유물') {
    return {
      background: 'linear-gradient(135deg, #48220b, #a24006)',
      borderColor: '#a24006',
      boxShadow: '0 0 14px rgba(162, 64, 6, 0.45)',
    };
  }
  if (grade === '고대') {
    return {
      background: 'linear-gradient(135deg, #3d3325, #dcc999)',
      borderColor: '#dcc999',
      boxShadow: '0 0 14px rgba(220, 201, 153, 0.45)',
    };
  }
  return undefined;
};

const AuctionResults: React.FC<AuctionResultsProps> = ({
  kind,
  state,
  items,
  error,
  pageNo,
  totalCount,
  pageSize,
  sortCondition,
  selectedHoningOptionNames,
  onPageChange,
}) => {
  if (state === 'idle') {
    return <StateFeedback tone="empty" title={`${kind} 검색 조건을 선택해 주세요`} description="필터를 설정한 뒤 검색 버튼을 눌러 주세요." compact />;
  }
  if (state === 'loading') {
    return <StateFeedback tone="loading" title={`${kind} 매물을 불러오는 중입니다`} compact />;
  }
  if (state === 'error') {
    return <StateFeedback tone="error" title={`${kind} 매물을 불러오지 못했습니다`} description={error} compact />;
  }
  if (items.length === 0) {
    return <StateFeedback tone="empty" title="검색 조건에 맞는 매물이 없습니다" description="조건 범위를 넓혀 다시 검색해 주세요." compact />;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1)));
  return (
    <section aria-label={`${kind} 검색 결과`} className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-950 dark:text-white">{kind} 매물</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">총 {totalCount.toLocaleString()}개 · 즉구가 {sortCondition === 'ASC' ? '낮은 순' : '높은 순'}</p>
        </div>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{pageNo} / {totalPages}</span>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const options = visibleOptions(item, kind, selectedHoningOptionNames);
          return (
            <GlassCard key={`${item.Name}-${item.AuctionInfo.EndDate}-${index}`} className="p-4">
              <div className="flex gap-3">
                <img
                  src={item.Icon}
                  alt=""
                  className="h-14 w-14 flex-shrink-0 rounded-xl border border-transparent bg-gray-100 object-cover dark:bg-white/5"
                  style={getAuctionGradeImageStyle(item.Grade)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-gray-950 dark:text-white">{item.Name}</h3>
                    {item.GradeQuality != null && <span className={`text-xs font-bold ${qualityTextColor(item.GradeQuality)}`}>품질 {item.GradeQuality}</span>}
                    <span className={`text-xs font-bold ${formatRemainingTime(item.AuctionInfo.EndDate) === '만료' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      {formatRemainingTime(item.AuctionInfo.EndDate)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {options.length > 0 ? options.map((option, optionIndex) => {
                      const optionColor = kind === '팔찌'
                        && item.Tier === 4
                        && item.Grade === '고대'
                        && option.Type === 'STAT'
                        ? getBraceletStatColor(option.Value)
                        : undefined;
                      const honingTierLabel = kind === '장신구' && option.Type === 'ACCESSORY_UPGRADE'
                        ? getHoningTierLabel(option.OptionName, option.Value, option.IsValuePercentage)
                        : undefined;
                      const honingTierColor = kind === '장신구' && option.Type === 'ACCESSORY_UPGRADE'
                        ? getHoningTierColor(option.OptionName, option.Value, option.IsValuePercentage)
                        : undefined;
                      return (
                        <span
                          key={`${option.Type}-${option.OptionName}-${optionIndex}`}
                          className={`rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold dark:bg-white/10 ${optionColor ? '' : 'text-gray-700 dark:text-gray-300'}`}
                          style={optionColor ? { color: optionColor } : undefined}
                        >
                          {option.Type === 'BRACELET_RANDOM_SLOT'
                            ? `부여 효과 ${option.Value.toLocaleString()}개`
                            : honingTierLabel && honingTierColor
                              ? <>{option.OptionName.trim()} <span style={{ color: honingTierColor }}>{honingTierLabel}</span></>
                              : `${option.OptionName}${option.OptionNameTripod ? ` ${option.OptionNameTripod}` : ''} ${option.Value.toLocaleString()}${option.IsValuePercentage ? '%' : ''}`}
                        </span>
                      );
                    }) : <span className="text-xs text-gray-400">표시할 옵션 정보 없음</span>}
                  </div>
                </div>
              </div>
              <dl className={`mt-4 grid gap-2 text-sm ${kind === '장신구' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                <div><dt className="text-xs text-gray-500">즉구가</dt><dd className="font-black text-la-gold-deep dark:text-la-gold">{formatGold(item.AuctionInfo.BuyPrice)}</dd></div>
                <div><dt className="text-xs text-gray-500">{kind === '팔찌' ? '최소 입찰가' : '입찰가'}</dt><dd className="font-bold text-gray-800 dark:text-gray-200">{formatGold(item.AuctionInfo.BidPrice || item.AuctionInfo.BidStartPrice)}</dd></div>
                {kind === '장신구' && <div><dt className="text-xs text-gray-500">거래 가능</dt><dd className="font-bold text-gray-800 dark:text-gray-200">{item.AuctionInfo.TradeAllowCount}회</dd></div>}
                <div><dt className="text-xs text-gray-500">남은 시간</dt><dd className="font-bold text-gray-800 dark:text-gray-200">{formatRemainingTime(item.AuctionInfo.EndDate)}</dd></div>
              </dl>
            </GlassCard>
          );
        })}
      </div>

      <div className="flex justify-center gap-2">
        <button type="button" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-40 dark:border-white/10 dark:text-gray-200" disabled={pageNo <= 1} onClick={() => onPageChange(pageNo - 1)}>이전</button>
        <button type="button" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-40 dark:border-white/10 dark:text-gray-200" disabled={pageNo >= totalPages} onClick={() => onPageChange(pageNo + 1)}>다음</button>
      </div>
    </section>
  );
};

export default AuctionResults;
