import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import NavBar from '../components/NavBar';
import GlassCard from '../components/GlassCard';
import SelectMenu from '../components/SelectMenu';
import {
  fetchEquipment,
  fetchProfile,
  fetchMarketOptions,
  fetchMarketItems,
  type MarketCategory,
} from '../utils/api';
import {
  AEGIR_ARMOR_STEPS,
  AEGIR_WEAPON_STEPS,
  SERKA_ARMOR_STEPS,
  SERKA_WEAPON_STEPS,
  ADV_ARMOR_STAGES,
  ADV_WEAPON_STAGES,
  ADV_STAGE_XP,
  calcExpectedAttempts,
  getCeiling,
  getAttemptMaterials,
  calcAdvExpectedAttempts,
  getAdvAttemptMaterials,
  type MaterialType,
  type AdvTurnOption,
  type EnhancementStep,
} from '../data/enhancement';

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

const ARMOR_SLOTS = ['투구', '어깨', '상의', '하의', '장갑'] as const;
type ArmorSlot = (typeof ARMOR_SLOTS)[number];
type SlotName = '무기' | ArmorSlot;

const ALL_SLOTS: SlotName[] = ['무기', '투구', '어깨', '상의', '하의', '장갑'];

const ITEM_LEVEL_PER_STEP = 5; // 일반 재련 1단계당 아이템 레벨 증가량

const NORMAL_BULK_TARGET_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const level = i + 11;
  return { value: level, label: `${level}강` };
});

const ADV_TARGET_OPTIONS = [10, 20, 30, 40].map((level) => ({
  value: level,
  label: `${level}단계`,
}));

interface MarketConfig {
  searchName: string;
  itemsPerUnit?: number;
  categoryCode?: number;
  extraParams?: Record<string, unknown>;
  untradeable?: boolean;
}

const MARKET_SEARCH: Record<MaterialType, MarketConfig> = {
  // 방어구
  '수호석':               { searchName: '운명의 수호석' },
  '돌파석':               { searchName: '운명의 돌파석' },
  '아비도스 융화 재료':    { searchName: '아비도스 융화 재료' },
  '운명의 파편':           { searchName: '운명의 파편 주머니(소)', itemsPerUnit: 1000 },
  '빙하의 숨결':           { searchName: '빙하의 숨결', categoryCode: 50020 },
  '재봉술: 업화 [11-14]': { searchName: '재봉술 : 업화 [11-14]' },
  '재봉술: 업화 [15-18]': { searchName: '재봉술 : 업화 [15-18]' },
  '재봉술: 업화 [19-20]': { searchName: '재봉술 : 업화 [19-20]' },
  // 무기
  '파괴석':               { searchName: '운명의 파괴석' },
  '용암의 숨결':           { searchName: '용암의 숨결', categoryCode: 50020 },
  '야금술: 업화 [11-14]': { searchName: '야금술 : 업화 [11-14]' },
  '야금술: 업화 [15-18]': { searchName: '야금술 : 업화 [15-18]' },
  '야금술: 업화 [19-20]': { searchName: '야금술 : 업화 [19-20]' },
  // 세르카 방어구
  '운명의 수호석 결정':    { searchName: '운명의 수호석 결정' },
  '위대한 운명의 돌파석':  { searchName: '위대한 운명의 돌파석' },
  '상급 아비도스 융화':    { searchName: '상급 아비도스 융화' },
  // 세르카 무기
  '운명의 파괴석 결정':    { searchName: '운명의 파괴석 결정' },
  // 방어구 상급 재련 책
  '장인의 재봉술: 1단계':  { searchName: '장인의 재봉술 : 1단계' },
  '장인의 재봉술: 2단계':  { searchName: '장인의 재봉술 : 2단계' },
  '장인의 재봉술: 3단계':  { searchName: '장인의 재봉술 : 3단계' },
  '장인의 재봉술: 4단계':  { searchName: '장인의 재봉술 : 4단계' },
  // 무기 상급 재련 책
  '장인의 야금술: 1단계':  { searchName: '장인의 야금술 : 1단계' },
  '장인의 야금술: 2단계':  { searchName: '장인의 야금술 : 2단계' },
  '장인의 야금술: 3단계':  { searchName: '장인의 야금술 : 3단계' },
  '장인의 야금술: 4단계':  { searchName: '장인의 야금술 : 4단계' },
};

const ALL_MATERIAL_TYPES = Object.keys(MARKET_SEARCH) as MaterialType[];

type PriceMap = Partial<Record<MaterialType, number>>;
type IconMap = Partial<Record<MaterialType, string>>;

const flattenCategories = (cats: MarketCategory[]): MarketCategory[] =>
  cats.flatMap((c) => [c, ...(c.Subs ? flattenCategories(c.Subs) : [])]);

const MATERIAL_CATEGORY_KEYWORD: Record<MaterialType, string> = {
  '수호석':               '재련 재료',
  '돌파석':               '재련 재료',
  '아비도스 융화 재료':    '재련 재료',
  '운명의 파편':           '재련 재료',
  '빙하의 숨결':           '추가 재료',
  '재봉술: 업화 [11-14]': '추가 재료',
  '재봉술: 업화 [15-18]': '추가 재료',
  '재봉술: 업화 [19-20]': '추가 재료',
  '운명의 수호석 결정':    '재련 재료',
  '위대한 운명의 돌파석':  '재련 재료',
  '상급 아비도스 융화':    '재련 재료',
  '운명의 파괴석 결정':    '재련 재료',
  '파괴석':               '재련 재료',
  '용암의 숨결':           '추가 재료',
  '야금술: 업화 [11-14]': '추가 재료',
  '야금술: 업화 [15-18]': '추가 재료',
  '야금술: 업화 [19-20]': '추가 재료',
  '장인의 재봉술: 1단계':  '추가 재료',
  '장인의 재봉술: 2단계':  '추가 재료',
  '장인의 재봉술: 3단계':  '추가 재료',
  '장인의 재봉술: 4단계':  '추가 재료',
  '장인의 야금술: 1단계':  '추가 재료',
  '장인의 야금술: 2단계':  '추가 재료',
  '장인의 야금술: 3단계':  '추가 재료',
  '장인의 야금술: 4단계':  '추가 재료',
};

// ─────────────────────────────────────────────
// 유틸 함수
// ─────────────────────────────────────────────

