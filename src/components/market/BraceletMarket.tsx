import React, { useEffect, useRef, useState } from 'react';
import {
  fetchAuctionItems,
  type AuctionItem,
  type AuctionOptionsResponse,
} from '../../utils/api';
import GlassCard from '../GlassCard';
import StateFeedback from '../StateFeedback';
import AuctionResults, { type SearchState } from './AuctionResults';
import DualRangeSlider from './DualRangeSlider';
import { getCachedAuctionOptions } from './marketOptionsCache';
import { buildBraceletRequest, type BraceletSearchFilters } from './marketSearch';

const STATS = [
  { value: '치명', label: '치명' },
  { value: '특화', label: '특화' },
  { value: '신속', label: '신속' },
  { value: '제압', label: '제압' },
  { value: '인내', label: '인내' },
  { value: '숙련', label: '숙련' },
] as const;
const BRACELET_TIER = 4;
const BRACELET_STAT_MIN = 0;
const BRACELET_STAT_MAX = 120;
const BRACELET_GRADES = ['유물', '고대'] as const;
const toOptionalNumber = (value: string): number | undefined => value === '' ? undefined : Number(value);

type StatInput = { readonly name: string; readonly minValue: string; readonly maxValue: string };

const BraceletMarket: React.FC = () => {
  const requestId = useRef(0);
  const [options, setOptions] = useState<AuctionOptionsResponse | null>(null);
  const [optionsError, setOptionsError] = useState('');
  const [grade, setGrade] = useState<string>('고대');
  const [assignedEffectCount, setAssignedEffectCount] = useState('3');
  const [sortCondition, setSortCondition] = useState<'ASC' | 'DESC'>('ASC');
  const [stats, setStats] = useState<StatInput[]>([
    { name: '치명', minValue: String(BRACELET_STAT_MIN), maxValue: String(BRACELET_STAT_MAX) },
    { name: '특화', minValue: String(BRACELET_STAT_MIN), maxValue: String(BRACELET_STAT_MAX) },
  ]);
  const [state, setState] = useState<SearchState>('idle');
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [error, setError] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [lastFilters, setLastFilters] = useState<BraceletSearchFilters | null>(null);

  useEffect(() => {
    let active = true;
    getCachedAuctionOptions()
      .then((response) => {
        if (!active) return;
        setOptions(response);
        const availableGrades = BRACELET_GRADES.filter((itemGrade) => response.ItemGrades.includes(itemGrade));
        setGrade((current) => availableGrades.includes(current as typeof BRACELET_GRADES[number]) ? current : availableGrades[0] ?? '');
      })
      .catch(() => active && setOptionsError('검색 옵션을 불러오지 못했습니다. 잠시 후 탭을 다시 열어 주세요.'));
    return () => {
      active = false;
      requestId.current += 1;
    };
  }, []);

  const updateStat = (index: number, patch: Partial<StatInput>): void => {
    setStats((current) => current.map((stat, statIndex) => statIndex === index ? { ...stat, ...patch } : stat));
  };

  const runSearch = async (filters: BraceletSearchFilters, targetPage: number): Promise<void> => {
    if (!options) return;
    const currentRequest = ++requestId.current;
    setState('loading');
    setError('');
    try {
      const response = await fetchAuctionItems(buildBraceletRequest({ ...filters, pageNo: targetPage }, options));
      if (currentRequest !== requestId.current) return;
      setItems(response.Items ?? []);
      setPageNo(response.PageNo || targetPage);
      setPageSize(response.PageSize || 10);
      setTotalCount(response.TotalCount || 0);
      setState('success');
    } catch (reason) {
      if (currentRequest !== requestId.current) return;
      setError(reason instanceof Error ? reason.message : '잠시 후 다시 시도해 주세요.');
      setState('error');
    }
  };

  const handleSearch = (): void => {
    if (stats[0].name === stats[1].name) {
      setError('서로 다른 전투 특성 두 개를 선택해 주세요.');
      setState('error');
      return;
    }
    const filters: BraceletSearchFilters = {
      tier: BRACELET_TIER,
      grade: grade || undefined,
      stats: stats.map((stat) => ({
        name: stat.name,
        minValue: toOptionalNumber(stat.minValue),
        maxValue: toOptionalNumber(stat.maxValue),
      })),
      assignedEffectCount: toOptionalNumber(assignedEffectCount),
      sortCondition,
      pageNo: 1,
    };
    setLastFilters(filters);
    void runSearch(filters, 1);
  };

  if (optionsError) return <StateFeedback tone="error" title="팔찌 검색 옵션 오류" description={optionsError} compact />;
  if (!options) return <StateFeedback tone="loading" title="팔찌 검색 옵션을 불러오는 중입니다" compact />;

  return (
    <section className="space-y-5">
      <GlassCard className="p-5">
        <h2 className="text-xl font-black text-gray-950 dark:text-white">팔찌 검색</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">치명·특화·신속 중 서로 다른 두 특성을 선택하세요.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">등급
            <select aria-label="팔찌 등급" value={grade} onChange={(event) => setGrade(event.target.value)} className="input-field mt-1 w-full" disabled={state === 'loading'}>
              {BRACELET_GRADES.filter((itemGrade) => options.ItemGrades.includes(itemGrade)).map((itemGrade) => <option key={itemGrade}>{itemGrade}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">옵션 부여 개수
            <select aria-label="팔찌 옵션 부여 개수" value={assignedEffectCount} onChange={(event) => setAssignedEffectCount(event.target.value)} className="input-field mt-1 w-full" disabled={state === 'loading'}>
              <option value="">전체</option>
              {[2, 3].map((count) => <option key={count} value={count}>{count}개</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">즉구가 정렬
            <select aria-label="팔찌 즉구가 정렬" value={sortCondition} onChange={(event) => setSortCondition(event.target.value as 'ASC' | 'DESC')} className="input-field mt-1 w-full" disabled={state === 'loading'}>
              <option value="ASC">낮은 순</option>
              <option value="DESC">높은 순</option>
            </select>
          </label>
        </div>
        <div className="mt-5 space-y-3">
          {stats.map((stat, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-gray-200 bg-white/60 p-3 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,2fr)] dark:border-white/10 dark:bg-white/[0.03]">
              <select aria-label={`전투 특성 ${index + 1}`} value={stat.name} onChange={(event) => updateStat(index, { name: event.target.value })} className="input-field w-full self-center" disabled={state === 'loading'}>
                {STATS.map((statOption) => <option key={statOption.value} value={statOption.value}>{statOption.label}</option>)}
              </select>
              <DualRangeSlider
                label={stat.name}
                min={BRACELET_STAT_MIN}
                max={BRACELET_STAT_MAX}
                minValue={Number(stat.minValue)}
                maxValue={Number(stat.maxValue)}
                disabled={state === 'loading'}
                onChange={(minValue, maxValue) => updateStat(index, { minValue: String(minValue), maxValue: String(maxValue) })}
              />
            </div>
          ))}
        </div>
        <button type="button" onClick={handleSearch} className="btn-gold mt-5 w-full sm:w-auto" disabled={state === 'loading'}>팔찌 검색</button>
      </GlassCard>

      <AuctionResults kind="팔찌" state={state} items={items} error={error} pageNo={pageNo} totalCount={totalCount} pageSize={pageSize} sortCondition={lastFilters?.sortCondition ?? sortCondition} onPageChange={(nextPage) => lastFilters && void runSearch(lastFilters, nextPage)} />
    </section>
  );
};

export default BraceletMarket;
