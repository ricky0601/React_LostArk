import React, { useEffect, useRef, useState } from 'react';
import {
  fetchMarketItems,
  type MarketItem,
  type MarketOptionsResponse,
} from '../../utils/api';
import GlassCard from '../GlassCard';
import StateFeedback from '../StateFeedback';
import type { SearchState } from './AuctionResults';
import { formatGold } from './marketFormat';
import { getCachedMarketOptions } from './marketOptionsCache';
import { resolveAvatarPartCategories } from './marketSearch';

type AvatarResult = { readonly part: string; readonly item: MarketItem | null };

const LegendAvatarMarket: React.FC = () => {
  const requestId = useRef(0);
  const [options, setOptions] = useState<MarketOptionsResponse | null>(null);
  const [optionsError, setOptionsError] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [results, setResults] = useState<AvatarResult[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getCachedMarketOptions()
      .then((response) => {
        if (!active) return;
        setOptions(response);
        setCharacterClass(response.Classes[0] ?? '');
      })
      .catch(() => active && setOptionsError('검색 옵션을 불러오지 못했습니다. 잠시 후 탭을 다시 열어 주세요.'));
    return () => {
      active = false;
      requestId.current += 1;
    };
  }, []);

  const handleSearch = async (): Promise<void> => {
    if (!options || !characterClass) return;
    const partCategories = resolveAvatarPartCategories(options);
    if (partCategories.length !== 4) {
      setError('공식 API 옵션에서 전설 아바타 4개 부위 코드를 찾을 수 없습니다.');
      setState('error');
      return;
    }

    const legendaryGrade = options.ItemGrades.find((grade) => grade.includes('전설'));
    if (!legendaryGrade) {
      setError('공식 API 옵션에서 전설 등급을 찾을 수 없습니다.');
      setState('error');
      return;
    }

    const currentRequest = ++requestId.current;
    setState('loading');
    setError('');
    try {
      const nextResults: AvatarResult[] = [];
      for (const { part, categoryCode } of partCategories) {
        const response = await fetchMarketItems('', categoryCode, {
          CharacterClass: characterClass,
          ItemGrade: legendaryGrade,
          PageNo: 1,
          Sort: 'CURRENT_MIN_PRICE',
          SortCondition: 'ASC',
        });
        if (currentRequest !== requestId.current) return;
        const sortedItems = [...(response.Items ?? [])].sort((a, b) =>
          (a.CurrentMinPrice && a.CurrentMinPrice > 0 ? a.CurrentMinPrice : Number.MAX_SAFE_INTEGER)
          - (b.CurrentMinPrice && b.CurrentMinPrice > 0 ? b.CurrentMinPrice : Number.MAX_SAFE_INTEGER),
        );
        nextResults.push({ part, item: sortedItems[0] ?? null });
      }
      setResults(nextResults);
      setState('success');
    } catch (reason) {
      if (currentRequest !== requestId.current) return;
      setError(reason instanceof Error ? reason.message : '잠시 후 다시 시도해 주세요.');
      setState('error');
    }
  };

  if (optionsError) return <StateFeedback tone="error" title="전설 아바타 검색 옵션 오류" description={optionsError} compact />;
  if (!options) return <StateFeedback tone="loading" title="전설 아바타 검색 옵션을 불러오는 중입니다" compact />;

  return (
    <section className="space-y-5">
      <GlassCard className="p-5">
        <h2 className="text-xl font-black text-gray-950 dark:text-white">전설 아바타 검색</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">선택한 직업의 최저가 아바타를 조회합니다.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-bold text-gray-700 dark:text-gray-300">직업
            <select aria-label="전설 아바타 직업" value={characterClass} onChange={(event) => setCharacterClass(event.target.value)} className="input-field mt-1 w-full" disabled={state === 'loading'}>
              {options.Classes.map((className) => <option key={className}>{className}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void handleSearch()} className="btn-gold w-full sm:w-auto" disabled={!characterClass || state === 'loading'}>아바타 검색</button>
        </div>
      </GlassCard>

      {state === 'idle' && <StateFeedback tone="empty" title="조회할 직업을 선택해 주세요" description="검색 버튼을 누르면 선택한 직업만 조회합니다." compact />}
      {state === 'loading' && <StateFeedback tone="loading" title={`${characterClass} 전설 아바타를 불러오는 중입니다`} compact />}
      {state === 'error' && <StateFeedback tone="error" title="전설 아바타 시세를 불러오지 못했습니다" description={error} compact />}
      {state === 'success' && results.every((result) => !result.item) && <StateFeedback tone="empty" title="등록된 전설 아바타가 없습니다" description="다른 직업을 선택하거나 잠시 후 다시 검색해 주세요." compact />}
      {state === 'success' && results.some((result) => result.item) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map(({ part, item }) => (
            <GlassCard key={part} className="p-4">
              <div className="flex items-center gap-3">
                {item ? <img src={item.Icon} alt="" className="h-14 w-14 rounded-xl bg-gray-100 object-cover dark:bg-white/5" /> : <div className="h-14 w-14 rounded-xl bg-gray-100 dark:bg-white/5" />}
                <div className="min-w-0">
                  <span className="text-xs font-black text-la-gold-dark dark:text-la-gold">{part}</span>
                  <h3 className="mt-0.5 truncate font-black text-gray-950 dark:text-white">{item?.Name ?? '등록 매물 없음'}</h3>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-gray-500">현재 최저가</dt><dd className="font-black text-la-gold-deep dark:text-la-gold">{formatGold(item?.CurrentMinPrice)}</dd></div>
                <div><dt className="text-xs text-gray-500">최근 거래가</dt><dd className="font-bold text-gray-800 dark:text-gray-200">{formatGold(item?.RecentPrice)}</dd></div>
              </dl>
            </GlassCard>
          ))}
        </div>
      )}
    </section>
  );
};

export default LegendAvatarMarket;
