import type { EngravingData, GemData, ArkPassiveEffect, ArkGridData } from '../types/lostark';
import {
  LOPEC_ENGRAVING_TOTAL_EFFECTS,
  lookupAdvancedRatio,
  lookupArmorAdvancedRatio,
  lookupWeaponAdvancedAt,
  type EquipSlot,
} from '../data/specScore/lopecCoefficients';
import type { EquipmentState } from './equipmentState';
import type { AccessoryState, BraceletState } from './polishState';
import { ACCESSORY_SLOTS, type AccessorySlot } from '../data/specScore/polishOptions';
import { calcGemSetDelta } from './lopecGemDelta';
import { calcArkGridDelta } from './lopecArkGridDelta';
import { calcBraceletDelta } from './lopecBraceletDelta';
import { calcStoneSetBonusDelta } from './lopecStoneDelta';
import { calcNormalHoningBaseStatDelta } from './lopecEquipmentDelta';

/**
 * lopec 추출 데이터 기반 정확 시뮬레이션
 *
 * 핵심: 현재 캐릭터의 점수(인게임 전투력)를 시작점으로, 변경 사항만큼만 곱연산.
 *   newScore = currentScore × ∏(변경 인자)
 *
 * 변경 인자:
 *   1. 각인/어빌리티 스톤 변화 → 누적 각인 효과 factor ratio
 *   2. 보석 변화 → 순수 전투력 배율 × 4T 기본공격력% 총합 배율
 *   3. 장비 일반 재련 → API 무공/추론 주스탯 기반 sqrt 공식
 *   4. 장비 상급 재련 → 기존 상급재련 계수 경로
 *
 * 이 함수는 점수 시뮬레이션 전용.
 */
/**
 * 캐릭터별 스탯 (절대값 polish 옵션의 동적 cp ratio 계산용)
 *   W = 무기 공격력 (equipment endpoint의 weapon "기본 효과" 값)
 *   baseAttack = 공격력 (profile.Stats의 '공격력' Value, 공격력 증감 포함)
 *   pureBaseAttack = 공격력 tooltip의 "기본 공격력", 장비 주스탯 추론용
 */
export interface CombatStats {
  readonly crit: number;
  readonly specialization: number;
  readonly swiftness: number;
}

export interface CharStats {
  W: number;
  baseAttack: number;
  /**
   * 공격력 툴팁의 '기본 공격력은 N'.
   * canonical 용어로는 displayed_base_attack — 기본 공격력% 가 이미 적용된 값이라
   * pure_base_attack 이 아니다. resolvePureBaseAttack 으로 되돌려 써야 한다.
   */
  pureBaseAttack?: number;
  displayedMainStat?: number;
  avatarMainStatMultiplier?: number;
  petMainStatMultiplier?: number;
  stoneBaseAttackBonusPercent?: number;
  /** 무기 툴팁 공격력에 장신구 연마% + 깨달음 카르마% 를 반영한 값 */
  effectiveWeaponAttack?: number;
  /** 장신구 연마% + 깨달음 카르마% 합. raw 재련 델타를 증폭할 때 쓴다. */
  weaponAttackPercentSum?: number;
  /** 완갑 등 기본 공격력 flat 보너스 합 */
  baseAttackFlatSum?: number;
  /** T4 보석% + 어빌리티 스톤% 합 */
  baseAttackPercentSum?: number;
  combatStats?: CombatStats;
}

/** 각인 계수 변화만. 어빌리티 스톤 세트 보너스(기본공격력%)는 포함하지 않는다. */
export const calcEngravingSetDelta = (
  currentEng: EngravingData,
  modifiedEng: EngravingData,
): number => {
  const curEffs = currentEng.ArkPassiveEffects ?? [];
  const modEffs = modifiedEng.ArkPassiveEffects ?? [];
  const names = Array.from(new Set([...curEffs.map((e) => e.Name), ...modEffs.map((e) => e.Name)]));
  return names.reduce((mult, name) => {
    const cur = curEffs.find((effect) => effect.Name === name) ?? neutralEngravingEffect(name);
    const mod = modEffs.find((effect) => effect.Name === name) ?? neutralEngravingEffect(name);
    return mult * calcEngravingDelta(cur, mod);
  }, 1);
};

/** 상급 재련은 슬롯별 비율을 곱하지 않고 증분으로 누적한다. */
export const calcAdvancedHoningSetDelta = (
  slots: readonly EquipSlot[],
  currentEquip: Partial<Record<EquipSlot, EquipmentState>>,
  modifiedEquip: Partial<Record<EquipSlot, EquipmentState>>,
): number => {
  let addDelta = 0;
  for (const slot of slots) {
    const cur = currentEquip[slot];
    const mod = modifiedEquip[slot];
    if (!cur || !mod) continue;
    addDelta += calcAdvancedHoningDelta(slot, cur, mod) - 1;
  }
  return 1 + addDelta;
};

