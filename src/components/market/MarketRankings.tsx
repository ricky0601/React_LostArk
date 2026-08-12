import React from 'react';
import GlassCard from '../GlassCard';
import StateFeedback from '../StateFeedback';

export type RankStatus = 'loading' | 'success' | 'error';
export type GemKind = '겁화' | '작열';

export type EngravingRankItem = {
  readonly rank: number;
  readonly name: string;
  readonly itemName: string;
  readonly icon: string;
  readonly price: number;
  readonly yDayAvgPrice: number;
};

export type GemRankItem = {
  readonly rank: number;
  readonly level: number;
  readonly kind: GemKind;
  readonly name: string;
  readonly icon: string;
  readonly price: number;
};

export type RankState<T> = {
  readonly status: RankStatus;
  readonly items: readonly T[];
  readonly fetchedAt: Date | null;
  readonly failedCount: number;
};

type RankingProps<T> = {
  readonly state: RankState<T>;
  readonly onRetry: () => void;
};

const formatGold = (value?: number | null): string => {
  if (value == null || value <= 0) return '-';
  return `${value.toLocaleString()}G`;
};

type PriceDeltaDirection = 'up' | 'down' | 'flat';

const getPriceDelta = (current?: number | null, previous?: number | null): { readonly label: string; readonly direction: PriceDeltaDirection } => {
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

const SectionHeader: React.FC<{
  readonly title: string;
  readonly count: number;
  readonly fetchedAt: Date | null;
  readonly failedCount: number;
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

const RankBadge: React.FC<{ readonly rank: number }> = ({ rank }) => (
  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-la-gold/15 px-2 text-sm font-black text-la-gold-dark dark:text-la-gold">
    #{rank}
  </span>
);

const PriceDelta: React.FC<{ readonly current?: number | null; readonly previous?: number | null }> = ({ current, previous }) => {
  const delta = getPriceDelta(current, previous);
  const colorClass = delta.direction === 'up'
    ? 'text-red-600 dark:text-red-400'
    : delta.direction === 'down'
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-gray-500 dark:text-gray-400';

  return <span className={`tabular-nums ${colorClass}`}>{delta.label}</span>;
};

export const EngravingRanking: React.FC<RankingProps<EngravingRankItem>> = ({ state, onRetry }) => (
  <section>
    <SectionHeader title="유물 각인서" count={state.items.length} fetchedAt={state.fetchedAt} failedCount={state.failedCount} />
    {state.status === 'loading' && (
      <StateFeedback
        tone="loading"
        title="유물 각인서 시세를 불러오는 중입니다"
        description="최저가와 전일 평균을 비교하고 있습니다."
        compact
      />
    )}
    {state.status === 'error' && (
      <StateFeedback
        tone="error"
        title="유물 각인서 시세를 불러오지 못했습니다"
        description="요청이 많거나 서버 응답이 지연되었습니다. 잠시 후 다시 시도해 주세요."
        action={{ label: '다시 불러오기', onClick: onRetry }}
        compact
      />
    )}
    {state.status === 'success' && state.items.length === 0 && (
      <StateFeedback
        tone="empty"
        title="표시할 유물 각인서 시세가 없습니다"
        description="잠시 후 새로고침해 최신 시세를 다시 확인해 주세요."
        action={{ label: '다시 불러오기', onClick: onRetry }}
        compact
      />
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
            <div key={`${item.name}-mobile`} role="group" aria-label={`${item.itemName} 모바일 시세`} className="p-3">
              <div className="flex items-start gap-2.5">
                <RankBadge rank={item.rank} />
                <img src={item.icon} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg bg-gray-100 object-cover dark:bg-white/5" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 dark:text-white">{item.itemName}</p>
                  <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="text-gray-400 dark:text-gray-500">최저가</p>
                      <p className="mt-0.5 whitespace-nowrap font-black tabular-nums text-la-gold-dark dark:text-la-gold">{formatGold(item.price)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-400 dark:text-gray-500">전일 평균</p>
                      <p className="mt-0.5 whitespace-nowrap tabular-nums text-gray-600 dark:text-gray-300">{formatGold(item.yDayAvgPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 dark:text-gray-500">변동</p>
                      <p className="mt-0.5 whitespace-nowrap font-bold"><PriceDelta current={item.price} previous={item.yDayAvgPrice} /></p>
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

export const GemRanking: React.FC<RankingProps<GemRankItem>> = ({ state, onRetry }) => (
  <section>
    <SectionHeader title="보석" count={state.items.length} fetchedAt={state.fetchedAt} failedCount={state.failedCount} />
    {state.status === 'loading' && (
      <StateFeedback tone="loading" title="보석 시세를 불러오는 중입니다" description="레벨과 종류별 최저가를 비교하고 있습니다." compact />
    )}
    {state.status === 'error' && (
      <StateFeedback
        tone="error"
        title="보석 시세를 불러오지 못했습니다"
        description="요청이 많거나 서버 응답이 지연되었습니다. 잠시 후 다시 시도해 주세요."
        action={{ label: '다시 불러오기', onClick: onRetry }}
        compact
      />
    )}
    {state.status === 'success' && state.items.length === 0 && (
      <StateFeedback
        tone="empty"
        title="표시할 보석 시세가 없습니다"
        description="잠시 후 새로고침해 최신 시세를 다시 확인해 주세요."
        action={{ label: '다시 불러오기', onClick: onRetry }}
        compact
      />
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
            <div key={`${item.level}-${item.kind}-mobile`} className="p-3">
              <div className="flex items-start gap-2.5">
                <RankBadge rank={item.rank} />
                <img src={item.icon} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg bg-gray-100 object-cover dark:bg-white/5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Lv.{item.level} {item.kind}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{item.name}</p>
                  <div className="mt-2 text-xs">
                    <p className="text-gray-400 dark:text-gray-500">최저가</p>
                    <p className="mt-0.5 font-black tabular-nums text-la-gold-dark dark:text-la-gold">{formatGold(item.price)}</p>
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
