import React, { useState, useEffect, useMemo } from 'react';
import { LoadingIndicator } from '../Loading';
import type { CharacterProfile, EngravingData, GemData, ArkPassiveData, CardData, EquipmentItem, ArkGridData } from '../../types/lostark';
import { fetchEngravings, fetchGems, fetchArkPassive, fetchCards, fetchEquipment, fetchArkGrid } from '../../utils/api';
import { calcLopecDelta, type CharStats } from '../../utils/lopecSimulator';
import { roundToTwoDecimals } from '../../utils/numberFormat';
import { stripGemName } from '../../data/specScore/gems';
import { parseEquipmentList, type EquipmentState } from '../../utils/equipmentState';
import {
  parseAccessoryList,
  parseStoneState,
  parseBraceletState,
  type AccessoryState,
  type StoneState,
  type BraceletState,
} from '../../utils/polishState';
import { LOPEC_ENGRAVING_TOTAL_EFFECTS, type EquipSlot } from '../../data/specScore/lopecCoefficients';
import {
  ACCESSORY_SLOTS,
  POLISH_OPTIONS,
  BRACELET_OPTIONS,
  BRACELET_STAT_TYPES,
  EMPTY_BRACELET_STAT,
  findPolishOption,
  findBraceletOption,
  type AccessorySlot,
  type BraceletOption,
  type BraceletStatOption,
  type BraceletStatType,
  type PolishOption,
} from '../../data/specScore/polishOptions';
import {
  buildModifiedArkGrid,
  type ArkGridCoreMod,
  type ArkGridGemEditTarget,
  type ArkGridGemMod,
} from './arkGridSimulatorState';
import { ArkGridSimulatorPanel } from './ArkGridSimulatorPanel';

interface Props {
  profile: CharacterProfile;
}

interface RawData {
  engravings: EngravingData;
  gems: GemData;
  arkPassive?: ArkPassiveData;
  arkGrid: ArkGridData | null;
  cards?: CardData;
  equip: Partial<Record<EquipSlot, EquipmentState>>;
  accessories: Partial<Record<AccessorySlot, AccessoryState>>;
  stone: StoneState | null;
  bracelet: BraceletState | null;
  charStats: CharStats;
}

type GemMod = { Level?: number; Tooltip?: string };
type EngMod = { Level?: number; AbilityStoneLevel?: number | null };
type AwakeningMod = { Level?: number };
type EquipMod = { normalLevel?: number; advancedLevel?: number; tier?: string };
type PolishMod = { polishOptions?: [string, string, string] }; // labels
type BraceletMod = {
  stats?: [BraceletStatOption, BraceletStatOption, BraceletStatOption, BraceletStatOption];
  options?: [string, string, string, string];
};
type StoneSlotMod = { name?: string; level?: number };

interface Mods {
  gems: Record<number, GemMod>;
  engs: Record<string, EngMod>;
  awakenings: Record<string, AwakeningMod>; // by class awakening name
  equip: Partial<Record<EquipSlot, EquipMod>>;
  polish: Partial<Record<AccessorySlot, PolishMod>>;
  bracelet?: BraceletMod;
  stone: Record<number, StoneSlotMod>;
  arkGrid: Record<number, ArkGridCoreMod>;
}

type ActiveCategory = 'all' | 'core' | 'gear' | 'accessories' | 'systems';

const EMPTY_MODS: Mods = { gems: {}, engs: {}, awakenings: {}, equip: {}, polish: {}, stone: {}, arkGrid: {} };

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '무기',
  helmet: '투구',
  shoulder: '어깨',
  armor: '상의',
  pants: '하의',
  gloves: '장갑',
};

const SLOT_ORDER: EquipSlot[] = ['weapon', 'helmet', 'shoulder', 'armor', 'pants', 'gloves'];
const TIER_OPTIONS = ['유물', '고대', '전율'];
const DEALER_STONE_ENGRAVING_OPTIONS = [
  '원한',
  '아드레날린',
  '예리한 둔기',
  '저주받은 인형',
  '타격의 대가',
  '돌격대장',
  '질량 증가',
  '기습의 대가',
  '결투의 대가',
  '바리케이드',
  '안정된 상태',
  '달인의 저력',
  '속전속결',
  '슈퍼 차지',
  '에테르 포식자',
  '마나 효율 증가',
  '정밀 단도',
  '약자 무시',
  '추진력',
  '시선 집중',
  '부러진 뼈',
  '실드 관통',
  '승부사',
  '분쇄의 주먹',
].filter((name) => LOPEC_ENGRAVING_TOTAL_EFFECTS[name] !== undefined);
const parseNumberText = (value: string | undefined): number =>
  Number(String(value ?? '0').replace(/,/g, '')) || 0;

const stripTooltipText = (value: string): string =>
  value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const getPolishGradeColor = (grade: PolishOption['grade']): string => {
  if (grade === '상') return 'text-amber-400 bg-amber-500/15';
  if (grade === '중') return 'text-purple-400 bg-purple-500/15';
  return 'text-blue-400 bg-blue-500/15';
};

// 광휘 보석 type 강제 override용 Tooltip 합성
const synthGlowTooltip = (type: 'damage' | 'cooldown' | 'support'): string => {
  if (type === 'damage') return '특정 스킬의 피해 36% 증가';
  if (type === 'cooldown') return '특정 스킬의 재사용 대기시간 20% 감소';
  return '아군 공격력 강화 효과 증가';
};