/** 연마 효과 중 직접 전투력 인자만. 무기 공격력 계열은 기본공격력 쪽에서 처리한다. */
export const calcPolishDirectDelta = (
  currentAccessories: Partial<Record<AccessorySlot, AccessoryState>> | undefined,
  modifiedAccessories: Partial<Record<AccessorySlot, AccessoryState>> | undefined,
): number => {
  if (!currentAccessories || !modifiedAccessories) return 1;
  let multiplier = 1;
  for (const slot of ACCESSORY_SLOTS) {
    const cur = currentAccessories[slot];
    const mod = modifiedAccessories[slot];
    if (!cur || !mod) continue;
    for (let i = 0; i < 3; i++) {
      const curOpt = cur.polishOptions[i];
      const modOpt = mod.polishOptions[i];
      if (curOpt.label === modOpt.label) continue;
      if (isWeaponAttackPolishType(curOpt.type) || isWeaponAttackPolishType(modOpt.type)) continue;
      const curRatio = 1 + curOpt.combatPowerIncreasePercent / 100;
      const modRatio = 1 + modOpt.combatPowerIncreasePercent / 100;
      if (curRatio > 0) multiplier *= modRatio / curRatio;
    }
  }
  return multiplier;
};

const isWeaponAttackPolishType = (type: string): boolean =>
  type === '무기 공격력' || type === '무기 공격력_abs';

export const calcLopecDelta = (
  currentScore: number,
  currentEng: EngravingData,
  modifiedEng: EngravingData,
  currentGems: GemData,
  modifiedGems: GemData,
  currentEquip?: Partial<Record<EquipSlot, EquipmentState>>,
  modifiedEquip?: Partial<Record<EquipSlot, EquipmentState>>,
  currentAccessories?: Partial<Record<AccessorySlot, AccessoryState>>,
  modifiedAccessories?: Partial<Record<AccessorySlot, AccessoryState>>,
  charStats?: CharStats,
  currentArkGrid?: ArkGridData | null,
  modifiedArkGrid?: ArkGridData | null,
  currentBracelet?: BraceletState | null,
  modifiedBracelet?: BraceletState | null,
): number => {
  let mult = 1.0;

  // 1. 각인 변경 (어빌 스톤 단계 + 등급)
  const curEffs = currentEng.ArkPassiveEffects ?? [];
  const modEffs = modifiedEng.ArkPassiveEffects ?? [];
  const engravingNames = Array.from(new Set([...curEffs.map((effect) => effect.Name), ...modEffs.map((effect) => effect.Name)]));
  for (const name of engravingNames) {
    const cur = curEffs.find((effect) => effect.Name === name) ?? neutralEngravingEffect(name);
    const mod = modEffs.find((effect) => effect.Name === name) ?? neutralEngravingEffect(name);
    mult *= calcEngravingDelta(cur, mod);
  }
  mult *= calcStoneSetBonusDelta(curEffs, modEffs, charStats);

  // 2. 보석 변경 — 겁화/작열/스킬 구분 없이 tier와 level만 반영.
  mult *= calcGemSetDelta(currentGems.Gems ?? [], modifiedGems.Gems ?? [], charStats);

  // 3. 장비 변경 (강화 + 상재 + 등급)
  let equipMultiplier = 1;
  let equipAddDelta = 0;
  if (currentEquip && modifiedEquip) {
    const slots: EquipSlot[] = ['weapon', 'helmet', 'shoulder', 'armor', 'pants', 'gloves', 'armlet'];
    equipMultiplier = calcNormalHoningBaseStatDelta({
      slots,
      currentEquip,
      modifiedEquip,
      charStats,
    });
    for (const slot of slots) {
      const cur = currentEquip[slot];
      const mod = modifiedEquip[slot];
      if (!cur || !mod) continue;
      const ratio = calcAdvancedHoningDelta(slot, cur, mod);
      equipAddDelta += ratio - 1;
    }
  }

  // 4. 장신구 연마효과 변경.
  //    옵션별 독립 전투력 증가량을 신규/기존 비율로 교체 반영한다.
  //    무기 공격력은 direct table이 아니라 기본 공격력 쪽 공식으로 반영한다.
  let polishMultiplier = 1;
  if (currentAccessories && modifiedAccessories) {
    for (const slot of ACCESSORY_SLOTS) {
      const cur = currentAccessories[slot];
      const mod = modifiedAccessories[slot];
      if (!cur || !mod) continue;
      for (let i = 0; i < 3; i++) {
        const curOpt = cur.polishOptions[i];
        const modOpt = mod.polishOptions[i];
        if (curOpt.label === modOpt.label) continue;
        const curRatio = resolvePolishCombatPowerRatio(curOpt, charStats);
        const modRatio = resolvePolishCombatPowerRatio(modOpt, charStats);
        if (curRatio > 0) polishMultiplier *= modRatio / curRatio;
      }
    }
  }
  polishMultiplier *= calcBraceletDelta(currentBracelet, modifiedBracelet, charStats?.combatStats);

  const arkGridMultiplier = calcArkGridDelta(currentArkGrid, modifiedArkGrid);

  return currentScore * mult * equipMultiplier * polishMultiplier * arkGridMultiplier * (1 + equipAddDelta);
};