const parseEnhLevel = (name: string): number => {
  const m = name.match(/^\+(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};

const parseTooltipData = (tooltip: string): { isInherited: boolean; advLevel: number } => {
  try {
    const data = JSON.parse(tooltip);
    const isInherited = data?.Element_001?.value?.slotData?.petBorder === 6;
    let advLevel = 0;
    for (const key of Object.keys(data)) {
      const el = data[key];
      if (el?.value && typeof el.value === 'string') {
        const stripped = el.value.replace(/<[^>]+>/g, '');
        const m = stripped.match(/\[상급 재련\]\s*(\d+)단계/);
        if (m) { advLevel = parseInt(m[1], 10); break; }
      }
    }
    return { isInherited, advLevel };
  } catch {
    return { isInherited: false, advLevel: 0 };
  }
};

const formatGold = (g: number): string => {
  if (g >= 100_000_000) return `${(g / 100_000_000).toFixed(2)}억G`;
  if (g >= 10_000) return `${(g / 10_000).toFixed(1)}만G`;
  return `${Math.round(g).toLocaleString()}G`;
};

const formatSilver = (s: number): string => {
  if (s >= 10_000) return `${(s / 10_000).toFixed(0)}만`;
  return s.toLocaleString();
};

const findCheapest = (
  steps: typeof AEGIR_ARMOR_STEPS,
  prices: PriceMap,
): { useBook: boolean; useBreath: boolean } => {
  const combos = [
    { useBook: false, useBreath: false },
    { useBook: false, useBreath: true },
    { useBook: true,  useBreath: false },
    { useBook: true,  useBreath: true },
  ];
  let best = combos[0];
  let bestGold = Infinity;
  for (const combo of combos) {
    const gold = steps.reduce((sum, step) => {
      const effBook = combo.useBook && !!step.bookMaterial;
      const exp = calcExpectedAttempts(step, effBook, combo.useBreath);
      const mats = getAttemptMaterials(step, effBook, combo.useBreath);
      const matGold = mats.reduce((s, m) => s + m.amount * (prices[m.type] ?? 0), 0) * exp;
      return sum + step.gold * exp + matGold;
    }, 0);
    if (gold < bestGold) { bestGold = gold; best = combo; }
  }
  return best;
};

const ADV_TURN_OPTIONS: AdvTurnOption[] = ['none', 'book', 'breath', 'both'];
const ADV_TURN_OPTION_LABELS: Record<AdvTurnOption, string> = {
  none: '-', book: '재', breath: '숨', both: '숨재',
};

const findCheapestAdv = (
  activeAdvSlots: SlotName[],
  advLevelMap: Partial<Record<SlotName, number>>,
  advTargetMap: Partial<Record<SlotName, number>>,
  prices: PriceMap,
): { normalOpt: AdvTurnOption; ancestorOpt: AdvTurnOption; enhancedOpt: AdvTurnOption } => {
  const defaultCombo = { normalOpt: 'none' as AdvTurnOption, ancestorOpt: 'none' as AdvTurnOption, enhancedOpt: 'none' as AdvTurnOption };
  if (activeAdvSlots.length === 0) return defaultCombo;

  const calcSlotGold = (normalOpt: AdvTurnOption, ancestorOpt: AdvTurnOption, enhancedOpt: AdvTurnOption) => {
    let gold = 0;
    activeAdvSlots.forEach((slot) => {
      const currentAdv = advLevelMap[slot] ?? 0;
      const targetAdv = advTargetMap[slot]!;
      const stagesData = slot === '무기' ? ADV_WEAPON_STAGES : ADV_ARMOR_STAGES;
      for (let i = 0; i < stagesData.length; i++) {
        const stageNum = (i + 1) as 1 | 2 | 3 | 4;
        const stageStart = i * 10;
        const stageEnd = stageStart + 10;
        if (currentAdv >= stageEnd) continue;
        if (targetAdv <= stageStart) break;
        const stageData = stagesData[i];
        const xpDone = currentAdv > stageStart ? (currentAdv - stageStart) * 100 : 0;
        const xpNeeded = (Math.min(targetAdv, stageEnd) - stageStart) * 100 - xpDone;
        if (xpNeeded <= 0) continue;
        const attempts = calcAdvExpectedAttempts(normalOpt, ancestorOpt, enhancedOpt, stageNum) * (xpNeeded / ADV_STAGE_XP);
        gold += attempts * stageData.gold;
        const { main, optional } = getAdvAttemptMaterials(stageData, normalOpt, ancestorOpt, enhancedOpt);
        for (const { type, amount } of [...main, ...optional]) {
          gold += amount * attempts * (prices[type] ?? 0);
        }
      }
    });
    return gold;
  };

  let best = defaultCombo;
  let bestGold = Infinity;
  for (const normalOpt of ADV_TURN_OPTIONS) {
    for (const ancestorOpt of ADV_TURN_OPTIONS) {
      for (const enhancedOpt of ADV_TURN_OPTIONS) {
        const gold = calcSlotGold(normalOpt, ancestorOpt, enhancedOpt);
        if (gold < bestGold) { bestGold = gold; best = { normalOpt, ancestorOpt, enhancedOpt }; }
      }
    }
  }
  return best;
};

const getStepsForSlot = (slot: SlotName, isInherited: boolean) => {
  if (slot === '무기') return isInherited ? SERKA_WEAPON_STEPS : AEGIR_WEAPON_STEPS;
  return isInherited ? SERKA_ARMOR_STEPS : AEGIR_ARMOR_STEPS;
};

const calcStepData = (
  steps: typeof AEGIR_ARMOR_STEPS,
  book: boolean,
  breath: boolean,
  priceMap: PriceMap,
) => steps.map((step) => {
  const effBook = book && !!step.bookMaterial;
  const exp = calcExpectedAttempts(step, effBook, breath);
  const ceiling = getCeiling(step, effBook, breath);
  const mats = getAttemptMaterials(step, effBook, breath);
  const matGoldPerAttempt = mats.reduce((s, m) => s + m.amount * (priceMap[m.type] ?? 0), 0);
  const matGold = matGoldPerAttempt * exp;
  const directGold = step.gold * exp;
  const silver = step.silver * exp;
  // 천장(장기백) 케이스: 천장 시도수까지 모두 실패 후 마지막에 성공
  const ceilingMatGold = matGoldPerAttempt * ceiling;
  const ceilingDirectGold = step.gold * ceiling;
  const ceilingSilver = step.silver * ceiling;
  return {
    step,
    exp, mats, matGold, directGold, silver, totalGold: directGold + matGold,
    ceiling, ceilingMatGold, ceilingDirectGold, ceilingSilver, ceilingTotalGold: ceilingDirectGold + ceilingMatGold,
  };
});

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

const Toggle: React.FC<{
  label: string;
  active: boolean;
  badge?: string;
  color?: 'gold' | 'blue';
  onClick: () => void;
}> = ({ label, active, badge, color = 'gold', onClick }) => {
  const activeClass =
    color === 'blue'
      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40'
      : 'bg-la-gold/20 text-la-gold-dark dark:text-la-gold border-la-gold/40';
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
        active
          ? activeClass
          : 'bg-transparent text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10'
      }`}
    >
      {label}
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-green-500 text-white rounded-full px-1 leading-4">
          {badge}
        </span>
      )}
    </button>
  );
};

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────

const Enhancement: React.FC = () => {
  // ── 캐릭터 검색 ─────────────────────────────
  const [charInput, setCharInput] = useState('');
  const [armorMap, setArmorMap] = useState<Partial<Record<ArmorSlot, number>>>({});
  const [weaponLevel, setWeaponLevel] = useState<number | undefined>(undefined);
  const [slotIconMap, setSlotIconMap] = useState<Partial<Record<SlotName, string>>>({});
  const [slotInheritedMap, setSlotInheritedMap] = useState<Partial<Record<SlotName, boolean>>>({});
  const [advLevelMap, setAdvLevelMap] = useState<Partial<Record<SlotName, number>>>({});
  const [advTargetMap, setAdvTargetMap] = useState<Partial<Record<SlotName, number>>>({});
  const [charItemLevel, setCharItemLevel] = useState<number | null>(null);
  const [charLoading, setCharLoading] = useState(false);
  const [charError, setCharError] = useState<string | null>(null);

  // ── 슬롯별 목표 강 ───────────────────────────
  const [targetMap, setTargetMap] = useState<Partial<Record<SlotName, number>>>({});

  // ── 일반 재련 부스터 ──────────────────────────
  const [useBook, setUseBook] = useState(false);
  const [useBreath, setUseBreath] = useState(false);
  const [costMode, setCostMode] = useState<'average' | 'ceiling'>('average');

  // ── 상급 재련 턴별 설정 ───────────────────────
  const [advNormalOpt,   setAdvNormalOpt]   = useState<AdvTurnOption>('none');
  const [advAncestorOpt, setAdvAncestorOpt] = useState<AdvTurnOption>('none');
  const [advEnhancedOpt, setAdvEnhancedOpt] = useState<AdvTurnOption>('none');

  // ── 거래소 가격 ──────────────────────────────
  const [prices, setPrices] = useState<PriceMap>({});
  const [icons, setIcons] = useState<IconMap>({});
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const autoApplied = useRef(false);
  const autoAppliedAdv = useRef(false);

  // ── 보유 재료 ────────────────────────────────
  const [ownedMaterials, setOwnedMaterials] = useState<Partial<Record<MaterialType, number>>>({});
  const [showOwnedSection, setShowOwnedSection] = useState(false);

  // ── 거래소 가격 조회 (마운트 시 1회) ──────────
  useEffect(() => {
    const load = async () => {
      setPriceLoading(true);
      setPriceError(null);
      try {
        const options = await fetchMarketOptions();
        const allCats = flattenCategories(options.Categories);
        const findCode = (keyword: string): number => {
          const found = allCats.find((c) => c.CodeName.includes(keyword));
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
            return { type, price: item.CurrentMinPrice / item.BundleCount / itemsPerUnit, icon: item.Icon };
          })
        );
        const priceMap: PriceMap = {};
        const iconMap: IconMap = {};
        for (const r of results) {
          if (r.status === 'fulfilled') {
            priceMap[r.value.type] = r.value.price;
            if (r.value.icon) iconMap[r.value.type] = r.value.icon;
          }
        }
        setPrices(priceMap);
        setIcons(iconMap);
      } catch {
        setPriceError('가격 조회 실패');
      } finally {
        setPriceLoading(false);
      }
    };
    load();
  }, []);

  // ── 슬롯별 현재 레벨 ─────────────────────────
  const slotCurrentLevel = useMemo<Record<SlotName, number>>(() => ({
    '무기': weaponLevel ?? 10,
    '투구': armorMap['투구'] ?? 10,
    '어깨': armorMap['어깨'] ?? 10,
    '상의': armorMap['상의'] ?? 10,
    '하의': armorMap['하의'] ?? 10,
    '장갑': armorMap['장갑'] ?? 10,
  }), [weaponLevel, armorMap]);

  const slotHasData = useMemo<Record<SlotName, boolean>>(() => ({
    '무기': weaponLevel !== undefined,
    '투구': armorMap['투구'] !== undefined,
    '어깨': armorMap['어깨'] !== undefined,
    '상의': armorMap['상의'] !== undefined,
    '하의': armorMap['하의'] !== undefined,
    '장갑': armorMap['장갑'] !== undefined,
  }), [weaponLevel, armorMap]);

  // ── 활성 슬롯 (목표 강이 설정된 슬롯) ─────────
  const activeSlots = useMemo(
    () => ALL_SLOTS.filter((s) => targetMap[s] != null && targetMap[s]! > slotCurrentLevel[s]),
    [targetMap, slotCurrentLevel],
  );

  // ── 슬롯별 필터된 steps 캐시 ─────────────────
  const slotFilteredSteps = useMemo(() => {
    const map = new Map<SlotName, EnhancementStep[]>();
    activeSlots.forEach((slot) => {
      const base = getStepsForSlot(slot, !!slotInheritedMap[slot]);
      map.set(slot, base.filter((s) => s.from >= slotCurrentLevel[slot] && s.from < targetMap[slot]!));
    });
    return map;
  }, [activeSlots, targetMap, slotCurrentLevel, slotInheritedMap]);

  // ── 선택된 슬롯 전체 steps (cheapest 계산용) ──
  const allSelectedSteps = useMemo(
    () => Array.from(slotFilteredSteps.values()).flat(),
    [slotFilteredSteps],
  );

  // ── 최적 콤보 계산 ────────────────────────────
  const cheapest = useMemo(
    () => findCheapest(allSelectedSteps, prices),
    [allSelectedSteps, prices],
  );

  // ── 가격 로드 완료 시 최적 세팅 1회 자동 적용 ─
  useEffect(() => {
    if (!priceLoading && !autoApplied.current) {
      setUseBook(cheapest.useBook);
      setUseBreath(cheapest.useBreath);
      autoApplied.current = true;
    }
  }, [priceLoading, cheapest]);


  // ── 캐릭터 장비 조회 ─────────────────────────
  const searchCharacter = useCallback(async (name: string) => {
    if (!name.trim()) return;
    setCharLoading(true);
    setCharError(null);
    setArmorMap({});
    setWeaponLevel(undefined);
    setSlotIconMap({});
    setSlotInheritedMap({});
    setAdvLevelMap({});
    setAdvTargetMap({});
    setCharItemLevel(null);
    setTargetMap({});
    try {
      const equipment = await fetchEquipment(name.trim());
      const map: Partial<Record<ArmorSlot, number>> = {};
      const iconMap: Partial<Record<SlotName, string>> = {};
      const inheritedMap: Partial<Record<SlotName, boolean>> = {};
      const advMap: Partial<Record<SlotName, number>> = {};
      for (const item of equipment) {
        if ((ARMOR_SLOTS as readonly string[]).includes(item.Type)) {
          map[item.Type as ArmorSlot] = parseEnhLevel(item.Name);
          if (item.Icon) iconMap[item.Type as ArmorSlot] = item.Icon;
          const { isInherited, advLevel } = parseTooltipData(item.Tooltip);
          if (isInherited) inheritedMap[item.Type as ArmorSlot] = true;
          if (advLevel > 0) advMap[item.Type as ArmorSlot] = advLevel;
        }
        if (item.Type === '무기') {
          setWeaponLevel(parseEnhLevel(item.Name));
          if (item.Icon) iconMap['무기'] = item.Icon;
          const { isInherited, advLevel } = parseTooltipData(item.Tooltip);
          if (isInherited) inheritedMap['무기'] = true;
          if (advLevel > 0) advMap['무기'] = advLevel;
        }
      }
      setArmorMap(map);
      setSlotIconMap(iconMap);
      setSlotInheritedMap(inheritedMap);
      setAdvLevelMap(advMap);
    } catch {
      setCharError('캐릭터를 찾을 수 없습니다');
      setCharLoading(false);
      return;
    }

    try {
      const profile = await fetchProfile(name.trim());
      const parsed = parseFloat(profile.ItemAvgLevel.replace(/,/g, ''));
      if (!isNaN(parsed)) setCharItemLevel(parsed);
    } catch {
      // 프로필 조회 실패 시 아이템 레벨 미표시 (장비 데이터는 유지)
    } finally {
      setCharLoading(false);
    }
  }, []);

  const handleSearch = () => searchCharacter(charInput);

  // ── 목표 강 변경 ──────────────────────────────
  const handleTargetChange = (slot: SlotName, val: number | undefined) => {
    setTargetMap((prev) => {
      const next = { ...prev };
      if (val === undefined) delete next[slot];
      else next[slot] = val;
      return next;
    });
    autoApplied.current = false;
  };

  // ── 슬롯별 단계 계산 ─────────────────────────
  // costMode가 'ceiling'이면 평균(exp/totalGold/...) 필드를 천장 값으로 덮어쓴 view를 노출 →
  // 하위(slotTotals/totals/totalMaterials)가 자동으로 천장 기준으로 재계산됨
  const perSlotStepData = useMemo(() => {
    const result = new Map<SlotName, ReturnType<typeof calcStepData>>();
    slotFilteredSteps.forEach((steps, slot) => {
      const data = calcStepData(steps, useBook, useBreath, prices);
      if (costMode === 'ceiling') {
        result.set(slot, data.map((d) => ({
          ...d,
          exp: d.ceiling,
          directGold: d.ceilingDirectGold,
          matGold: d.ceilingMatGold,
          silver: d.ceilingSilver,
          totalGold: d.ceilingTotalGold,
        })));
      } else {
        result.set(slot, data);
      }
    });
    return result;
  }, [slotFilteredSteps, useBook, useBreath, prices, costMode]);

  // ── 슬롯별 소계 ──────────────────────────────
  const slotTotals = useMemo(() => {
    const map = new Map<SlotName, {
      exp: number; directGold: number; matGold: number; silver: number; totalGold: number;
      ceiling: number; ceilingDirectGold: number; ceilingMatGold: number; ceilingSilver: number; ceilingTotalGold: number;
    }>();
    perSlotStepData.forEach((data, slot) => {
      const acc = {
        exp: 0, directGold: 0, matGold: 0, silver: 0, totalGold: 0,
        ceiling: 0, ceilingDirectGold: 0, ceilingMatGold: 0, ceilingSilver: 0, ceilingTotalGold: 0,
      };
      for (const d of data) {
        acc.exp        += d.exp;
        acc.directGold += d.directGold;
        acc.matGold    += d.matGold;
        acc.silver     += d.silver;
        acc.totalGold  += d.totalGold;
        acc.ceiling           += d.ceiling;
        acc.ceilingDirectGold += d.ceilingDirectGold;
        acc.ceilingMatGold    += d.ceilingMatGold;
        acc.ceilingSilver     += d.ceilingSilver;
        acc.ceilingTotalGold  += d.ceilingTotalGold;
      }
      map.set(slot, acc);
    });
    return map;
  }, [perSlotStepData]);

  // ── 전체 합계 ────────────────────────────────
  const totals = useMemo(() => {
    const acc = {
      exp: 0, directGold: 0, matGold: 0, silver: 0, totalGold: 0,
      ceiling: 0, ceilingDirectGold: 0, ceilingMatGold: 0, ceilingSilver: 0, ceilingTotalGold: 0,
    };
    slotTotals.forEach((v) => {
      acc.exp        += v.exp;
      acc.directGold += v.directGold;
      acc.matGold    += v.matGold;
      acc.silver     += v.silver;
      acc.totalGold  += v.totalGold;
      acc.ceiling           += v.ceiling;
      acc.ceilingDirectGold += v.ceilingDirectGold;
      acc.ceilingMatGold    += v.ceilingMatGold;
      acc.ceilingSilver     += v.ceilingSilver;
      acc.ceilingTotalGold  += v.ceilingTotalGold;
    });
    return acc;
  }, [slotTotals]);

  // ── 재료 수량 집계 (현재 설정) ───────────────
  const totalMaterials = useMemo(() => {
    const map = new Map<MaterialType, number>();
    perSlotStepData.forEach((data) => {
      data.forEach(({ mats, exp }) => {
        mats.forEach((m) => {
          map.set(m.type, (map.get(m.type) ?? 0) + m.amount * exp);
        });
      });
    });
    return map;
  }, [perSlotStepData]);

  // ── 표시용: 책/숨결 모두 켠 전체 재료 목록 ───
  const allMaterials = useMemo(() => {
    const map = new Map<MaterialType, number>();
    slotFilteredSteps.forEach((steps) => {
      steps.forEach((step) => {
        const effBook = !!step.bookMaterial;
        const exp = calcExpectedAttempts(step, effBook, true);
        const mats = getAttemptMaterials(step, effBook, true);
        mats.forEach((m) => {
          map.set(m.type, (map.get(m.type) ?? 0) + m.amount * exp);
        });
      });
    });
    return map;
  }, [slotFilteredSteps]);

  // ── 상급 재련 활성 슬롯 ───────────────────────
  const activeAdvSlots = useMemo(
    () => ALL_SLOTS.filter((s) => {
      const target = advTargetMap[s];
      return target != null && target > (advLevelMap[s] ?? 0);
    }),
    [advTargetMap, advLevelMap],
  );

  // ── 상급 재련 최적 콤보 ───────────────────────
  const cheapestAdv = useMemo(
    () => findCheapestAdv(activeAdvSlots, advLevelMap, advTargetMap, prices),
    [activeAdvSlots, advLevelMap, advTargetMap, prices],
  );

  useEffect(() => {
    if (!priceLoading && !autoAppliedAdv.current) {
      setAdvNormalOpt(cheapestAdv.normalOpt);
      setAdvAncestorOpt(cheapestAdv.ancestorOpt);
      setAdvEnhancedOpt(cheapestAdv.enhancedOpt);
      autoAppliedAdv.current = true;
    }
  }, [priceLoading, cheapestAdv]);

  // ── 종합 아이템 레벨 ──────────────────────────
  const targetTotalItemLevel = useMemo(() => {
    if (charItemLevel == null) return null;

    // 일반 재련: 1강당 +5 아이템 레벨
    const normalIncrease = activeSlots.reduce((sum, slot) => {
      const steps = (targetMap[slot] ?? slotCurrentLevel[slot]) - slotCurrentLevel[slot];
      return sum + steps * ITEM_LEVEL_PER_STEP;
    }, 0);

    // 상급 재련: 1단계당 +1 아이템 레벨
    const advIncrease = activeAdvSlots.reduce((sum, slot) => {
      const current = advLevelMap[slot] ?? 0;
      const target = advTargetMap[slot] ?? current;
      return sum + (target - current);
    }, 0);

    const totalIncrease = normalIncrease + advIncrease;
    if (totalIncrease === 0) return null;
    // API가 소수점 2자리 평균값을 반환하므로 6을 곱해 정수 합계를 복원 후 계산
    const currentSum = Math.round(charItemLevel * 6);
    return (currentSum + totalIncrease) / 6;
  }, [charItemLevel, activeSlots, activeAdvSlots, targetMap, advTargetMap, slotCurrentLevel, advLevelMap]);

  // ── 상급 재련 슬롯별 계산 ─────────────────────
  const advSlotData = useMemo(() => {
    const result = new Map<SlotName, {
      totalAttempts: number;
      totalDirectGold: number;
      totalMatGold: number;
      totalGold: number;
      materials: Map<MaterialType, number>;
    }>();

    activeAdvSlots.forEach((slot) => {
      const currentAdv = advLevelMap[slot] ?? 0;
      const targetAdv = advTargetMap[slot]!;
      const stagesData = slot === '무기' ? ADV_WEAPON_STAGES : ADV_ARMOR_STAGES;

      let totalAttempts = 0;
      let totalDirectGold = 0;
      let totalMatGold = 0;
      const matMap = new Map<MaterialType, number>();

      for (let i = 0; i < stagesData.length; i++) {
        const stageNum = (i + 1) as 1 | 2 | 3 | 4;
        const stageStart = i * 10;
        const stageEnd = stageStart + 10;

        if (currentAdv >= stageEnd) continue;
        if (targetAdv <= stageStart) break;

        const stageData = stagesData[i];
        const xpDone = currentAdv > stageStart ? (currentAdv - stageStart) * 100 : 0;
        const xpTarget = (Math.min(targetAdv, stageEnd) - stageStart) * 100;
        const xpNeeded = xpTarget - xpDone;
        if (xpNeeded <= 0) continue;

        const fullAttempts = calcAdvExpectedAttempts(advNormalOpt, advAncestorOpt, advEnhancedOpt, stageNum);
        const attempts = fullAttempts * (xpNeeded / ADV_STAGE_XP);

        totalAttempts += attempts;
        totalDirectGold += attempts * stageData.gold;

        const { main, optional } = getAdvAttemptMaterials(stageData, advNormalOpt, advAncestorOpt, advEnhancedOpt);
        let stageMatGold = 0;
        for (const { type, amount } of [...main, ...optional]) {
          const qty = amount * attempts;
          matMap.set(type, (matMap.get(type) ?? 0) + qty);
          stageMatGold += qty * (prices[type] ?? 0);
        }
        totalMatGold += stageMatGold;
      }

      if (totalAttempts > 0) {
        result.set(slot, {
          totalAttempts,
          totalDirectGold,
          totalMatGold,
          totalGold: totalDirectGold + totalMatGold,
          materials: matMap,
        });
      }
    });

    return result;
  }, [activeAdvSlots, advLevelMap, advTargetMap, advNormalOpt, advAncestorOpt, advEnhancedOpt, prices]);

  // ── 상급 재련 합계 ─────────────────────────────
  const advTotals = useMemo(() => {
    let totalAttempts = 0, totalDirectGold = 0, totalMatGold = 0, totalGold = 0;
    advSlotData.forEach((d) => {
      totalAttempts += d.totalAttempts;
      totalDirectGold += d.totalDirectGold;
      totalMatGold += d.totalMatGold;
      totalGold += d.totalGold;
    });
    return { totalAttempts, totalDirectGold, totalMatGold, totalGold };
  }, [advSlotData]);

  // ── 상급 재련 재료 집계 ───────────────────────
  const advTotalMaterials = useMemo(() => {
    const map = new Map<MaterialType, number>();
    advSlotData.forEach((d) => {
      d.materials.forEach((qty, type) => {
        map.set(type, (map.get(type) ?? 0) + qty);
      });
    });
    return map;
  }, [advSlotData]);

  // ── 보유 재료 기반 부족분 계산 ─────────────────
  const shortfallData = useMemo(() => {
    const map = new Map<MaterialType, { needed: number; shortfall: number }>();
    const allActiveTypes = new Set<MaterialType>([...Array.from(totalMaterials.keys()), ...Array.from(advTotalMaterials.keys())]);
    allActiveTypes.forEach((type) => {
      const needed = (totalMaterials.get(type) ?? 0) + (advTotalMaterials.get(type) ?? 0);
      const owned = ownedMaterials[type] ?? 0;
      map.set(type, { needed, shortfall: Math.max(0, needed - owned) });
    });
    return map;
  }, [totalMaterials, advTotalMaterials, ownedMaterials]);

  const { shortfallMatGold, normalShortfallMatGold } = useMemo(() => {
    let shortfallMatGold = 0;
    let normalShortfallMatGold = 0;
    shortfallData.forEach(({ shortfall }, type) => {
      const cost = shortfall * (prices[type] ?? 0);
      shortfallMatGold += cost;
      if (totalMaterials.has(type)) normalShortfallMatGold += cost;
    });
    return { shortfallMatGold, normalShortfallMatGold };
  }, [shortfallData, totalMaterials, prices]);

  // ── 상급 재련 목표 변경 ───────────────────────
  const handleAdvTargetChange = (slot: SlotName, val: number | undefined) => {
    setAdvTargetMap((prev) => {
      const next = { ...prev };
      if (val === undefined) delete next[slot];
      else next[slot] = val;
      return next;
    });
    autoAppliedAdv.current = false;
  };

  const applyCheapestAdv = () => {
    setAdvNormalOpt(cheapestAdv.normalOpt);
    setAdvAncestorOpt(cheapestAdv.ancestorOpt);
    setAdvEnhancedOpt(cheapestAdv.enhancedOpt);
  };

  const hasPrices = !priceLoading && !priceError;
  const isCheapest = (book: boolean, breath: boolean) =>
    cheapest.useBook === book && cheapest.useBreath === breath;
  const hasBookSteps = allSelectedSteps.some((s) => !!s.bookMaterial);
  const hasResult = activeSlots.length > 0;
  const hasAdvResult = activeAdvSlots.length > 0;
  const hasAnyResult = hasResult || hasAdvResult;
  const hasOwnedInput = Object.values(ownedMaterials).some((v) => (v ?? 0) > 0);
  // 상급 재련 가능한 슬롯이 1개 이상 존재 (에기르이고 40단계 미만)
  const hasAnyAdvSlotAvailable = ALL_SLOTS.some(
    (s) => slotHasData[s] && !slotInheritedMap[s] && (advLevelMap[s] ?? 0) < 40,
  );

  // ─────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────
  return (
    <div>
      <NavBar />
      <main className="enhancement-page max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ── 헤더 ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            재련 계산기
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            계산할 장비를 선택하고 목표 수치를 설정하세요
          </p>
        </div>

        {/* ── 캐릭터 검색 ── */}
        <GlassCard className="p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
            캐릭터 강화 현황
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={charInput}
              onChange={(e) => setCharInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="캐릭터명 입력"
              className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-la-gold/40"
            />
            <button
              onClick={handleSearch}
              disabled={charLoading}
              className="px-4 py-2 bg-la-gold/20 hover:bg-la-gold/30 text-la-gold-dark dark:text-la-gold rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {charLoading ? '조회 중…' : '조회'}
            </button>
          </div>

          {charError && (
            <p className="text-sm text-red-400 mb-3">{charError}</p>
          )}

          {/* 슬롯 카드 - 현재 강화 수치 표시 */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {ALL_SLOTS.map((slot) => {
              const hasData = slotHasData[slot];
              const level = slotCurrentLevel[slot];
              const isActive = targetMap[slot] != null;
              return (
                <div
                  key={slot}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all duration-200 ${
                    isActive
                      ? 'border-la-gold/60 bg-la-gold/10 dark:bg-la-gold/10'
                      : hasData
                        ? 'border-gray-200/60 dark:border-white/10 bg-gray-50/60 dark:bg-white/5'
                        : 'border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/3 opacity-40'
                  }`}
                >
                  {slotIconMap[slot]
                    ? (
                      <div className="relative w-8 h-8">
                        <img src={slotIconMap[slot]} alt={slot} className="w-8 h-8 rounded-lg" />
                        {slotInheritedMap[slot] && (
                          <img
                            src="https://cdn-lostark.game.onstove.com/2018/obt/assets/images/common/game/bg_equipment_petBorder.png?cf40f871847e238f7644"
                            alt=""
                            className="absolute inset-0 w-8 h-8 pointer-events-none"
                          />
                        )}
                      </div>
                    )
                    : <span className="text-xs text-gray-500 dark:text-gray-400">{slot}</span>
                  }
                  <span className={`text-sm font-bold leading-none ${
                    isActive
                      ? 'text-la-gold-dark dark:text-la-gold'
                      : hasData
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-300 dark:text-gray-600'
                  }`}>
                    {hasData ? `+${level}` : '—'}
                  </span>
                  {!slotInheritedMap[slot] && hasData && (
                    <span className={`text-[10px] leading-none ${
                      advTargetMap[slot] != null
                        ? 'text-purple-500 dark:text-purple-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {advLevelMap[slot] ? `상급 ${advLevelMap[slot]}` : '상급 —'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 일반 재련 일괄 + 목표 선택 */}
          <div className="flex items-center gap-2 mt-2 mb-1">
            <span className="text-xs text-gray-400 dark:text-gray-500 w-8">일괄</span>
            <SelectMenu
              value={undefined}
              options={NORMAL_BULK_TARGET_OPTIONS}
              placeholder="일반 재련 일괄"
              ariaLabel="일반 재련 일괄 목표 선택"
              onChange={(val) => {
                if (val === undefined) return;
                const targetLevel = Number(val);
                ALL_SLOTS.forEach((slot) => {
                  if (slotCurrentLevel[slot] < targetLevel) handleTargetChange(slot, targetLevel);
                });
              }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {ALL_SLOTS.map((slot) => {
              const currentLvl = slotCurrentLevel[slot];
              const targetOptions = Array.from({ length: 25 - currentLvl }, (_, i) => {
                const level = currentLvl + i + 1;
                return { value: level, label: `${level}강` };
              });
              return (
                <SelectMenu
                  key={slot}
                  value={targetMap[slot]}
                  options={targetOptions}
                  placeholder="목표"
                  ariaLabel={`${slot} 일반 재련 목표 선택`}
                  onChange={(val) => handleTargetChange(slot, val === undefined ? undefined : Number(val))}
                  fullWidth
                  compact
                  align="center"
                  clearable
                />
              );
            })}
          </div>

          {hasAnyAdvSlotAvailable && (
            <>
              <div className="flex items-center gap-2 mt-2 mb-1">
                <span className="text-xs text-gray-400 dark:text-gray-500 w-8">일괄</span>
                <SelectMenu
                  value={undefined}
                  options={ADV_TARGET_OPTIONS}
                  placeholder="상급 재련 일괄"
                  ariaLabel="상급 재련 일괄 목표 선택"
                  variant="purple"
                  onChange={(val) => {
                    if (val === undefined) return;
                    const targetLevel = Number(val);
                    ALL_SLOTS.forEach((slot) => {
                      if (!slotInheritedMap[slot] && (advLevelMap[slot] ?? 0) < targetLevel) {
                        handleAdvTargetChange(slot, targetLevel);
                      }
                    });
                  }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {ALL_SLOTS.map((slot) => {
                  if (slotInheritedMap[slot]) {
                    return <div key={slot} />;
                  }
                  const currentAdv = advLevelMap[slot] ?? 0;
                  const availableTargets = ADV_TARGET_OPTIONS.filter((option) => option.value > currentAdv);
                  return (
                    <SelectMenu
                      key={slot}
                      value={advTargetMap[slot]}
                      options={availableTargets}
                      placeholder="상급"
                      ariaLabel={`${slot} 상급 재련 목표 선택`}
                      onChange={(val) => handleAdvTargetChange(slot, val === undefined ? undefined : Number(val))}
                      variant="purple"
                      fullWidth
                      compact
                      align="center"
                      clearable
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* 종합 아이템 레벨 요약 */}
          {charItemLevel != null && (
            <div className="mt-2 text-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">종합 아이템 레벨 </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {charItemLevel.toFixed(2)}
              </span>
              {targetTotalItemLevel != null && (
                <>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="font-semibold text-la-gold-dark dark:text-la-gold">
                    {targetTotalItemLevel.toFixed(2)}
                  </span>
                  <span className="text-green-500 dark:text-green-400 ml-1 text-xs">
                    (+{(targetTotalItemLevel - charItemLevel).toFixed(2)})
                  </span>
                </>
              )}
            </div>
          )}

        </GlassCard>

        {/* ── 일반 재련 설정 ── */}
        {hasResult && (
          <GlassCard className="p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">일반 재련 설정</p>
            <div className="flex flex-wrap items-center gap-3">
              {hasBookSteps && (
                <Toggle
                  label={`책 ${useBook ? 'ON' : 'OFF'}`}
                  active={useBook}
                  color="gold"
                  badge={hasPrices && isCheapest(true, useBreath) && !useBook ? '최적' : undefined}
                  onClick={() => setUseBook((b) => !b)}
                />
              )}
              <Toggle
                label={`숨결 ${useBreath ? 'ON' : 'OFF'}`}
                active={useBreath}
                color="blue"
                badge={hasPrices && isCheapest(useBook, true) && !useBreath ? '최적' : undefined}
                onClick={() => setUseBreath((b) => !b)}
              />
              {hasPrices && (
                <button
                  onClick={() => { setUseBook(cheapest.useBook); setUseBreath(cheapest.useBreath); }}
                  className="text-xs text-green-600 dark:text-green-400 underline underline-offset-2 hover:opacity-70"
                >
                  최적 세팅 (책 {cheapest.useBook ? 'ON' : 'OFF'} / 숨결 {cheapest.useBreath ? 'ON' : 'OFF'})
                </button>
              )}
              <div className="ml-auto inline-flex rounded-full border border-gray-200 dark:border-white/10 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setCostMode('average')}
                  className={`px-3 py-1.5 transition-colors ${
                    costMode === 'average'
                      ? 'bg-la-gold/20 text-la-gold-dark dark:text-la-gold'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  평균
                </button>
                <button
                  onClick={() => setCostMode('ceiling')}
                  className={`px-3 py-1.5 transition-colors ${
                    costMode === 'ceiling'
                      ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  장기백
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* ── 상급 재련 설정 ── */}
        {hasAnyAdvSlotAvailable && (() => {
          const hasEnhancedStage = activeAdvSlots.some((s) => (advTargetMap[s] ?? 0) > 20);
          const rows: { label: string; opt: AdvTurnOption; set: (v: AdvTurnOption) => void; optimal: AdvTurnOption }[] = [
            { label: '일반턴',  opt: advNormalOpt,   set: setAdvNormalOpt,   optimal: cheapestAdv.normalOpt   },
            { label: '선조턴',  opt: advAncestorOpt, set: setAdvAncestorOpt, optimal: cheapestAdv.ancestorOpt },
            ...(hasEnhancedStage
              ? [{ label: '강화선조', opt: advEnhancedOpt, set: setAdvEnhancedOpt, optimal: cheapestAdv.enhancedOpt }]
              : []),
          ];
          return (
            <GlassCard className="p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">상급 재련 설정</p>
              <div className="space-y-2">
                {rows.map(({ label, opt, set, optimal }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-14 shrink-0">{label}</span>
                    <div className="flex gap-1">
                      {ADV_TURN_OPTIONS.map((o) => (
                        <button
                          key={o}
                          onClick={() => set(o)}
                          className={`relative px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                            opt === o
                              ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40'
                              : 'bg-transparent text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10'
                          }`}
                        >
                          {ADV_TURN_OPTION_LABELS[o]}
                          {hasPrices && optimal === o && opt !== o && (
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-green-500 text-white rounded-full px-1 leading-4">최적</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {hasPrices && hasAdvResult && (
                <button
                  onClick={applyCheapestAdv}
                  className="mt-3 text-xs text-green-600 dark:text-green-400 underline underline-offset-2 hover:opacity-70"
                >
                  최적 세팅 적용 (일반{ADV_TURN_OPTION_LABELS[cheapestAdv.normalOpt]} / 선조{ADV_TURN_OPTION_LABELS[cheapestAdv.ancestorOpt]}{hasEnhancedStage ? ` / 강화선조${ADV_TURN_OPTION_LABELS[cheapestAdv.enhancedOpt]}` : ''})
                </button>
              )}
            </GlassCard>
          );
        })()}

        {hasAnyResult && (
          <>
            {/* ── 합산 견적 ── */}
            <GlassCard className="p-4 border border-la-gold/20">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
                강화 견적 합계{hasOwnedInput && hasPrices && <span className="ml-1 font-normal text-orange-500 dark:text-orange-400">(추가 구매 기준)</span>}
              </p>
              <div className={`grid gap-4 ${hasResult && hasAdvResult ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {hasResult && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">일반 재련</p>
                    <p className="text-lg font-bold text-la-gold-dark dark:text-la-gold">
                      {hasPrices
                        ? formatGold(totals.directGold + (hasOwnedInput ? normalShortfallMatGold : totals.matGold))
                        : formatGold(totals.directGold)}
                    </p>
                  </div>
                )}
                {hasAdvResult && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">상급 재련</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {hasPrices
                        ? formatGold(advTotals.totalDirectGold + (hasOwnedInput ? shortfallMatGold - normalShortfallMatGold : advTotals.totalMatGold))
                        : formatGold(advTotals.totalDirectGold)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{hasResult && hasAdvResult ? '총합' : '합계'}</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {hasPrices
                      ? formatGold(totals.directGold + advTotals.totalDirectGold + (hasOwnedInput ? shortfallMatGold : totals.matGold + advTotals.totalMatGold))
                      : formatGold(totals.directGold + advTotals.totalDirectGold)}
                  </p>
                  {totals.silver > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      실링 {formatSilver(totals.silver)}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* ── 일반 재련 섹션 ── */}
            {hasResult && (
              <>
            {/* ── 슬롯별 소계 (2개 이상 선택 시) ── */}
            {activeSlots.length >= 2 && (
              <GlassCard className="p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
                  슬롯별 예상 비용
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200/40 dark:border-white/8">
                      <th className="text-left py-2 text-xs font-medium text-gray-400">슬롯</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-400">구간</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-400">기대 시도</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-400">총 비용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSlots.map((slot) => {
                      const t = slotTotals.get(slot);
                      const fromLvl = slotCurrentLevel[slot];
                      if (!t) return null;
                      return (
                        <tr key={slot} className="border-b border-gray-100/30 dark:border-white/5 last:border-0">
                          <td className="py-2 font-medium text-gray-900 dark:text-white">{slot}</td>
                          <td className="py-2 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                            {fromLvl}→{targetMap[slot]}강
                          </td>
                          <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                            {t.exp.toFixed(1)}트
                          </td>
                          <td className="py-2 text-right tabular-nums font-semibold text-la-gold-dark dark:text-la-gold">
                            {hasPrices ? formatGold(t.totalGold) : formatGold(t.directGold)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* 합계 행 */}
                    <tr className="border-t border-gray-200/60 dark:border-white/10 bg-gray-100/80 dark:bg-white/[0.04]">
                      <td colSpan={3} className="py-2 font-semibold text-gray-700 dark:text-gray-300">합계</td>
                      <td className="py-2 text-right tabular-nums font-bold text-la-gold-dark dark:text-la-gold">
                        {hasPrices ? formatGold(totals.totalGold) : formatGold(totals.directGold)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </GlassCard>
            )}

            {/* ── 예상 총 비용 요약 ── */}
            <GlassCard className="p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
                예상 총 비용{activeSlots.length >= 2 ? ' (전체)' : ''}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">총 기대 시도</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {totals.exp.toFixed(1)}
                    <span className="text-sm font-normal text-gray-400 ml-0.5">트</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">직접 골드</p>
                  <p className="text-xl font-bold text-la-gold-dark dark:text-la-gold">
                    {formatGold(totals.directGold)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">
                    {hasOwnedInput ? '추가 재료비' : '재료 비용'}
                  </p>
                  <p className="text-xl font-bold text-la-gold-dark dark:text-la-gold">
                    {hasPrices ? formatGold(hasOwnedInput ? normalShortfallMatGold : totals.matGold) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">합계</p>
                  <p className="text-xl font-bold text-la-gold-dark dark:text-la-gold">
                    {hasPrices ? formatGold(totals.directGold + (hasOwnedInput ? normalShortfallMatGold : totals.matGold)) : '—'}
                  </p>
                  {totals.silver > 0 && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      실링 {formatSilver(Math.round(totals.silver))}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* ── 단계별 테이블 ── */}
            <GlassCard className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200/50 dark:border-white/8">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">단계</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">기대 시도</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">직접 골드</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">재료 비용</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">소계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSlots.map((slot) => {
                      const data = perSlotStepData.get(slot) ?? [];
                      return (
                        <React.Fragment key={slot}>
                          {activeSlots.length > 1 && (
                            <tr className="bg-gray-50/80 dark:bg-white/5">
                              <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {slot} · {slotCurrentLevel[slot]}→{targetMap[slot]}강
                              </td>
                            </tr>
                          )}
                          {data.map(({ step, exp, directGold, matGold, silver, totalGold }) => (
                            <tr
                              key={`${slot}-${step.from}`}
                              className="border-b border-gray-100/40 dark:border-white/5 last:border-0 hover:bg-gray-50/60 dark:hover:bg-white/3 transition-colors"
                            >
                              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                                {step.from}→{step.from + 1}강
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                {exp.toFixed(1)}트
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                <div>{formatGold(directGold)}</div>
                                {silver > 0 && (
                                  <div className="text-xs text-gray-400">{formatSilver(Math.round(silver))} 실링</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                {priceLoading ? <span className="text-gray-300 dark:text-gray-600 animate-pulse">—</span> : formatGold(matGold)}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums font-semibold text-la-gold-dark dark:text-la-gold">
                                {priceLoading ? <span className="text-gray-300 dark:text-gray-600 animate-pulse">—</span> : formatGold(totalGold)}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
              </>
            )}

            {/* ── 상급 재련 섹션 ── */}
            {hasAdvResult && (
              <>
                <GlassCard className="p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
                    상급 재련 예상 비용
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">총 기대 시도</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {advTotals.totalAttempts.toFixed(1)}
                        <span className="text-sm font-normal text-gray-400 ml-0.5">회</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">직접 골드</p>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {formatGold(advTotals.totalDirectGold)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">재료 비용</p>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {hasPrices ? formatGold(advTotals.totalMatGold) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">합계</p>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {hasPrices ? formatGold(advTotals.totalGold) : '—'}
                      </p>
                    </div>
                  </div>
                  {activeAdvSlots.length >= 2 && (
                    <table className="w-full text-sm mt-2 border-t border-gray-200/40 dark:border-white/8 pt-2">
                      <thead>
                        <tr className="border-b border-gray-200/40 dark:border-white/8">
                          <th className="text-left py-2 text-xs font-medium text-gray-400">슬롯</th>
                          <th className="text-right py-2 text-xs font-medium text-gray-400">구간</th>
                          <th className="text-right py-2 text-xs font-medium text-gray-400">기대 시도</th>
                          <th className="text-right py-2 text-xs font-medium text-gray-400">총 비용</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeAdvSlots.map((slot) => {
                          const d = advSlotData.get(slot);
                          if (!d) return null;
                          return (
                            <tr key={slot} className="border-b border-gray-100/30 dark:border-white/5 last:border-0">
                              <td className="py-2 font-medium text-gray-900 dark:text-white">{slot}</td>
                              <td className="py-2 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                                {advLevelMap[slot] ?? 0}→{advTargetMap[slot]}단계
                              </td>
                              <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                {d.totalAttempts.toFixed(1)}회
                              </td>
                              <td className="py-2 text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400">
                                {hasPrices ? formatGold(d.totalGold) : formatGold(d.totalDirectGold)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </GlassCard>
              </>
            )}
          </>
        )}

        {/* ── 보유 재료 입력 ── */}
        {hasAnyResult && (
          <GlassCard className="p-4">
            <button
              onClick={() => setShowOwnedSection((v) => !v)}
              className="flex items-center justify-between w-full"
            >
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                보유 재료 입력
                <span className="ml-1.5 font-normal text-gray-400 dark:text-gray-500">(선택 사항)</span>
              </p>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {showOwnedSection ? '▲' : '▼'}
              </span>
            </button>
            {showOwnedSection && (
              <div className="mt-3 space-y-3 overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                  {Array.from(shortfallData.keys()).map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      {icons[type] && (
                        <img src={icons[type]} alt={type} className="w-6 h-6 rounded shrink-0" />
                      )}
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
                        {type}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={ownedMaterials[type] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                          setOwnedMaterials((prev) => {
                            const next = { ...prev };
                            if (val === undefined) delete next[type];
                            else next[type] = val;
                            return next;
                          });
                        }}
                        placeholder="0"
                        className="w-20 text-xs text-right bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded px-2 py-1 outline-none focus:ring-1 focus:ring-la-gold/40 shrink-0"
                      />
                    </div>
                  ))}
                </div>
                {hasOwnedInput && (
                  <button
                    onClick={() => setOwnedMaterials({})}
                    className="text-xs text-gray-400 hover:text-red-400 dark:hover:text-red-400 transition-colors underline underline-offset-2"
                  >
                    전체 초기화
                  </button>
                )}
              </div>
            )}
          </GlassCard>
        )}

        {/* ── 재료 시세 ── */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              재련 재료 시세
            </p>
            {priceLoading && <span className="text-xs text-gray-400 animate-pulse">조회 중…</span>}
            {priceError && <span className="text-xs text-red-400">{priceError}</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200/40 dark:border-white/8">
                  <th className="text-left py-2 text-xs font-medium text-gray-400">재료</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400">예상 수량</th>
                  {hasOwnedInput && (
                    <>
                      <th className="text-right py-2 text-xs font-medium text-gray-400">보유</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-400">부족</th>
                    </>
                  )}
                  <th className="text-right py-2 text-xs font-medium text-gray-400">단가</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400">
                    {hasOwnedInput ? '추가 구매비' : '재료비'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const combinedTypes = Array.from(
                    new Set([...Array.from(allMaterials.keys()), ...Array.from(advTotalMaterials.keys())])
                  );
                  if (combinedTypes.length === 0) {
                    return (
                      <tr>
                        <td colSpan={hasOwnedInput ? 6 : 4} className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                          장비를 선택하고 목표 강을 설정하면 재료가 표시됩니다
                        </td>
                      </tr>
                    );
                  }
                  return combinedTypes.map((type) => {
                    const normalQty = totalMaterials.get(type) ?? 0;
                    const advQty = advTotalMaterials.get(type) ?? 0;
                    const activeQty = normalQty + advQty;
                    const isActive = activeQty > 0;
                    const displayQty = isActive ? activeQty : (allMaterials.get(type) ?? 0);
                    const isUntradeable = MARKET_SEARCH[type]?.untradeable;
                    const price = prices[type];
                    const hasPrice = price !== undefined && price > 0;
                    const owned = ownedMaterials[type] ?? 0;
                    const shortfall = shortfallData.get(type)?.shortfall ?? activeQty;
                    const costQty = hasOwnedInput ? shortfall : displayQty;
                    const totalCost = isActive && hasPrice ? costQty * price : null;
                    const priceStr = isUntradeable
                      ? '거래불가'
                      : priceLoading
                        ? '…'
                        : hasPrice
                          ? `${price < 1 ? price.toFixed(2) : price < 10 ? price.toFixed(1) : Math.round(price).toLocaleString()}G`
                          : '—';
                    return (
                      <tr key={type} className={`border-b border-gray-100/30 dark:border-white/5 last:border-0 ${!isActive ? 'opacity-35' : ''}`}>
                        <td className="py-2 text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            {icons[type] && <img src={icons[type]} alt={type} className="w-7 h-7 rounded" />}
                            <span>{type}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                          {Math.ceil(displayQty).toLocaleString()}
                        </td>
                        {hasOwnedInput && (
                          <>
                            <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">
                              {isActive ? Math.min(owned, Math.ceil(activeQty)).toLocaleString() : '—'}
                            </td>
                            <td className="py-2 text-right tabular-nums text-orange-500 dark:text-orange-400">
                              {isActive ? Math.ceil(shortfall).toLocaleString() : '—'}
                            </td>
                          </>
                        )}
                        <td className="py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">
                          {priceStr}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium text-la-gold-dark dark:text-la-gold">
                          {priceLoading ? '…' : totalCost != null ? formatGold(totalCost) : '—'}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </GlassCard>

      </main>
    </div>
  );
};

export default Enhancement;