/** weapon equipment tooltip JSON에서 "기본 효과" 무기 공격력 수치 추출 */
const extractWeaponAttack = (weapon: EquipmentItem | undefined): number => {
  if (!weapon) return 0;
  try {
    const obj = JSON.parse(weapon.Tooltip);
    for (const key of Object.keys(obj)) {
      const el = obj[key];
      if (el?.type === 'ItemPartBox' && el.value) {
        const header = el.value.Element_000 ?? '';
        const content: string = el.value.Element_001 ?? '';
        if (/기본\s*효과/.test(header)) {
          const m = content.match(/무기\s*공격력\s*\+?([\d,]+)/);
          if (m) {
            const weaponAttack = parseInt(m[1].replace(/,/g, ''), 10);
            return weaponAttack;
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof SyntaxError) return 0;
    throw error;
  }
  return 0;
};

const extractPureBaseAttack = (stats: CharacterProfile['Stats']): number | undefined => {
  const attackStat = stats.find((s) => s.Type === '공격력');
  const tooltip = stripTooltipText((attackStat?.Tooltip ?? []).join(' '));
  const match = tooltip.match(/기본\s*공격력은\s*([\d,]+)/);
  if (!match) return undefined;

  const pureBaseAttack = parseNumberText(match[1]);
  return pureBaseAttack > 0 ? pureBaseAttack : undefined;
};

const extractStoneBaseAttackBonusPercent = (stone: EquipmentItem | undefined): number | undefined => {
  if (!stone) return undefined;
  const tooltip = stripTooltipText(stone.Tooltip);
  const match = tooltip.match(/기본\s*공격력\s*\+([\d.]+)\s*%/);
  if (!match) return undefined;

  const bonusPercent = Number(match[1]);
  return bonusPercent > 0 ? bonusPercent : undefined;
};

const detectCurrentType = (tooltip: string | undefined): 'damage' | 'cooldown' | 'support' | 'unknown' => {
  if (!tooltip) return 'unknown';
  const t = tooltip.replace(/<[^>]+>/g, ' ');
  if (/피해\s*\d+(?:\.\d+)?\s*%?\s*증가/.test(t)) return 'damage';
  if (/재사용\s*대기시간\s*\d+(?:\.\d+)?\s*%?\s*감소/.test(t)) return 'cooldown';
  if (/아군.*(?:공격력|피해량|보호막|치유).*강화|지원\s*효과/.test(t)) return 'support';
  return 'unknown';
};

const SpecScoreSimulator: React.FC<Props> = ({ profile }) => {
  const [raw, setRaw] = useState<RawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mods, setMods] = useState<Mods>(EMPTY_MODS);
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>('all');
  const [editingArkGridGem, setEditingArkGridGem] = useState<ArkGridGemEditTarget | null>(null);
  const [arkGridGemDraft, setArkGridGemDraft] = useState<Required<ArkGridGemMod> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMods(EMPTY_MODS);
    setEditingArkGridGem(null);
    setArkGridGemDraft(null);
    Promise.all([
      fetchEngravings(profile.CharacterName),
      fetchGems(profile.CharacterName),
      fetchArkPassive(profile.CharacterName).catch(() => undefined),
      fetchArkGrid(profile.CharacterName),
      fetchCards(profile.CharacterName).catch(() => undefined),
      fetchEquipment(profile.CharacterName).catch(() => [] as EquipmentItem[]),
    ])
      .then(([engravings, gems, arkPassive, arkGrid, cards, equipment]) => {
        if (cancelled) return;
        const equip = parseEquipmentList(equipment);
        const accessories = parseAccessoryList(equipment);
        const stoneItem = equipment.find((e) => e.Type === '어빌리티 스톤');
        const stone = parseStoneState(stoneItem);
        const bracelet = parseBraceletState(equipment.find((e) => e.Type === '팔찌'));
        const weaponItem = equipment.find((e) => e.Type === '무기');
        const W = extractWeaponAttack(weaponItem);
        const baseAttack = parseNumberText(profile.Stats?.find((s) => s.Type === '공격력')?.Value);
        const pureBaseAttack = extractPureBaseAttack(profile.Stats);
        const stoneBaseAttackBonusPercent = extractStoneBaseAttackBonusPercent(stoneItem);
        setRaw({
          engravings,
          gems,
          arkPassive,
          arkGrid,
          cards,
          equip,
          accessories,
          stone,
          bracelet,
          charStats: { W, baseAttack, pureBaseAttack, stoneBaseAttackBonusPercent },
        });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error(err);
        setError('데이터를 불러올 수 없습니다');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.CharacterName, profile.CombatPower, profile.Stats]);

  const modifiedRaw = useMemo(() => {
    if (!raw) return null;
    const modGems: GemData = {
      ...raw.gems,
      Gems:
        raw.gems.Gems?.map((g) => {
          const m = mods.gems[g.Slot];
          if (!m) return g;
          return { ...g, Level: m.Level ?? g.Level, Tooltip: m.Tooltip ?? g.Tooltip };
        }) ?? null,
    };
    const originalStoneNames = new Set(raw.stone?.engravings.map((eng) => eng.name) ?? []);
    const stoneSelections = raw.stone?.engravings.map((eng, index) => ({
      name: mods.stone[index]?.name ?? eng.name,
      level: mods.stone[index]?.level ?? eng.level,
    })) ?? [];
    const rawArkPassiveEffects = raw.engravings.ArkPassiveEffects ?? [];
    const modifiedArkPassiveEffects = rawArkPassiveEffects.map((e) => {
      const m = mods.engs[e.Name];
      const selectedStone = stoneSelections.find((stone) => stone.name === e.Name);
      const stoneLevel = selectedStone
        ? selectedStone.level
        : originalStoneNames.has(e.Name)
          ? null
          : e.AbilityStoneLevel;
      return {
        ...e,
        Level: m?.Level ?? e.Level,
        AbilityStoneLevel:
          m?.AbilityStoneLevel !== undefined ? m.AbilityStoneLevel : stoneLevel,
      };
    });
    for (const stone of stoneSelections) {
      if (modifiedArkPassiveEffects.some((effect) => effect.Name === stone.name)) continue;
      modifiedArkPassiveEffects.push({
        AbilityStoneLevel: stone.level,
        Description: '',
        Grade: '',
        Level: 0,
        Name: stone.name,
      });
    }
    const modEng: EngravingData = {
      ...raw.engravings,
      ArkPassiveEffects: modifiedArkPassiveEffects,
    };
    // 직업 깨달음 modifications: arkPassive.Points에서 깨달음 포인트 조정
    const modArkPassive: ArkPassiveData | undefined = raw.arkPassive
      ? (() => {
          const awkMod = Object.values(mods.awakenings).find((m) => m.Level !== undefined);
          if (!awkMod || awkMod.Level === undefined) return raw.arkPassive;
          // 단계별 포인트 추정: 1단계≈8, 2단계≈14, 3단계≈22, 4단계≈30
          const pointTable: Record<number, number> = { 1: 8, 2: 14, 3: 22, 4: 30 };
          const targetPoints = pointTable[awkMod.Level] ?? 30;
          return {
            ...raw.arkPassive,
            Points:
              raw.arkPassive.Points?.map((p) =>
                p.Name.includes('깨달음') ? { ...p, Value: targetPoints } : p,
              ) ?? null,
          };
        })()
      : undefined;
    // 장비 modifications: 슬롯별 normalLevel/advancedLevel/tier 변경
    const modEquip: Partial<Record<EquipSlot, EquipmentState>> = {};
    for (const slot of SLOT_ORDER) {
      const cur = raw.equip[slot];
      if (!cur) continue;
      const m = mods.equip[slot];
      modEquip[slot] = m
        ? {
            ...cur,
            normalLevel: m.normalLevel ?? cur.normalLevel,
            advancedLevel: cur.isInherited ? cur.advancedLevel : (m.advancedLevel ?? cur.advancedLevel),
            tier: m.tier ?? cur.tier,
          }
        : cur;
    }
    // 장신구 연마효과 modifications
    const modAccessories: Partial<Record<AccessorySlot, AccessoryState>> = {};
    for (const slot of ACCESSORY_SLOTS) {
      const cur = raw.accessories[slot];
      if (!cur) continue;
      const m = mods.polish[slot];
      if (!m?.polishOptions) {
        modAccessories[slot] = cur;
        continue;
      }
      const newOptions = m.polishOptions.map((label, i) => findPolishOption(label) ?? cur.polishOptions[i]) as [PolishOption, PolishOption, PolishOption];
      modAccessories[slot] = { ...cur, polishOptions: newOptions };
    }
    const rawBracelet = raw.bracelet;
    const modBracelet: BraceletState | null = rawBracelet
      ? {
          ...rawBracelet,
          stats: mods.bracelet?.stats ?? rawBracelet.stats,
          options: mods.bracelet?.options
            ? (mods.bracelet.options.map((label, i) => findBraceletOption(label) ?? rawBracelet.options[i]) as [BraceletOption, BraceletOption, BraceletOption, BraceletOption])
            : rawBracelet.options,
        }
      : null;
    const modArkGrid = buildModifiedArkGrid(raw.arkGrid, mods.arkGrid);

    return { engravings: modEng, gems: modGems, arkPassive: modArkPassive, arkGrid: modArkGrid, cards: raw.cards, equip: modEquip, accessories: modAccessories, bracelet: modBracelet };
  }, [raw, mods]);

  const currentScore = useMemo(() => parseNumberText(profile.CombatPower ?? undefined), [profile.CombatPower]);

  const sim = useMemo(() => {
    if (currentScore <= 0 || !raw || !modifiedRaw) return null;
    // lopec 추출 계수만 사용 (정확). 카드/깨달음 변경은 별도 lopec 측정 후 추가 예정.
    const lopecSimulated = calcLopecDelta(
      currentScore,
      raw.engravings,
      modifiedRaw.engravings,
      raw.gems,
      modifiedRaw.gems,
      raw.equip,
      modifiedRaw.equip,
      raw.accessories,
      modifiedRaw.accessories,
      raw.charStats,
      raw.arkGrid,
      modifiedRaw.arkGrid,
      raw.bracelet,
      modifiedRaw.bracelet,
    );
    return {
      current: roundToTwoDecimals(currentScore),
      simulated: roundToTwoDecimals(lopecSimulated),
      delta: roundToTwoDecimals(lopecSimulated - currentScore),
    };
  }, [currentScore, raw, modifiedRaw]);

  const hasMods =
    Object.keys(mods.gems).length > 0 ||
    Object.keys(mods.engs).length > 0 ||
    Object.keys(mods.awakenings).length > 0 ||
    Object.keys(mods.equip).length > 0 ||
    Object.keys(mods.polish).length > 0 ||
    Object.keys(mods.stone).length > 0 ||
    Boolean(mods.bracelet) ||
    Object.keys(mods.arkGrid).length > 0;

  if (loading) {
    return <LoadingIndicator message="시뮬레이션 데이터 로딩 중..." className="animate-none" />;
  }
  if (error || !raw || currentScore <= 0) {
    return (
      <div className="glass-card p-6 text-center text-red-500 dark:text-red-400">
        {error ?? '데이터 없음'}
      </div>
    );
  }

  const updateGemMod = (slot: number, patch: GemMod): void => {
    setMods((prev) => ({
      ...prev,
      gems: { ...prev.gems, [slot]: { ...prev.gems[slot], ...patch } },
    }));
  };

  const updateEngMod = (name: string, patch: EngMod): void => {
    setMods((prev) => ({
      ...prev,
      engs: { ...prev.engs, [name]: { ...prev.engs[name], ...patch } },
    }));
  };

  const updateEquipMod = (slot: EquipSlot, patch: EquipMod): void => {
    const cur = raw.equip[slot];
    const safePatch = cur?.isInherited && patch.advancedLevel !== undefined
      ? { ...patch, advancedLevel: undefined }
      : patch;
    setMods((prev) => ({
      ...prev,
      equip: { ...prev.equip, [slot]: { ...prev.equip[slot], ...safePatch } },
    }));
  };

  const updatePolishMod = (slot: AccessorySlot, optionIdx: 0 | 1 | 2, label: string): void => {
    setMods((prev) => {
      const curRaw = raw.accessories[slot];
      const curLabels = prev.polish[slot]?.polishOptions ??
        (curRaw ? ([curRaw.polishOptions[0].label, curRaw.polishOptions[1].label, curRaw.polishOptions[2].label] as [string, string, string]) : (['없음', '없음', '없음'] as [string, string, string]));
      const next: [string, string, string] = [...curLabels] as [string, string, string];
      next[optionIdx] = label;
      return {
        ...prev,
        polish: { ...prev.polish, [slot]: { polishOptions: next } },
      };
    });
  };

  const updateBraceletMod = (optionIdx: 0 | 1 | 2 | 3, label: string): void => {
    setMods((prev) => {
      const curLabels = prev.bracelet?.options ??
        (raw.bracelet ? ([raw.bracelet.options[0].label, raw.bracelet.options[1].label, raw.bracelet.options[2].label, raw.bracelet.options[3].label] as [string, string, string, string]) : (['없음', '없음', '없음', '없음'] as [string, string, string, string]));
      const next: [string, string, string, string] = [...curLabels] as [string, string, string, string];
      next[optionIdx] = label;
      return { ...prev, bracelet: { ...prev.bracelet, options: next } };
    });
  };

  const updateBraceletStatMod = (statIdx: 0 | 1 | 2 | 3, patch: Partial<BraceletStatOption>): void => {
    setMods((prev) => {
      const curStats = prev.bracelet?.stats ?? raw.bracelet?.stats ?? ([EMPTY_BRACELET_STAT, EMPTY_BRACELET_STAT, EMPTY_BRACELET_STAT, EMPTY_BRACELET_STAT] as [BraceletStatOption, BraceletStatOption, BraceletStatOption, BraceletStatOption]);
      const next: [BraceletStatOption, BraceletStatOption, BraceletStatOption, BraceletStatOption] = [...curStats] as [BraceletStatOption, BraceletStatOption, BraceletStatOption, BraceletStatOption];
      next[statIdx] = { ...next[statIdx], ...patch };
      return { ...prev, bracelet: { ...prev.bracelet, stats: next } };
    });
  };

  const updateStoneSlotMod = (slotIndex: number, patch: StoneSlotMod): void => {
    setMods((prev) => ({
      ...prev,
      stone: { ...prev.stone, [slotIndex]: { ...prev.stone[slotIndex], ...patch } },
    }));
  };

  /** 일괄 변경: 모든 슬롯의 강화/상재/등급을 동일 값으로 */
  const applyBulkEquip = (patch: EquipMod): void => {
    const next: Partial<Record<EquipSlot, EquipMod>> = {};
    for (const slot of SLOT_ORDER) {
      const cur = raw.equip[slot];
      if (!cur) continue;
      if (cur.isInherited && patch.advancedLevel !== undefined) {
        const { advancedLevel, ...existing } = mods.equip[slot] ?? {};
        if (Object.keys(existing).length > 0) next[slot] = existing;
        continue;
      }
      next[slot] = { ...mods.equip[slot], ...patch };
    }
    setMods((prev) => ({ ...prev, equip: next }));
  };

  const reset = (): void => {
    setMods(EMPTY_MODS);
    setEditingArkGridGem(null);
    setArkGridGemDraft(null);
  };

  /** 보석 일괄 변경 — 모든 광휘 보석을 동일 레벨로 */
  const applyBulkGems = (level: number): void => {
    if (!raw.gems.Gems) return;
    const next: Record<number, GemMod> = {};
    for (const g of raw.gems.Gems) {
      next[g.Slot] = { ...mods.gems[g.Slot], Level: level };
    }
    setMods((prev) => ({ ...prev, gems: next }));
  };

  const updateArkGridCore = (slotIndex: number, patch: ArkGridCoreMod): void => {
    setMods((prev) => ({
      ...prev,
      arkGrid: {
        ...prev.arkGrid,
        [slotIndex]: { ...prev.arkGrid[slotIndex], ...patch },
      },
    }));
  };

  const updateArkGridGem = (target: ArkGridGemEditTarget, baseState: Required<ArkGridGemMod>, patch: ArkGridGemMod): void => {
    setMods((prev) => {
      const currentCore = prev.arkGrid[target.slotIndex] ?? {};
      const currentGems = currentCore.gems ?? {};
      const currentGem = currentGems[target.gemIndex] ?? baseState;
      return {
        ...prev,
        arkGrid: {
          ...prev.arkGrid,
          [target.slotIndex]: {
            ...currentCore,
            gems: {
              ...currentGems,
              [target.gemIndex]: { ...currentGem, ...patch },
            },
          },
        },
      };
    });
  };

  const delta = sim?.delta ?? 0;
  const deltaColor =
    delta > 0
      ? 'text-green-600 dark:text-green-400'
      : delta < 0
        ? 'text-red-500 dark:text-red-400'
        : 'text-gray-500 dark:text-gray-400';

  const itemLevel = parseNumberText(profile.ItemAvgLevel);
  const deltaPercent = sim && sim.current > 0 ? (sim.delta / sim.current) * 100 : 0;
  const equipCount = Object.keys(raw.equip).length;
  const accessoryCount = Object.keys(raw.accessories).length;
  const stoneEngravingOptions = Array.from(new Set([
    ...DEALER_STONE_ENGRAVING_OPTIONS,
    ...(raw.stone?.engravings.map((eng) => eng.name) ?? []),
  ]));
  const arkGridCount = (modifiedRaw?.arkGrid ?? raw.arkGrid)?.Slots?.length ?? 0;
  const categories: Array<{ id: ActiveCategory; label: string; count?: number; countLabel?: string }> = [
    { id: 'all', label: '전체' },
    { id: 'core', label: '각인', count: (raw.engravings.ArkPassiveEffects?.length ?? 0) + (raw.stone?.engravings.length ?? 0) },
    { id: 'gear', label: '보석 & 장비', count: equipCount + (raw.gems.Gems?.length ?? 0) },
    { id: 'accessories', label: '장신구', count: accessoryCount + (raw.bracelet ? 1 : 0) },
    { id: 'systems', label: '아크 그리드', count: arkGridCount },
  ];

  const showSection = (id: ActiveCategory): boolean =>
    activeCategory === 'all' || activeCategory === id;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 점수 헤더 — lopec 스타일 4분할 */}
      <div className="glass-card sticky top-16 z-30 p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">예상 전투력</p>
            <p className="text-2xl font-bold tabular-nums">
              {sim?.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '-'}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">인게임</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">시뮬 전투력</p>
            <p
              className={`text-2xl font-bold tabular-nums ${
                hasMods ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {sim?.simulated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '-'}
            </p>
            <p className={`text-[10px] mt-0.5 ${deltaColor}`}>
              {delta > 0 ? '+' : ''}
              {delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({deltaPercent > 0 ? '+' : ''}
              {deltaPercent.toFixed(2)}%)
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">아이템 레벨</p>
            <p className="text-2xl font-bold tabular-nums text-gray-700 dark:text-gray-300">
              {itemLevel.toFixed(2)}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">평균</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">변화 (Δ)</p>
            <p className={`text-2xl font-bold tabular-nums ${deltaColor}`}>
              {delta > 0 ? '+' : ''}
              {delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">전투력 차이</p>
          </div>
        </div>
        {hasMods && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-white/10 rounded"
            >
              초기화
            </button>
          </div>
        )}
      </div>

      {/* 카테고리 탭 (lopec의 메뉴) */}
      <div className="glass-card p-2">
        <div className="flex gap-1 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
                activeCategory === c.id
                  ? 'bg-la-gold/20 text-la-gold-dark dark:text-la-gold border border-la-gold/50'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {c.label}
              {c.count !== undefined && c.count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({c.countLabel ?? c.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grid 레이아웃 (캐릭터 정보 페이지 패턴) */}
      <div className={`grid grid-cols-1 gap-4 items-start ${activeCategory === 'all' ? 'lg:grid-cols-[2fr_3fr]' : ''}`}>
        {/* 좌측 컬럼 — 각인 / 카드 / 깨달음 */}
        <div className="space-y-4">

      {/* 각인 섹션 */}
      {showSection('core') && (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            공용 각인 ({raw.engravings.ArkPassiveEffects?.length ?? 0}개)
          </h3>
        </div>
        {true && (
          <div className="space-y-1.5">
            {raw.engravings.ArkPassiveEffects?.map((e) => {
              const currentLevel = mods.engs[e.Name]?.Level ?? e.Level;
              return (
                <div
                  key={e.Name}
                  className="flex items-center gap-2 text-xs py-1 border-b border-gray-100 dark:border-white/5 last:border-0"
                >
                  <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                    {e.Name}
                    <span className="ml-1 text-gray-400">{e.Grade}</span>
                  </span>
                  <label className="flex items-center gap-1 text-gray-500">
                    단계
                    <select
                      value={currentLevel}
                      onChange={(ev) =>
                        updateEngMod(e.Name, { Level: Number(ev.target.value) })
                      }
                      className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-0.5 text-xs"
                    >
                      {Array.from({ length: 5 }, (_, i) => i).map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {showSection('core') && (
        <div className="glass-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            어빌리티 스톤
          </h3>
          {raw.stone && raw.stone.engravings.length > 0 ? (
            <div className="flex items-stretch gap-2 py-1">
              <div className="relative w-14 flex-shrink-0">
                <img
                  src={raw.stone.raw.Icon}
                  alt=""
                  className="h-14 w-14 rounded border border-gray-200 dark:border-white/10"
                />
                <span className="absolute bottom-0.5 left-0.5 right-0.5 rounded bg-black/70 text-center text-[9px] font-bold leading-tight text-amber-300">
                  스톤
                </span>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-1 text-[11px]">
                {raw.stone.engravings.map((eng, index) => {
                  const selectedName = mods.stone[index]?.name ?? eng.name;
                  const selectedLevel = mods.stone[index]?.level ?? eng.level;
                  const otherSelectedNames = raw.stone?.engravings
                    .map((stoneEng, stoneIndex) => (stoneIndex === index ? null : (mods.stone[stoneIndex]?.name ?? stoneEng.name)))
                    .filter((name): name is string => name !== null) ?? [];
                  return (
                    <div key={`${eng.name}-${index}`} className="flex items-stretch gap-1">
                      <select
                        value={selectedName}
                        onChange={(ev) => updateStoneSlotMod(index, { name: ev.target.value })}
                        className="min-w-0 flex-1 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
                        title="어빌리티 스톤 각인 선택"
                      >
                        {stoneEngravingOptions.map((name) => (
                          <option key={name} value={name} disabled={otherSelectedNames.includes(name)}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedLevel ?? 0}
                        onChange={(ev) => updateStoneSlotMod(index, { level: Number(ev.target.value) })}
                        className="w-16 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 dark:border-white/10 dark:bg-white/5"
                        title="어빌리티 스톤 단계 선택"
                      >
                        {[0, 1, 2, 3, 4].map((lv) => (
                          <option key={lv} value={lv}>
                            Lv.{lv}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              어빌리티 스톤 정보를 읽을 수 없어 스톤 단계 시뮬레이션을 표시할 수 없습니다.
            </div>
          )}
        </div>
      )}

        </div>
        {/* 우측 컬럼 — 보석 + 장비(추후) */}
        <div className="space-y-4">
          {showSection('gear') && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  보석
                </h3>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-gray-400">일괄 변경</span>
                  {[10, 9, 8, 7, 6].map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => applyBulkGems(lv)}
                      className="px-2 py-0.5 text-[11px] rounded border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-la-gold/50 hover:text-la-gold-dark dark:hover:text-la-gold"
                    >
                      {lv}겁작
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {raw.gems.Gems?.map((g) => {
                  const cleanName = stripGemName(g.Name);
                  const isGlow = cleanName.includes('광휘');
                  const currentLevel = mods.gems[g.Slot]?.Level ?? g.Level;
                  const currentType = detectCurrentType(mods.gems[g.Slot]?.Tooltip ?? g.Tooltip);
                  const typeLabel =
                    currentType === 'damage' ? '겁화'
                      : currentType === 'cooldown' ? '작열'
                      : currentType === 'support' ? '지원'
                      : isGlow ? '광휘' : (cleanName.split(' ').pop() ?? '');
                  const skill = raw.gems.Effects?.Skills?.find((s) => s.GemSlot === g.Slot);
                  const skillShort = skill?.Name?.slice(0, 3) ?? '';
                  return (
                    <div
                      key={g.Slot}
                      className="flex flex-col items-stretch gap-1 w-[56px] flex-shrink-0"
                    >
                      {/* 아이콘 + 레벨 뱃지 */}
                      <div className="relative w-full aspect-square rounded bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/5 overflow-hidden">
                        <img src={g.Icon} alt="" className="w-full h-full object-cover" />
                        <span className="absolute top-0.5 right-0.5 text-[10px] font-bold text-white bg-black/70 rounded px-1 leading-tight">
                          {currentLevel}
                        </span>
                      </div>
                      {/* 타입 select (광휘만 변경 가능, 외엔 readonly display) */}
                      {isGlow ? (
                        <select
                          value={currentType === 'unknown' ? 'damage' : currentType}
                          onChange={(e) =>
                            updateGemMod(g.Slot, {
                              Tooltip: synthGlowTooltip(
                                e.target.value as 'damage' | 'cooldown' | 'support',
                              ),
                            })
                          }
                          className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-[10px] text-center"
                        >
                          <option value="damage">겁화</option>
                          <option value="cooldown">작열</option>
                          <option value="support">지원</option>
                        </select>
                      ) : (
                        <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-[10px] text-center text-gray-500 dark:text-gray-400">
                          {typeLabel}
                        </div>
                      )}
                      {/* 레벨 select */}
                      <select
                        value={currentLevel}
                        onChange={(e) => updateGemMod(g.Slot, { Level: Number(e.target.value) })}
                        className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-[10px] text-center"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((lv) => (
                          <option key={lv} value={lv}>
                            {lv}
                          </option>
                        ))}
                      </select>
                      {/* 스킬명 (truncate) */}
                      <div
                        title={skill?.Name ?? ''}
                        className="text-[10px] text-center text-gray-500 dark:text-gray-400 truncate"
                      >
                        {skillShort || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* 장비 섹션 — lopec 기반 강화/상재/등급 시뮬 */}
          {showSection('gear') && equipCount > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  장비 ({equipCount}개)
                </h3>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-gray-400">일괄</span>
                  <button
                    type="button"
                    onClick={() => applyBulkEquip({ normalLevel: 25 })}
                    className="px-2 py-0.5 text-[11px] rounded border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-la-gold/50 hover:text-la-gold-dark dark:hover:text-la-gold"
                  >
                    +25 강화
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkEquip({ advancedLevel: 40 })}
                    className="px-2 py-0.5 text-[11px] rounded border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-la-gold/50 hover:text-la-gold-dark dark:hover:text-la-gold"
                  >
                    X40 상재
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkEquip({ tier: '전율' })}
                    className="px-2 py-0.5 text-[11px] rounded border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-la-gold/50 hover:text-la-gold-dark dark:hover:text-la-gold"
                  >
                    전율
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {SLOT_ORDER.map((slot) => {
                  const cur = raw.equip[slot];
                  if (!cur) return null;
                  const m = mods.equip[slot];
                  const curNormal = m?.normalLevel ?? cur.normalLevel;
                  const curAdvanced = cur.isInherited ? cur.advancedLevel : (m?.advancedLevel ?? cur.advancedLevel);
                  const curTier = m?.tier ?? cur.tier;
                  const advancedOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40];
                  // 품질 추출 (tooltip JSON의 ItemTitle.qualityValue)
                  let quality: number | null = null;
                  try {
                    const tt = JSON.parse(cur.raw.Tooltip);
                    for (const k of Object.keys(tt)) {
                      const el = tt[k];
                      if (el?.type === 'ItemTitle' && typeof el.value?.qualityValue === 'number') {
                        quality = el.value.qualityValue >= 0 ? el.value.qualityValue : null;
                        break;
                      }
                    }
                  } catch {
                    // ignore
                  }
                  return (
                    <div
                      key={slot}
                      className="flex items-stretch gap-2 py-1 border-b border-gray-100 dark:border-white/5 last:border-0"
                    >
                      {/* 좌측: 아이콘 + 품질 뱃지 */}
                      <div className="relative w-14 flex-shrink-0">
                        <img
                          src={cur.raw.Icon}
                          alt=""
                          className="w-14 h-14 rounded border border-gray-200 dark:border-white/10"
                        />
                        <span className="absolute top-0.5 left-0.5 text-[9px] font-bold text-white bg-black/70 rounded px-1 leading-tight">
                          {SLOT_LABEL[slot]}
                        </span>
                        {quality !== null && (
                          <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[9px] font-bold text-amber-300 bg-black/70 rounded text-center leading-tight">
                            품질 {quality}
                          </span>
                        )}
                      </div>
                      {/* 우측: 2×2 grid selects */}
                      <div className="flex-1 grid grid-cols-2 gap-1 text-[11px]">
                        <select
                          value={curTier}
                          onChange={(ev) => updateEquipMod(slot, { tier: ev.target.value })}
                          className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5"
                        >
                          {TIER_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              T4 {t}
                            </option>
                          ))}
                        </select>
                        <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 text-center text-gray-500">
                          품질 {quality ?? '-'}
                        </div>
                        <label className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5">
                          <span className="text-gray-400 text-[10px]">+</span>
                          <select
                            value={curNormal}
                            onChange={(ev) =>
                              updateEquipMod(slot, { normalLevel: Number(ev.target.value) })
                            }
                            className="flex-1 bg-transparent outline-none"
                          >
                            {Array.from({ length: 26 }, (_, i) => i).map((lv) => (
                              <option key={lv} value={lv}>
                                {lv}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label
                          className={`flex items-center gap-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 ${
                            cur.isInherited ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          title={cur.isInherited ? '세르카 계승 장비는 상급 재련 시뮬레이션을 지원하지 않습니다' : undefined}
                        >
                          <span className="text-gray-400 text-[10px]">상재</span>
                          <select
                            value={curAdvanced}
                            disabled={cur.isInherited}
                            onChange={(ev) =>
                              updateEquipMod(slot, { advancedLevel: Number(ev.target.value) })
                            }
                            className="flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                          >
                            {advancedOptions.map((lv) => (
                              <option key={lv} value={lv}>
                                X{lv}
                              </option>
                            ))}
                          </select>
                          {cur.isInherited && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-300 whitespace-nowrap">
                              계승 제외
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 악세사리 섹션 (목걸이 + 귀걸이 + 반지 + 어빌 스톤 + 팔찌) */}
          {showSection('accessories') && accessoryCount > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                악세사리
              </h3>
              <div className="space-y-2">
                {ACCESSORY_SLOTS.map((slot) => {
                  const cur = raw.accessories[slot];
                  if (!cur) return null;
                  const m = mods.polish[slot];
                  const currentLabels = m?.polishOptions ?? [
                    cur.polishOptions[0].label,
                    cur.polishOptions[1].label,
                    cur.polishOptions[2].label,
                  ];
                  // accessory 품질 추출 (tooltip ItemTitle.qualityValue)
                  let quality: number | null = null;
                  try {
                    const tt = JSON.parse(cur.raw.Tooltip);
                    for (const k of Object.keys(tt)) {
                      const el = tt[k];
                      if (el?.type === 'ItemTitle' && typeof el.value?.qualityValue === 'number') {
                        quality = el.value.qualityValue >= 0 ? el.value.qualityValue : null;
                        break;
                      }
                    }
                  } catch {
                    // ignore
                  }
                  return (
                    <div
                      key={slot}
                      className="flex items-stretch gap-2 py-1 border-b border-gray-100 dark:border-white/5 last:border-0"
                    >
                      {/* 좌측: 아이콘 + 품질 % */}
                      <div className="relative w-14 flex-shrink-0">
                        <img
                          src={cur.raw.Icon}
                          alt=""
                          className="w-14 h-14 rounded border border-gray-200 dark:border-white/10"
                        />
                        {quality !== null && (
                          <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[9px] font-bold text-amber-300 bg-black/70 rounded text-center leading-tight">
                            {quality}.00%
                          </span>
                        )}
                      </div>
                      {/* 우측: 3개 polish select (grade prefix) */}
                      <div className="flex-1 grid grid-cols-1 gap-1 text-[11px]">
                        {[0, 1, 2].map((idx) => {
                          const curOpt = findPolishOption(currentLabels[idx]) ?? cur.polishOptions[idx];
                          return (
                            <div key={idx} className="flex items-stretch gap-1">
                              <span
                                className={`flex items-center justify-center w-5 rounded text-[10px] font-bold flex-shrink-0 ${getPolishGradeColor(curOpt.grade)}`}
                              >
                                {curOpt.grade}
                              </span>
                              <select
                                value={currentLabels[idx]}
                                onChange={(ev) =>
                                  updatePolishMod(slot, idx as 0 | 1 | 2, ev.target.value)
                                }
                                className="flex-1 min-w-0 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5"
                              >
                                {POLISH_OPTIONS.filter((o) => !o.label.startsWith('__')).map((o) => (
                                  <option key={o.label} value={o.label}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* 팔찌 — 인식된 옵션 편집 */}
                {(() => {
                  const bracelet = raw.bracelet;
                  if (!bracelet || (bracelet.effects.length === 0 && !bracelet.options.some((option) => option.label !== '없음'))) return null;
                  const braceletStats = mods.bracelet?.stats ?? bracelet.stats;
                  const braceletLabels = mods.bracelet?.options ?? ([bracelet.options[0].label, bracelet.options[1].label, bracelet.options[2].label, bracelet.options[3].label] as [string, string, string, string]);
                  return (
                  <div className="flex items-stretch gap-2 py-1 border-b border-gray-100 dark:border-white/5 last:border-0">
                    <div className="relative w-14 flex-shrink-0">
                      <img
                        src={bracelet.raw.Icon}
                        alt=""
                        className="w-14 h-14 rounded border border-gray-200 dark:border-white/10"
                      />
                      <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[9px] font-bold text-amber-300 bg-black/70 rounded text-center leading-tight">
                        팔찌
                      </span>
                    </div>
                    <div className="flex-1 space-y-1 text-[10px] text-gray-600 dark:text-gray-400">
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {braceletStats.map((stat, idx) => (
                          <div key={idx} className="flex items-stretch gap-1 rounded border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5">
                            <select
                              value={stat.type}
                              onChange={(ev) => updateBraceletStatMod(idx as 0 | 1 | 2 | 3, { type: ev.target.value as BraceletStatType })}
                              className="w-16 rounded-l bg-transparent px-1.5 py-0.5 text-gray-700 dark:text-gray-300"
                              title="팔찌 수치 옵션 선택"
                            >
                              {BRACELET_STAT_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={stat.value}
                              onChange={(ev) => updateBraceletStatMod(idx as 0 | 1 | 2 | 3, { value: Number(ev.target.value) })}
                              className="min-w-0 flex-1 rounded-r bg-transparent px-1.5 py-0.5 text-right font-semibold text-blue-600 outline-none dark:text-blue-300"
                              title="팔찌 수치 입력"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-[11px]">
                        {braceletLabels.map((label, idx) => {
                          const opt = findBraceletOption(label) ?? bracelet.options[idx];
                          return (
                            <div key={idx} className="flex items-stretch gap-1">
                              <span className={`flex w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold ${getPolishGradeColor(opt.grade)}`}>
                                {opt.grade}
                              </span>
                              <select
                                value={label}
                                onChange={(ev) => updateBraceletMod(idx as 0 | 1 | 2 | 3, ev.target.value)}
                                className="flex-1 min-w-0 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 dark:border-white/10 dark:bg-white/5"
                                title="팔찌 옵션 선택"
                              >
                                {BRACELET_OPTIONS.map((option, optionIndex) => {
                                  const previous = BRACELET_OPTIONS[optionIndex - 1];
                                  const shouldSeparate = optionIndex > 1 && previous?.type !== option.type;
                                  return (
                                    <React.Fragment key={option.label}>
                                      {shouldSeparate && (
                                        <option value={`__separator-${option.type}`} disabled>
                                          ───────────────
                                        </option>
                                      )}
                                      <option value={option.label}>{option.label}</option>
                                    </React.Fragment>
                                  );
                                })}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  );
                })()}
              </div>
            </div>
          )}

          {showSection('systems') && (
            <ArkGridSimulatorPanel
              rawArkGrid={raw.arkGrid}
              modifiedArkGrid={modifiedRaw?.arkGrid}
              arkGridMods={mods.arkGrid}
              editingArkGridGem={editingArkGridGem}
              arkGridGemDraft={arkGridGemDraft}
              setEditingArkGridGem={setEditingArkGridGem}
              setArkGridGemDraft={setArkGridGemDraft}
              updateArkGridCore={updateArkGridCore}
              updateArkGridGem={updateArkGridGem}
            />
          )}

        </div>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
        보석 · 각인 · 장비 · 악세사리 · 팔찌 · 아크 그리드 시뮬. 아크 그리드는 영웅~고대 코어와 딜러 젬 실측 계수만 반영합니다.
      </p>
    </div>
  );
};

export default SpecScoreSimulator;
