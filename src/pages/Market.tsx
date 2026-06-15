import React, { useCallback, useEffect, useRef, useState } from 'react';
import NavBar from '../components/NavBar';
import GlassCard from '../components/GlassCard';
import { SkeletonBlock } from '../components/Loading';
import {
  fetchAuctionItems,
  fetchMarketItems,
  type AuctionItem,
} from '../utils/api';

type RankStatus = 'loading' | 'success' | 'error';
type ActiveTab = 'engraving' | 'gem';
type GemKind = '겁화' | '작열';

interface EngravingRankItem {
  rank: number;
  name: string;
  itemName: string;
  icon: string;
  price: number;
  yDayAvgPrice: number;
}

interface GemRankItem {
  rank: number;
  level: number;
  kind: GemKind;
  name: string;
  icon: string;
  price: number;
}

interface RankState<T> {
  status: RankStatus;
  items: T[];
  fetchedAt: Date | null;
  failedCount: number;
}

const GEM_KINDS: GemKind[] = ['겁화', '작열'];
const GEM_TARGETS = Array.from({ length: 10 }, (_, index) => 10 - index).flatMap((level) =>
  GEM_KINDS.map((kind) => ({ level, kind })),
);

const TABS: Array<{ key: ActiveTab; label: string }> = [
  { key: 'engraving', label: '유물 각인서' },
  { key: 'gem', label: '보석' },
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
let pendingRankings: Promise<[RankState<EngravingRankItem>, RankState<GemRankItem>]> | null = null;

const initialRankState = <T,>(): RankState<T> => ({
  status: 'loading',
  items: [],
  fetchedAt: null,
  failedCount: 0,
});

const formatGold = (value?: number | null): string => {
  if (value == null || value <= 0) return '-';
  return `${value.toLocaleString()}G`;
};

type PriceDeltaDirection = 'up' | 'down' | 'flat';

const getPriceDelta = (current?: number | null, previous?: number | null): { label: string; direction: PriceDeltaDirection } => {
  if (current == null || previous == null || current <= 0 || previous <= 0 || current === previous) {
    return { label: '-', direction: 'flat' };
  }

  const difference = Math.abs(current - previous);
  return current > previous
    ? { label: `▲ ${formatGold(difference)}`, direction: 'up' }
    : { label: `▼ ${formatGold(difference)}`, direction: 'down' };
};

const formatTime = (date: Date | null): string =>
  date ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-';

const getLowestAuctionItem = (items: AuctionItem[] | undefined): AuctionItem | null => {
  if (!items) return null;
  return items
    .filter((item) => item.AuctionInfo.BuyPrice > 0)
    .sort((a, b) => a.AuctionInfo.BuyPrice - b.AuctionInfo.BuyPrice)[0] ?? null;
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

const fetchRankingStates = async (): Promise<[RankState<EngravingRankItem>, RankState<GemRankItem>]> => {
  const engravingPromise = fetchRelicEngravingItems();

  const gemPromise = runSettledWithConcurrency(GEM_TARGETS, MARKET_REQUEST_CONCURRENCY, async ({ level, kind }) => {
    const response = await fetchAuctionItems({
      CategoryCode: 210000,
      ItemName: `${level}레벨 ${kind}의 보석`,
      ItemTier: 4,
      PageSize: 1,
    });
    const item = getLowestAuctionItem(response.Items);
    if (!item) return null;
    return {
      level,
      kind,
      name: item.Name,
      icon: item.Icon,
      price: item.AuctionInfo.BuyPrice,
    };
  });

  const [engravingSettled, gemSettled] = await Promise.allSettled([engravingPromise, gemPromise]);
  const fetchedAt = new Date();

  const engravingItems = engravingSettled.status === 'fulfilled'
    ? engravingSettled.value
        .filter((item) => item.CurrentMinPrice > 0 && item.Name.includes('각인서'))
        .map((item) => ({
          name: item.Name.replace(/^유물\s*/, '').replace(/\s*각인서$/, ''),
          itemName: item.Name,
          icon: item.Icon,
          price: item.CurrentMinPrice,
          yDayAvgPrice: item.YDayAvgPrice,
        }))
    : [];

  const gemItems = gemSettled.status === 'fulfilled'
    ? gemSettled.value.flatMap((result) =>
        result.status === 'fulfilled' && result.value ? [result.value] : [],
      )
    : [];
  const gemFailedCount = gemSettled.status === 'fulfilled'
    ? gemSettled.value.filter((result) => result.status === 'rejected').length
    : GEM_TARGETS.length;

  return [
    {
      status: engravingItems.length > 0 ? 'success' : 'error',
      items: rankEngravingsByPrice(engravingItems),
      fetchedAt,
      failedCount: engravingSettled.status === 'rejected' ? 1 : 0,
    },
    {
      status: gemItems.length > 0 || gemFailedCount < GEM_TARGETS.length ? 'success' : 'error',
      items: rankGemsByPrice(gemItems),
      fetchedAt,
      failedCount: gemFailedCount,
    },
  ];
};

const RankingSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <GlassCard className="overflow-hidden">
    <div className="space-y-0 divide-y divide-gray-200/50 dark:divide-white/10">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-4">
          <SkeletonBlock className="h-7 w-8 rounded-lg" />
          <SkeletonBlock className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-3 w-28" />
          </div>
          <SkeletonBlock className="h-5 w-24" />
        </div>
      ))}
    </div>
  </GlassCard>
);

