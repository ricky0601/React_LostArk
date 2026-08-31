import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  fetchMarketItems,
  fetchMarketOptions,
  type MarketItem,
} from '../../utils/api';
import { MARKET_SEARCH } from './enhancementModel';
import { selectMarketItem, useEnhancementMarket } from './useEnhancementMarket';

vi.mock('../../utils/api', async () => {
  const actual = await vi.importActual<typeof import('../../utils/api')>('../../utils/api');
  return {
    ...actual,
    fetchMarketItems: vi.fn(),
    fetchMarketOptions: vi.fn(),
  };
});

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
  it('selects the exact API item for the upper Abidos search term', () => {
    const config = MARKET_SEARCH['상급 아비도스 융화'];
    const items = [
      marketItem('상급 아비도스 융화 재료 묶음', 1),
      marketItem('상급 아비도스 융화 재료', 2),
    ];

    expect(config.searchName).toBe('상급 아비도스 융화');
    expect(selectMarketItem(items, config.itemName ?? config.searchName)?.Id).toBe(2);
  });

  it('does not use a different partial match when there is no exact match', () => {
    const items = [marketItem('아비도스 융화 재료 묶음', 1)];

    expect(selectMarketItem(items, '아비도스 융화 재료')).toBeUndefined();
  });

  it('loads the upper Abidos price and icon from the exact API item', async () => {
    vi.mocked(fetchMarketOptions).mockResolvedValue({
      Categories: [{ Code: 50000, CodeName: '재련 재료' }],
    });
    vi.mocked(fetchMarketItems).mockImplementation(async (searchName) => ({
      PageNo: 0,
      PageSize: 10,
      TotalCount: searchName === '상급 아비도스 융화' ? 2 : 0,
      Items: searchName === '상급 아비도스 융화'
        ? [
          marketItem('상급 아비도스 융화 재료 묶음', 1),
          { ...marketItem('상급 아비도스 융화 재료', 2), CurrentMinPrice: 100, BundleCount: 10 },
        ]
        : [],
    }));

    const { result } = renderHook(() => useEnhancementMarket());
    await waitFor(() => expect(result.current.priceLoading).toBe(false));

    expect(fetchMarketItems).toHaveBeenCalledWith('상급 아비도스 융화', 50000, undefined);
    expect(result.current.prices['상급 아비도스 융화']).toBe(10);
    expect(result.current.icons['상급 아비도스 융화']).toBe('/2.png');
  });
});