/**
 * 장신구 옵션은 검증된 독립 전투력 증가량을 우선 반영한다.
 * 무기 공격력 계열은 direct table이 아니라 기본 공격력 쪽 sqrt 공식으로 반영한다.
 */
const resolvePolishCombatPowerRatio = (
  opt: { readonly type: string; readonly value: number; readonly combatPowerIncreasePercent: number },
  charStats?: CharStats,
): number => {
  if (opt.type === '무기 공격력') {
    return Math.sqrt(1 + opt.value / 100);
  }
  if (opt.type === '무기 공격력_abs' && charStats && charStats.W > 0) {
    return Math.sqrt(1 + opt.value / charStats.W);
  }
  return 1 + opt.combatPowerIncreasePercent / 100;
};


const neutralEngravingEffect = (name: string): ArkPassiveEffect => ({
  AbilityStoneLevel: null,
  Description: '',
  Grade: '',
  Level: 0,
  Name: name,
});

const isNeutralEngravingEffect = (effect: ArkPassiveEffect): boolean =>
  effect.Grade === '' && effect.Level === 0 && effect.AbilityStoneLevel === null;

const calcEngravingDelta = (cur: ArkPassiveEffect, mod: ArkPassiveEffect): number => {
  const curLevel = cur.Level;
  const modLevel = mod.Level;
  const curStoneLevel = Math.max(0, Math.min(4, cur.AbilityStoneLevel ?? 0));
  const modStoneLevel = Math.max(0, Math.min(4, mod.AbilityStoneLevel ?? 0));
  const totalEffects = LOPEC_ENGRAVING_TOTAL_EFFECTS[cur.Name];
  if (!totalEffects) return 1.0;

  const currentTotalEffect = isNeutralEngravingEffect(cur) ? 0 : totalEffects[curLevel]?.[curStoneLevel];
  const modifiedTotalEffect = isNeutralEngravingEffect(mod) ? 0 : totalEffects[modLevel]?.[modStoneLevel];
  if (currentTotalEffect === undefined || modifiedTotalEffect === undefined) return 1.0;

  return (1 + modifiedTotalEffect / 100) / (1 + currentTotalEffect / 100);
};


const calcAdvancedHoningDelta = (slot: EquipSlot, cur: EquipmentState, mod: EquipmentState): number => {
  if (slot === 'armlet') return 1;

  let mult = 1.0;
  const ignoresAdvanced = cur.isInherited || mod.isInherited;
  const curAdvanced = cur.advancedLevel;
  const modAdvanced = ignoresAdvanced ? cur.advancedLevel : mod.advancedLevel;

  // 1. 상급 재련 변화
  if (!ignoresAdvanced && curAdvanced !== modAdvanced) {
    const refNormal = (cur.normalLevel + mod.normalLevel) / 2;
    if (slot === 'weapon') {
      // 무기는 normal × advanced cross-term — 절대 cp 테이블에서 ratio 계산
      // X0는 page state 다름 → X0 이동 시 기존 1D 테이블 fallback
      const curAdv = curAdvanced;
      const modAdv = modAdvanced;
      if (curAdv >= 10 && modAdv >= 10) {
        const curCp = lookupWeaponAdvancedAt(curAdv, refNormal);
        const modCp = lookupWeaponAdvancedAt(modAdv, refNormal);
        if (curCp > 0) mult *= modCp / curCp;
      } else {
        const curRatio = lookupAdvancedRatio(slot, curAdv);
        const modRatio = lookupAdvancedRatio(slot, modAdv);
        mult *= modRatio / curRatio;
      }
    } else {
      // 방어구는 normal × advanced 상호작용 — normal 평균을 reference로 사용
      const curRatio = lookupArmorAdvancedRatio(slot, curAdvanced, refNormal);
      const modRatio = lookupArmorAdvancedRatio(slot, modAdvanced, refNormal);
      mult *= modRatio / curRatio;
    }
  }

  return mult;
};
