import { describe, expect, it } from 'vitest';
import type { MarketItem } from '../../utils/api';
import { selectMarketItem } from './useEnhancementMarket';

const marketItem = (Name: string, Id: number): MarketItem => ({
  Id,
  Name,
  Grade: '고급',
  Icon: `/${Id}.png`,
  BundleCount: 1,
  TradeRemainCount: null,
  YDayAvgPrice: 1,
  RecentPrice: 1,
  CurrentMinPrice: 1,
});

describe('selectMarketItem', () => {
  it('selects the exact material instead of the first partial search result', () => {
    const items = [
      marketItem('상급 아비도스 융화', 1),
      marketItem('아비도스 융화 재료', 2),
    ];

    expect(selectMarketItem(items, '아비도스 융화 재료')?.Id).toBe(2);
  });

  it('does not use a different partial match when there is no exact match', () => {
    const items = [marketItem('아비도스 융화 재료 묶음', 1)];

    expect(selectMarketItem(items, '아비도스 융화 재료')).toBeUndefined();
  });
});
