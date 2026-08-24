import { useCallback, useEffect, useState } from 'react';
import { fetchMarketItems, fetchMarketOptions } from '../../utils/api';
import {
  ALL_MATERIAL_TYPES,
  flattenCategories,
  type IconMap,
  MARKET_SEARCH,
  MATERIAL_CATEGORY_KEYWORD,
  type PriceMap,
} from './enhancementModel';

export const useEnhancementMarket = () => {
  const [prices, setPrices] = useState<PriceMap>({});
  const [icons, setIcons] = useState<IconMap>({});
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);

  const loadPrices = useCallback(async () => {
    setPriceLoading(true);
    setPriceError(null);
    try {
      const options = await fetchMarketOptions();
      const allCats = flattenCategories(options.Categories);
      const findCode = (keyword: string): number => {
        const found = allCats.find((category) => category.CodeName.includes(keyword));
        return found?.Code ?? allCats[0]?.Code ?? 50000;
      };

      const results = await Promise.allSettled(
        ALL_MATERIAL_TYPES.filter((type) => !MARKET_SEARCH[type].untradeable).map(async (type) => {
          const config = MARKET_SEARCH[type];
          const categoryCode = config.categoryCode ?? findCode(MATERIAL_CATEGORY_KEYWORD[type]);
          const data = await fetchMarketItems(config.searchName, categoryCode, config.extraParams);
          const item = data.Items?.[0];
          if (!item) return { type, price: 0, icon: '' };
          const itemsPerUnit = config.itemsPerUnit ?? 1;
          return {
            type,
            price: item.CurrentMinPrice / item.BundleCount / itemsPerUnit,
            icon: item.Icon,
          };
        }),
      );

      const priceMap: PriceMap = {};
      const iconMap: IconMap = {};
      for (const result of results) {
        if (result.status === 'fulfilled') {
          priceMap[result.value.type] = result.value.price;
          if (result.value.icon) iconMap[result.value.type] = result.value.icon;
        }
      }
      setPrices(priceMap);
      setIcons(iconMap);
    } catch {
      setPriceError('가격 조회 실패');
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrices();
  }, [loadPrices]);

  return { prices, icons, priceLoading, priceError, loadPrices };
};