const SectionHeader: React.FC<{
  title: string;
  count: number;
  fetchedAt: Date | null;
  failedCount: number;
}> = ({ title, count, fetchedAt, failedCount }) => (
  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h2 className="text-xl font-black text-gray-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {count}개 · 최저가 기준 · {formatTime(fetchedAt)}
      </p>
    </div>
    {failedCount > 0 && (
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
        {failedCount}개 실패
      </span>
    )}
  </div>
);

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => (
  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-la-gold/15 px-2 text-sm font-black text-la-gold-dark dark:text-la-gold">
    #{rank}
  </span>
);

const PriceDelta: React.FC<{ current?: number | null; previous?: number | null }> = ({ current, previous }) => {
  const delta = getPriceDelta(current, previous);
  const colorClass = delta.direction === 'up'
    ? 'text-red-600 dark:text-red-400'
    : delta.direction === 'down'
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-gray-500 dark:text-gray-400';

  return <span className={`tabular-nums ${colorClass}`}>{delta.label}</span>;
};

const EngravingRanking: React.FC<{ state: RankState<EngravingRankItem> }> = ({ state }) => (
  <section>
    <SectionHeader title="유물 각인서" count={state.items.length} fetchedAt={state.fetchedAt} failedCount={state.failedCount} />
    {state.status === 'loading' && <RankingSkeleton />}
    {state.status === 'error' && (
      <GlassCard className="border-red-500/20 bg-red-500/5 p-6 text-center text-sm font-bold text-red-600 dark:text-red-400">
        시세를 불러오지 못했습니다.
      </GlassCard>
    )}
    {state.status === 'success' && state.items.length === 0 && (
      <GlassCard className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">표시할 시세가 없습니다.</GlassCard>
    )}
    {state.status === 'success' && state.items.length > 0 && (
      <GlassCard className="overflow-hidden">
        <div className="hidden md:block">
          <div className="grid grid-cols-[72px_minmax(0,1fr)_150px_150px_150px] gap-4 border-b border-gray-200/50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:border-white/10">
            <span>순위</span>
            <span>아이템</span>
            <span>최저가</span>
            <span>전일 평균</span>
            <span>변동</span>
          </div>
          {state.items.map((item) => (
            <div key={item.name} className="grid grid-cols-[72px_minmax(0,1fr)_150px_150px_150px] gap-4 border-b border-gray-200/40 px-5 py-4 last:border-b-0 dark:border-white/5">
              <div className="flex items-center"><RankBadge rank={item.rank} /></div>
              <div className="flex min-w-0 items-center gap-3">
                <img src={item.icon} alt="" className="h-11 w-11 flex-shrink-0 rounded-xl bg-gray-100 object-cover dark:bg-white/5" />
                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{item.itemName}</p>
              </div>
              <div className="flex items-center text-sm font-black tabular-nums text-la-gold-dark dark:text-la-gold">{formatGold(item.price)}</div>
              <div className="flex items-center text-sm tabular-nums text-gray-600 dark:text-gray-300">{formatGold(item.yDayAvgPrice)}</div>
              <div className="flex items-center text-sm font-bold"><PriceDelta current={item.price} previous={item.yDayAvgPrice} /></div>
            </div>
          ))}
        </div>

        <div className="divide-y divide-gray-200/50 md:hidden dark:divide-white/10">
          {state.items.map((item) => (
            <div key={`${item.name}-mobile`} className="p-4">
              <div className="flex items-start gap-3">
                <RankBadge rank={item.rank} />
                <img src={item.icon} alt="" className="h-11 w-11 flex-shrink-0 rounded-xl bg-gray-100 object-cover dark:bg-white/5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-bold text-gray-900 dark:text-white">{item.itemName}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">최저가</p>
                      <p className="mt-1 font-black tabular-nums text-la-gold-dark dark:text-la-gold">{formatGold(item.price)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">전일 평균</p>
                      <p className="mt-1 tabular-nums text-gray-600 dark:text-gray-300">{formatGold(item.yDayAvgPrice)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">변동</p>
                      <p className="mt-1 font-bold"><PriceDelta current={item.price} previous={item.yDayAvgPrice} /></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    )}
  </section>
);

const GemRanking: React.FC<{ state: RankState<GemRankItem> }> = ({ state }) => (
  <section>
    <SectionHeader title="보석" count={state.items.length} fetchedAt={state.fetchedAt} failedCount={state.failedCount} />
    {state.status === 'loading' && <RankingSkeleton rows={10} />}
    {state.status === 'error' && (
      <GlassCard className="border-red-500/20 bg-red-500/5 p-6 text-center text-sm font-bold text-red-600 dark:text-red-400">
        시세를 불러오지 못했습니다.
      </GlassCard>
    )}
    {state.status === 'success' && state.items.length === 0 && (
      <GlassCard className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">표시할 시세가 없습니다.</GlassCard>
    )}
    {state.status === 'success' && state.items.length > 0 && (
      <GlassCard className="overflow-hidden">
        <div className="hidden md:block">
          <div className="grid grid-cols-[72px_minmax(0,1fr)_150px] gap-4 border-b border-gray-200/50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:border-white/10">
            <span>순위</span>
            <span>아이템</span>
            <span>최저가</span>
          </div>
          {state.items.map((item) => (
            <div key={`${item.level}-${item.kind}`} className="grid grid-cols-[72px_minmax(0,1fr)_150px] gap-4 border-b border-gray-200/40 px-5 py-4 last:border-b-0 dark:border-white/5">
              <div className="flex items-center"><RankBadge rank={item.rank} /></div>
              <div className="flex min-w-0 items-center gap-3">
                <img src={item.icon} alt="" className="h-11 w-11 flex-shrink-0 rounded-xl bg-gray-100 object-cover dark:bg-white/5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Lv.{item.level}</p>
                    <span className="rounded-full border border-la-gold/20 bg-la-gold/10 px-2.5 py-1 text-xs font-bold text-la-gold-dark dark:text-la-gold">{item.kind}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{item.name}</p>
                </div>
              </div>
              <div className="flex items-center text-sm font-black tabular-nums text-la-gold-dark dark:text-la-gold">{formatGold(item.price)}</div>
            </div>
          ))}
        </div>

        <div className="divide-y divide-gray-200/50 md:hidden dark:divide-white/10">
          {state.items.map((item) => (
            <div key={`${item.level}-${item.kind}-mobile`} className="p-4">
              <div className="flex items-start gap-3">
                <RankBadge rank={item.rank} />
                <img src={item.icon} alt="" className="h-11 w-11 flex-shrink-0 rounded-xl bg-gray-100 object-cover dark:bg-white/5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Lv.{item.level} {item.kind}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{item.name}</p>
                  <div className="mt-3 text-xs">
                    <p className="text-gray-400 dark:text-gray-500">최저가</p>
                    <p className="mt-1 font-black tabular-nums text-la-gold-dark dark:text-la-gold">{formatGold(item.price)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    )}
  </section>
);

const Market: React.FC = () => {
  const requestIdRef = useRef(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('engraving');
  const [engravingState, setEngravingState] = useState<RankState<EngravingRankItem>>(initialRankState);
  const [gemState, setGemState] = useState<RankState<GemRankItem>>(initialRankState);

  const loadRankings = useCallback(async (force = false): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (force) {
      cachedEngravingState = null;
      cachedGemState = null;
      pendingRankings = null;
    }

    if (cachedEngravingState && cachedGemState) {
      setEngravingState(cachedEngravingState);
      setGemState(cachedGemState);
      return;
    }

    setEngravingState((current) => ({ ...current, status: 'loading', failedCount: 0 }));
    setGemState((current) => ({ ...current, status: 'loading', failedCount: 0 }));

    if (!pendingRankings) {
      pendingRankings = fetchRankingStates().finally(() => {
        pendingRankings = null;
      });
    }

    const [nextEngravingState, nextGemState] = await pendingRankings;
    if (requestIdRef.current !== requestId) return;

    cachedEngravingState = nextEngravingState;
    cachedGemState = nextGemState;
    setEngravingState(nextEngravingState);
    setGemState(nextGemState);
  }, []);

  useEffect(() => {
    void loadRankings();
  }, [loadRankings]);

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
              <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-950 dark:text-white sm:text-4xl">시세 랭킹</h1>
            </div>
            <button
              type="button"
              onClick={() => void loadRankings(true)}
              className="btn-gold w-full sm:w-auto"
              disabled={engravingState.status === 'loading' || gemState.status === 'loading'}
            >
              새로고침
            </button>
          </div>
        </GlassCard>

        <GlassCard className="p-2">
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="시세 랭킹 종류">
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

        {activeTab === 'engraving' ? (
          <EngravingRanking state={engravingState} />
        ) : (
          <GemRanking state={gemState} />
        )}
      </main>
    </div>
  );
};

export default Market;
