import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAuctionItems,
  type AuctionItem,
  type AuctionOptionsResponse,
} from '../../utils/api';
import GlassCard from '../GlassCard';
import StateFeedback from '../StateFeedback';
import AuctionResults, { type SearchState } from './AuctionResults';
import { getHoningEffectRoleColor, HONING_EFFECT_VALUES, HONING_TIER_COLORS } from './accessoryHoning';
import { getCachedAuctionOptions } from './marketOptionsCache';
import {
  buildAccessoryRequest,
  findCategoryCode,
  getAuctionOptionsForCategory,
  type AccessorySearchFilters,
  type AuctionDetailFilter,
  type ResolvedAuctionOption,
} from './marketSearch';

const PARTS = ['목걸이', '반지', '귀걸이'] as const;
const ACCESSORY_GRADES = ['유물', '고대'] as const;
const ACCESSORY_TIER = 4;
type AccessoryPart = typeof PARTS[number];
const ACCESSORY_OPTION_NAMES: Record<AccessoryPart, readonly string[]> = {
  목걸이: ['추가 피해', '적에게 주는 피해 증가', '공격력 +', '무기 공격력 +', '세레나데, 신앙, 조화 게이지 획득량 증가', '낙인력', '최대 생명력', '최대 마나', '상태이상 공격 지속시간', '전투 중 생명력 회복량'],
  귀걸이: ['공격력 %', '무기 공격력 %', '공격력 +', '무기 공격력 +', '파티원 회복 효과', '파티원 보호막 효과', '최대 생명력', '최대 마나', '상태이상 공격 지속시간', '전투 중 생명력 회복량'],
  반지: ['치명타 적중률', '치명타 피해', '공격력 +', '무기 공격력 +', '아군 공격력 강화 효과', '아군 피해량 강화 효과', '최대 생명력', '최대 마나', '상태이상 공격 지속시간', '전투 중 생명력 회복량'],
};
const DEFAULT_OPTION_NAMES: Record<AccessoryPart, readonly [string, string]> = {
  목걸이: ['적에게 주는 피해 증가', '추가 피해'],
  반지: ['치명타 적중률', '치명타 피해'],
  귀걸이: ['공격력 %', '무기 공격력 %'],
};
const toOptionalNumber = (value: string): number | undefined => value === '' ? undefined : Number(value);

type OptionInput = { readonly firstOption?: number; readonly secondOption?: number; readonly minValue: string; readonly maxValue: string };
const EMPTY_OPTION: OptionInput = { minValue: '', maxValue: '' };
const getPartHoningEffects = (options: readonly ResolvedAuctionOption[], part: AccessoryPart): ResolvedAuctionOption[] => {
  const optionNames = ACCESSORY_OPTION_NAMES[part];
  return options
    .filter((option) => option.groupName === '연마 효과' && optionNames.includes(option.Text))
    .map((option) => {
      const allowedValues = HONING_EFFECT_VALUES[option.Text];
      return {
        ...option,
        EtcValues: allowedValues
          ? allowedValues.flatMap((value) => (option.EtcValues ?? []).filter((candidate) => candidate.Value === value))
          : [],
      };
    })
    .sort((a, b) => optionNames.indexOf(a.Text) - optionNames.indexOf(b.Text));
};

const createDefaultOptionInputs = (
  options: AuctionOptionsResponse,
  part: AccessoryPart,
  tier?: number,
): OptionInput[] => {
  const categoryCode = findCategoryCode(options.Categories, part, '장신구');
  if (categoryCode == null) return [EMPTY_OPTION, EMPTY_OPTION, EMPTY_OPTION];
  const availableOptions = getPartHoningEffects(getAuctionOptionsForCategory(options, categoryCode, tier), part);
  return [
    ...DEFAULT_OPTION_NAMES[part].map((optionName) => {
      const option = availableOptions.find((candidate) => candidate.Text === optionName);
      return option
        ? { firstOption: option.firstOption, secondOption: option.Value, minValue: '', maxValue: '' }
        : EMPTY_OPTION;
    }),
    EMPTY_OPTION,
  ];
};

