import React, { useCallback, useEffect, useRef, useState } from 'react';
import NavBar from '../components/NavBar';
import GlassCard from '../components/GlassCard';
import { EngravingRanking, GemRanking } from '../components/market/MarketRankings';
import type {
  EngravingRankItem,
  GemKind,
  GemRankItem,
  RankState,
} from '../components/market/MarketRankings';
import {
  fetchAuctionItems,
  fetchMarketItems,
  type AuctionItem,
} from '../utils/api';

const AccessoryMarket = React.lazy(() => import('../components/market/AccessoryMarket'));
const LegendAvatarMarket = React.lazy(() => import('../components/market/LegendAvatarMarket'));
const BraceletMarket = React.lazy(() => import('../components/market/BraceletMarket'));

type ActiveTab = 'engraving' | 'gem' | 'accessory' | 'avatar' | 'bracelet';

const GEM_KINDS: GemKind[] = ['겁화', '작열'];
const GEM_TARGETS = Array.from({ length: 10 }, (_, index) => 10 - index).flatMap((level) =>
  GEM_KINDS.map((kind) => ({ level, kind })),
);

const TABS: Array<{ key: ActiveTab; label: string }> = [
  { key: 'engraving', label: '유물 각인서' },
  { key: 'gem', label: '보석' },
  { key: 'accessory', label: '장신구' },
  { key: 'avatar', label: '전설 아바타' },
  { key: 'bracelet', label: '팔찌' },
];

const MARKET_REQUEST_CONCURRENCY = 3;

const runSettledWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> => {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      try {
        results[currentIndex] = {
          status: 'fulfilled',
          value: await task(items[currentIndex], currentIndex),
        };
      } catch (reason) {
        results[currentIndex] = {
          status: 'rejected',
          reason,
        };
      }
    }
  });

  await Promise.all(workers);
  return results;
};

let cachedEngravingState: RankState<EngravingRankItem> | null = null;
let cachedGemState: RankState<GemRankItem> | null = null;
let pendingEngraving: Promise<RankState<EngravingRankItem>> | null = null;
let pendingGem: Promise<RankState<GemRankItem>> | null = null;

const initialRankState = <T,>(): RankState<T> => ({
  status: 'loading',
  items: [],
  fetchedAt: null,
  failedCount: 0,
});

const getLowestAuctionItem = (items: AuctionItem[] | undefined): AuctionItem | null => {
  if (!items) return null;
  return items
    .filter((item) => item.AuctionInfo.BuyPrice != null && item.AuctionInfo.BuyPrice > 0)
    .sort((a, b) => (a.AuctionInfo.BuyPrice ?? Number.MAX_SAFE_INTEGER) - (b.AuctionInfo.BuyPrice ?? Number.MAX_SAFE_INTEGER))[0] ?? null;
};

const rankEngravingsByPrice = (items: Omit<EngravingRankItem, 'rank'>[]): EngravingRankItem[] =>
  [...items]
    .sort((a, b) => b.price - a.price)
    .map((item, index) => ({ ...item, rank: index + 1 }));

const rankGemsByPrice = (items: Omit<GemRankItem, 'rank'>[]): GemRankItem[] =>
  [...items]
    .sort((a, b) => b.price - a.price)
    .map((item, index) => ({ ...item, rank: index + 1 }));

const fetchRelicEngravingItems = async () => {
  const baseParams = {
    ItemGrade: '유물',
    PageSize: 50,
    PageNo: 1,
    Sort: 'CURRENT_MIN_PRICE',
    SortCondition: 'DESC',
  };
  const firstPage = await fetchMarketItems('', 40000, baseParams);
  const pageSize = firstPage.PageSize || firstPage.Items?.length || baseParams.PageSize;
  const totalPages = Math.max(1, Math.ceil((firstPage.TotalCount || firstPage.Items?.length || 0) / pageSize));
  const restPageNumbers = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
  const restPageResults = await runSettledWithConcurrency(restPageNumbers, MARKET_REQUEST_CONCURRENCY, (pageNo) =>
    fetchMarketItems('', 40000, { ...baseParams, PageNo: pageNo }),
  );
  const failedRestPage = restPageResults.find((result) => result.status === 'rejected');
  if (failedRestPage) {
    throw new Error('Failed to load relic engraving market pages');
  }
  const restPages = restPageResults.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  const uniqueItems = new Map<string, typeof firstPage.Items[number]>();
  [firstPage, ...restPages].forEach((page) => {
    (page.Items ?? []).forEach((item) => {
      uniqueItems.set(item.Name, item);
    });
  });
  return Array.from(uniqueItems.values());
};

