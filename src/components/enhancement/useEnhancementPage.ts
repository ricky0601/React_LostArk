import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ADV_ARMOR_STAGES,
  ADV_STAGE_XP,
  ADV_WEAPON_STAGES,
  calcAdvExpectedAttempts,
  calcExpectedAttempts,
  getAdvAttemptMaterials,
  getAttemptMaterials,
  type AdvTurnOption,
  type EnhancementStep,
  type MaterialType,
} from '../../data/enhancement';
import {
  ALL_SLOTS,
  calcStepData,
  findCheapest,
  findCheapestAdv,
  getStepsForSlot,
  ITEM_LEVEL_PER_STEP,
  ITEM_LEVEL_SLOTS,
  supportsAdvancedHoning,
  type SlotName,
} from './enhancementModel';
import { useEnhancementCharacter } from './useEnhancementCharacter';
import { useEnhancementMarket } from './useEnhancementMarket';

export const useEnhancementPage = () => {
  // ── 캐릭터 검색 ─────────────────────────────
  const [charInput, setCharInput] = useState('');
  const charInputRef = useRef<HTMLInputElement>(null);
  const {
    armorMap,
    weaponLevel,
    slotIconMap,
    slotInheritedMap,
    advLevelMap,
    charItemLevel,
    charLoading,
    charError,
    clearCharacterError,
    searchCharacter: fetchCharacterEnhancement,
  } = useEnhancementCharacter();
  const [advTargetMap, setAdvTargetMap] = useState<Partial<Record<SlotName, number>>>({});

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
  const { prices, icons, priceLoading, priceError, loadPrices } = useEnhancementMarket();
  const autoApplied = useRef(false);
  const autoAppliedAdv = useRef(false);

  // ── 보유 재료 ────────────────────────────────
  const [ownedMaterials, setOwnedMaterials] = useState<Partial<Record<MaterialType, number>>>({});
  const [showOwnedSection, setShowOwnedSection] = useState(false);

  // ── 슬롯별 현재 레벨 ─────────────────────────
  const slotCurrentLevel = useMemo<Record<SlotName, number>>(() => ({
    '무기': weaponLevel ?? 10,
    '완갑': armorMap['완갑'] ?? 0,
    '투구': armorMap['투구'] ?? 10,
    '어깨': armorMap['어깨'] ?? 10,
    '상의': armorMap['상의'] ?? 10,
    '하의': armorMap['하의'] ?? 10,
    '장갑': armorMap['장갑'] ?? 10,
  }), [weaponLevel, armorMap]);

  const slotHasData = useMemo<Record<SlotName, boolean>>(() => ({
    '무기': weaponLevel !== undefined,
    '완갑': armorMap['완갑'] !== undefined,
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
    setAdvTargetMap({});
    setTargetMap({});
    await fetchCharacterEnhancement(name);
  }, [fetchCharacterEnhancement]);

  const handleSearch = () => searchCharacter(charInput);

  const handleResetCharSearch = (): void => {
    clearCharacterError();
    charInputRef.current?.focus();
    charInputRef.current?.select();
  };

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
        const exp = calcExpectedAttempts(step, true, true);
        const mats = getAttemptMaterials(step, true, true);
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
      if (!supportsAdvancedHoning(s)) return false;
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
      if (!(ITEM_LEVEL_SLOTS as readonly string[]).includes(slot)) return sum;
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
    (s) => supportsAdvancedHoning(s) && slotHasData[s] && !slotInheritedMap[s] && (advLevelMap[s] ?? 0) < 40,
  );

  // ─────────────────────────────────────────────
  return {
    charInput,
    setCharInput,
    charInputRef,
    armorMap,
    weaponLevel,
    slotIconMap,
    slotInheritedMap,
    advLevelMap,
    advTargetMap,
    setAdvTargetMap,
    charItemLevel,
    charLoading,
    charError,
    targetMap,
    setTargetMap,
    useBook,
    setUseBook,
    useBreath,
    setUseBreath,
    costMode,
    setCostMode,
    advNormalOpt,
    setAdvNormalOpt,
    advAncestorOpt,
    setAdvAncestorOpt,
    advEnhancedOpt,
    setAdvEnhancedOpt,
    prices,
    icons,
    priceLoading,
    priceError,
    loadPrices,
    ownedMaterials,
    setOwnedMaterials,
    showOwnedSection,
    setShowOwnedSection,
    slotCurrentLevel,
    slotHasData,
    activeSlots,
    cheapest,
    handleSearch,
    handleResetCharSearch,
    handleTargetChange,
    perSlotStepData,
    slotTotals,
    totals,
    totalMaterials,
    allMaterials,
    activeAdvSlots,
    cheapestAdv,
    targetTotalItemLevel,
    advSlotData,
    advTotals,
    advTotalMaterials,
    shortfallData,
    shortfallMatGold,
    normalShortfallMatGold,
    handleAdvTargetChange,
    applyCheapestAdv,
    hasPrices,
    isCheapest,
    hasBookSteps,
    hasResult,
    hasAdvResult,
    hasAnyResult,
    hasOwnedInput,
    hasAnyAdvSlotAvailable,
  };
};

export type EnhancementPageModel = ReturnType<typeof useEnhancementPage>;