const AccessoryMarket: React.FC = () => {
  const requestId = useRef(0);
  const [options, setOptions] = useState<AuctionOptionsResponse | null>(null);
  const [optionsError, setOptionsError] = useState('');
  const [part, setPart] = useState<AccessoryPart>('목걸이');
  const [grade, setGrade] = useState('');
  const [quality, setQuality] = useState('');
  const [tradeCount, setTradeCount] = useState('');
  const [sortCondition, setSortCondition] = useState<'ASC' | 'DESC'>('ASC');
  const [optionInputs, setOptionInputs] = useState<OptionInput[]>([EMPTY_OPTION, EMPTY_OPTION, EMPTY_OPTION]);
  const [state, setState] = useState<SearchState>('idle');
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [error, setError] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [lastFilters, setLastFilters] = useState<AccessorySearchFilters | null>(null);

  useEffect(() => {
    let active = true;
    getCachedAuctionOptions()
      .then((response) => {
        if (!active) return;
        setOptions(response);
        const availableGrades = ACCESSORY_GRADES.filter((itemGrade) => response.ItemGrades.includes(itemGrade));
        setGrade(availableGrades.includes('고대') ? '고대' : availableGrades[0] ?? '');
        setOptionInputs(createDefaultOptionInputs(response, '목걸이', ACCESSORY_TIER));
      })
      .catch(() => active && setOptionsError('검색 옵션을 불러오지 못했습니다. 잠시 후 탭을 다시 열어 주세요.'));
    return () => {
      active = false;
      requestId.current += 1;
    };
  }, []);

  const availableOptions = useMemo(() => {
    if (!options) return [];
    const categoryCode = findCategoryCode(options.Categories, part, '장신구');
    return categoryCode == null ? [] : getPartHoningEffects(getAuctionOptionsForCategory(options, categoryCode, ACCESSORY_TIER), part);
  }, [options, part]);

  const updateOption = (index: number, patch: Partial<OptionInput>): void => {
    setOptionInputs((current) => current.map((input, inputIndex) => inputIndex === index ? { ...input, ...patch } : input));
  };

  const handlePartChange = (nextPart: AccessoryPart): void => {
    if (nextPart === part) return;
    setPart(nextPart);
    setOptionInputs(options ? createDefaultOptionInputs(options, nextPart, ACCESSORY_TIER) : [EMPTY_OPTION, EMPTY_OPTION, EMPTY_OPTION]);
    setState('idle');
    setItems([]);
    setLastFilters(null);
    setPageNo(1);
    setTotalCount(0);
  };

  const runSearch = async (filters: AccessorySearchFilters, targetPage: number): Promise<void> => {
    if (!options) return;
    const currentRequest = ++requestId.current;
    setState('loading');
    setError('');
    try {
      const response = await fetchAuctionItems(buildAccessoryRequest({ ...filters, pageNo: targetPage }, options));
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
    const selectedResolvedOptions = optionInputs.flatMap((input) => {
      if (input.secondOption == null) return [];
      const resolved = availableOptions.find((option) => option.firstOption === input.firstOption && option.Value === input.secondOption);
      return resolved ? [{ input, resolved }] : [];
    });
    const selectedOptions: AuctionDetailFilter[] = selectedResolvedOptions.map(({ input, resolved }) => ({
      firstOption: resolved.firstOption,
      secondOption: resolved.Value,
      minValue: toOptionalNumber(input.minValue),
      maxValue: toOptionalNumber(input.maxValue),
    }));
    const filters: AccessorySearchFilters = {
      part,
      tier: ACCESSORY_TIER,
      grade: grade || undefined,
      quality: toOptionalNumber(quality),
      tradeAllowCount: toOptionalNumber(tradeCount),
      options: selectedOptions,
      sortCondition,
      pageNo: 1,
    };
    setLastFilters(filters);
    void runSearch(filters, 1);
  };

  if (optionsError) return <StateFeedback tone="error" title="장신구 검색 옵션 오류" description={optionsError} compact />;
  if (!options) return <StateFeedback tone="loading" title="장신구 검색 옵션을 불러오는 중입니다" compact />;

  return (
    <section className="space-y-5">
      <GlassCard className="p-5">
        <h2 className="text-xl font-black text-gray-950 dark:text-white">장신구 검색</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">필터 변경 후 검색 버튼을 눌러야 매물을 조회합니다.</p>
        <div className="mt-4 grid grid-cols-3 gap-2" role="tablist" aria-label="장신구 부위">
          {PARTS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={part === item}
              disabled={state === 'loading'}
              onClick={() => handlePartChange(item)}
              className={`rounded-xl px-3 py-2.5 text-sm font-black transition-colors ${
                part === item
                  ? 'bg-la-gold/15 text-la-gold-dark dark:text-la-gold'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-900 dark:bg-white/5 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">등급
            <select aria-label="장신구 등급" value={grade} onChange={(event) => setGrade(event.target.value)} className="input-field mt-1 w-full" disabled={state === 'loading'}>
              {ACCESSORY_GRADES.filter((itemGrade) => options.ItemGrades.includes(itemGrade)).map((itemGrade) => <option key={itemGrade}>{itemGrade}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">최소 품질
            <input aria-label="최소 품질" type="number" min="0" max="100" value={quality} onChange={(event) => setQuality(event.target.value)} className="input-field mt-1 w-full" placeholder="0~100" disabled={state === 'loading'} />
          </label>
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">거래 가능 횟수
            <select aria-label="거래 가능 횟수" value={tradeCount} onChange={(event) => setTradeCount(event.target.value)} className="input-field mt-1 w-full" disabled={state === 'loading'}>
              <option value="">전체</option>
              {[0, 1, 2].map((count) => <option key={count} value={count}>{count}회</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">즉구가 정렬
            <select aria-label="장신구 즉구가 정렬" value={sortCondition} onChange={(event) => setSortCondition(event.target.value as 'ASC' | 'DESC')} className="input-field mt-1 w-full" disabled={state === 'loading'}>
              <option value="ASC">낮은 순</option>
              <option value="DESC">높은 순</option>
            </select>
          </label>
        </div>

        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-black text-gray-900 dark:text-white">연마 효과</h3>
          {optionInputs.map((input, index) => {
            const selected = availableOptions.find((option) => option.firstOption === input.firstOption && option.Value === input.secondOption);
            return (
              <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_1fr]">
                <select
                  aria-label={`장신구 옵션 ${index + 1}`}
                  value={input.firstOption != null && input.secondOption != null ? `${input.firstOption}:${input.secondOption}` : ''}
                  onChange={(event) => {
                    const [firstOption, secondOption] = event.target.value.split(':').map(Number);
                    updateOption(index, {
                      firstOption: event.target.value ? firstOption : undefined,
                      secondOption: event.target.value ? secondOption : undefined,
                      minValue: '',
                      maxValue: '',
                    });
                  }}
                  className="input-field w-full"
                  disabled={state === 'loading'}
                  style={selected ? { color: getHoningEffectRoleColor(selected.Text) } : undefined}
                >
                  <option value="">옵션 선택 안 함</option>
                  {availableOptions.map((option) => {
                    const selectedByOtherInput = optionInputs.some((otherInput, otherIndex) =>
                      otherIndex !== index
                      && otherInput.firstOption === option.firstOption
                      && otherInput.secondOption === option.Value,
                    );
                    return (
                      <option
                        key={`${option.firstOption}-${option.Value}`}
                        value={`${option.firstOption}:${option.Value}`}
                        disabled={selectedByOtherInput}
                        style={{ color: selectedByOtherInput ? 'rgb(156, 163, 175)' : getHoningEffectRoleColor(option.Text) }}
                      >
                        {option.Text}
                      </option>
                    );
                  })}
                </select>
                <select
                  aria-label={`장신구 옵션 ${index + 1} 등급`}
                  value={input.minValue}
                  onChange={(event) => updateOption(index, { minValue: event.target.value, maxValue: event.target.value })}
                  className="input-field w-full"
                  disabled={state === 'loading' || !selected || (selected.EtcValues ?? []).length === 0}
                  style={input.minValue ? { color: HONING_TIER_COLORS[(selected?.EtcValues ?? []).findIndex((value) => String(value.Value) === input.minValue)] } : undefined}
                >
                  <option value="">등급 선택</option>
                  {(selected?.EtcValues ?? []).map((value, valueIndex) => <option key={value.Value} value={value.Value} style={{ color: HONING_TIER_COLORS[valueIndex] }}>{['상', '중', '하'][valueIndex]} · {value.DisplayValue}</option>)}
                </select>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={handleSearch} className="btn-gold mt-5 w-full sm:w-auto" disabled={state === 'loading'}>장신구 검색</button>
      </GlassCard>

      <AuctionResults kind="장신구" state={state} items={items} error={error} pageNo={pageNo} totalCount={totalCount} pageSize={pageSize} sortCondition={lastFilters?.sortCondition ?? sortCondition} onPageChange={(nextPage) => lastFilters && void runSearch(lastFilters, nextPage)} />
    </section>
  );
};

export default AccessoryMarket;