const fetchEngravingState = async (): Promise<RankState<EngravingRankItem>> => {
  try {
    const items = await fetchRelicEngravingItems();
    const engravingItems = items
      .filter((item) => item.CurrentMinPrice != null && item.CurrentMinPrice > 0 && item.Name.includes('각인서'))
      .map((item) => ({
        name: item.Name.replace(/^유물\s*/, '').replace(/\s*각인서$/, ''),
        itemName: item.Name,
        icon: item.Icon,
        price: item.CurrentMinPrice!,
        yDayAvgPrice: item.YDayAvgPrice ?? 0,
      }));
    return { status: engravingItems.length > 0 ? 'success' : 'error', items: rankEngravingsByPrice(engravingItems), fetchedAt: new Date(), failedCount: 0 };
  } catch {
    return { status: 'error', items: [], fetchedAt: new Date(), failedCount: 1 };
  }
};

const fetchGemState = async (): Promise<RankState<GemRankItem>> => {
  const settled = await runSettledWithConcurrency(GEM_TARGETS, MARKET_REQUEST_CONCURRENCY, async ({ level, kind }) => {
    const response = await fetchAuctionItems({ CategoryCode: 210000, ItemName: `${level}레벨 ${kind}의 보석`, ItemTier: 4, PageSize: 1 });
    const item = getLowestAuctionItem(response.Items);
    if (!item?.AuctionInfo.BuyPrice) return null;
    return { level, kind, name: item.Name, icon: item.Icon, price: item.AuctionInfo.BuyPrice };
  });
  const items = settled.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []);
  const failedCount = settled.filter((result) => result.status === 'rejected').length;
  return {
    status: items.length > 0 || failedCount < GEM_TARGETS.length ? 'success' : 'error',
    items: rankGemsByPrice(items),
    fetchedAt: new Date(),
    failedCount,
  };
};

const Market: React.FC = () => {
  const requestIdRef = useRef(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('engraving');
  const [engravingState, setEngravingState] = useState<RankState<EngravingRankItem>>(initialRankState);
  const [gemState, setGemState] = useState<RankState<GemRankItem>>(initialRankState);

  const loadRanking = useCallback(async (tab: 'engraving' | 'gem', force = false): Promise<void> => {
    const requestId = ++requestIdRef.current;
    if (tab === 'engraving') {
      if (force) cachedEngravingState = null;
      if (cachedEngravingState) {
        setEngravingState(cachedEngravingState);
        return;
      }
      setEngravingState((current) => ({ ...current, status: 'loading', failedCount: 0 }));
      if (!pendingEngraving) pendingEngraving = fetchEngravingState().finally(() => { pendingEngraving = null; });
      const nextState = await pendingEngraving;
      cachedEngravingState = nextState;
      if (requestIdRef.current !== requestId) return;
      setEngravingState(nextState);
      return;
    }

    if (force) cachedGemState = null;
    if (cachedGemState) {
      setGemState(cachedGemState);
      return;
    }
    setGemState((current) => ({ ...current, status: 'loading', failedCount: 0 }));
    if (!pendingGem) pendingGem = fetchGemState().finally(() => { pendingGem = null; });
    const nextState = await pendingGem;
    cachedGemState = nextState;
    if (requestIdRef.current !== requestId) return;
    setGemState(nextState);
  }, []);

  useEffect(() => {
    if (activeTab === 'engraving' || activeTab === 'gem') void loadRanking(activeTab);
  }, [activeTab, loadRanking]);

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-la-dark">
      <NavBar />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <GlassCard className="relative overflow-hidden p-6 sm:p-8">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-la-gold/20 bg-la-gold/10 px-3 py-1 text-xs font-bold text-la-gold-dark dark:text-la-gold">
                Market Rank
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-950 dark:text-white sm:text-4xl">시세</h1>
            </div>
            {(activeTab === 'engraving' || activeTab === 'gem') && (
              <button
                type="button"
                onClick={() => void loadRanking(activeTab, true)}
                className="btn-gold w-full sm:w-auto"
                disabled={activeTab === 'engraving' ? engravingState.status === 'loading' : gemState.status === 'loading'}
              >
                새로고침
              </button>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label="시세 종류">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-4 py-3 text-sm font-black transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-la-gold/15 text-la-gold-dark shadow-sm dark:text-la-gold'
                    : 'text-gray-500 hover:bg-gray-100/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </GlassCard>

        {activeTab === 'engraving' && <EngravingRanking state={engravingState} onRetry={() => void loadRanking('engraving', true)} />}
        {activeTab === 'gem' && <GemRanking state={gemState} onRetry={() => void loadRanking('gem', true)} />}
        <React.Suspense fallback={<GlassCard className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">탭을 불러오는 중입니다.</GlassCard>}>
          {activeTab === 'accessory' && <AccessoryMarket />}
          {activeTab === 'avatar' && <LegendAvatarMarket />}
          {activeTab === 'bracelet' && <BraceletMarket />}
        </React.Suspense>
      </main>
    </div>
  );
};

export default Market;
export { EngravingRanking, GemRanking } from '../components/market/MarketRankings';
