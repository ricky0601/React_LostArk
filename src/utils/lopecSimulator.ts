import type { EngravingData, GemData, ArkPassiveEffect, ArkGridData } from '../types/lostark';
import {
  LOPEC_ENGRAVING_TOTAL_EFFECTS,
  lookupAdvancedRatio,
  lookupArmorAdvancedRatio,
  lookupWeaponAdvancedAt,
  type EquipSlot,
} from '../data/specScore/lopecCoefficients';
import { resolveNormalHoningDelta, type EquipmentState } from './equipmentState';
import type { AccessoryState, BraceletState } from './polishState';
import { ACCESSORY_SLOTS, type AccessorySlot } from '../data/specScore/polishOptions';
import { calcGemSetDelta } from './lopecGemDelta';
import { calcArkGridDelta } from './lopecArkGridDelta';
import { calcBraceletDelta } from './lopecBraceletDelta';
import { calcStoneSetBonusDelta } from './lopecStoneDelta';

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
  pureBaseAttack?: number;
  stoneBaseAttackBonusPercent?: number;
  combatStats?: CombatStats;
}


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
    const slots: EquipSlot[] = ['weapon', 'helmet', 'shoulder', 'armor', 'pants', 'gloves'];
    equipMultiplier = calcNormalHoningBaseStatDelta(slots, currentEquip, modifiedEquip, charStats);
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

const inferMainStat = (charStats: CharStats): number => {
  const baseAttackForEquipment = charStats.pureBaseAttack ?? charStats.baseAttack;
  if (charStats.W <= 0 || baseAttackForEquipment <= 0) return 0;
  return (baseAttackForEquipment * baseAttackForEquipment * 6) / charStats.W;
};

const calcNormalHoningBaseStatDelta = (
  slots: EquipSlot[],
  currentEquip: Partial<Record<EquipSlot, EquipmentState>>,
  modifiedEquip: Partial<Record<EquipSlot, EquipmentState>>,
  charStats?: CharStats,
): number => {
  if (!charStats || charStats.W <= 0 || charStats.baseAttack <= 0) return 1;

  const currentMainStat = inferMainStat(charStats);
  if (currentMainStat <= 0) return 1;

  let weaponAttackDelta = 0;
  let effectiveArmorStatDelta = 0;

  for (const slot of slots) {
    const cur = currentEquip[slot];
    const mod = modifiedEquip[slot];
    if (!cur || !mod || cur.normalLevel === mod.normalLevel) continue;

    const normalDelta = sumNormalHoningStepDelta(slot, cur.equipmentFamily, cur.normalLevel, mod.normalLevel);
    weaponAttackDelta += normalDelta.weaponAttack;
    effectiveArmorStatDelta += normalDelta.mainStat;
  }

  const currentWeaponAttack = charStats.W;
  const nextWeaponAttack = currentWeaponAttack + weaponAttackDelta;
  const nextMainStat = currentMainStat + effectiveArmorStatDelta;
  if (nextWeaponAttack <= 0 || nextMainStat <= 0) return 1;

  return Math.sqrt((nextWeaponAttack * nextMainStat) / (currentWeaponAttack * currentMainStat));
};

const sumNormalHoningStepDelta = (
  slot: EquipSlot,
  family: EquipmentState['equipmentFamily'],
  fromLevel: number,
  toLevel: number,
): { readonly weaponAttack: number; readonly mainStat: number; readonly secondaryStat: number } => {
  const sign = toLevel > fromLevel ? 1 : -1;
  const start = Math.min(fromLevel, toLevel) + 1;
  const end = Math.max(fromLevel, toLevel);
  let weaponAttack = 0;
  let mainStat = 0;
  let secondaryStat = 0;

  for (let level = start; level <= end; level++) {
    const delta = resolveNormalHoningDelta(slot, family, level);
    if (delta?.kind === 'weapon') {
      weaponAttack += sign * delta.weaponAttack;
    }
    if (delta?.kind === 'armor') {
      mainStat += sign * delta.stats.mainStat;
      secondaryStat += sign * (
        delta.stats.health +
        (delta.stats.magicDefense ?? 0) +
        (delta.stats.physicalDefense ?? 0)
      );
    }
  }

  return { weaponAttack, mainStat, secondaryStat };
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

const calcEngravingDelta = (cur: ArkPassiveEffect, mod: ArkPassiveEffect): number => {
  const curLevel = cur.Level;
  const modLevel = mod.Level;
  const curStoneLevel = Math.max(0, Math.min(4, cur.AbilityStoneLevel ?? 0));
  const modStoneLevel = Math.max(0, Math.min(4, mod.AbilityStoneLevel ?? 0));
  const totalEffects = LOPEC_ENGRAVING_TOTAL_EFFECTS[cur.Name];
  if (!totalEffects) return 1.0;

  const currentTotalEffect = totalEffects[curLevel]?.[curStoneLevel];
  const modifiedTotalEffect = totalEffects[modLevel]?.[modStoneLevel];
  if (currentTotalEffect === undefined || modifiedTotalEffect === undefined) return 1.0;

  return (1 + modifiedTotalEffect / 100) / (1 + currentTotalEffect / 100);
};


const calcAdvancedHoningDelta = (slot: EquipSlot, cur: EquipmentState, mod: EquipmentState): number => {
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
