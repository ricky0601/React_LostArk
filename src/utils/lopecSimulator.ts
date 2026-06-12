import type { EngravingData, GemData, ArkPassiveEffect, GemItem } from '../types/lostark';
import {
  LOPEC_ENGRAVING_X_STEPS,
  LOPEC_ENGRAVING_X_STEPS_DEFAULT,
  LOPEC_ENGRAVING_PER_STONE,
  LOPEC_ENGRAVING_PER_STONE_DEFAULT,
  LOPEC_STONE_LV_STEPS,
  LOPEC_STONE_LV_STEPS_DEFAULT,
  LOPEC_GRADE_FACTOR,
  LOPEC_GEM_LEVEL_STEPS,
  LOPEC_GEM_TYPE_FACTOR,
  LOPEC_EQUIP_TIER_RATIO,
  lookupNormalRatio,
  lookupAdvancedRatio,
  lookupWeaponNormalRatio,
  lookupArmorAdvancedRatio,
  lookupWeaponAdvancedAt,
  type EquipSlot,
} from '../data/specScore/lopecCoefficients';
import { classifyGem } from '../data/specScore/gems';
import type { EquipmentState } from './equipmentState';
import type { AccessoryState } from './polishState';
import { ACCESSORY_SLOTS, type AccessorySlot } from '../data/specScore/polishOptions';

/**
 * lopec 추출 데이터 기반 정확 시뮬레이션
 *
 * 핵심: 현재 캐릭터의 점수(인게임 전투력)를 시작점으로, 변경 사항만큼만 곱연산.
 *   newScore = currentScore × ∏(변경 인자)
 *
 * 변경 인자:
 *   1. 각인 어빌 스톤 단계 변화 → per-stone-level coefficient
 *   2. 각인 등급 변경 (유물 ↔ 전설) → grade factor
 *   3. 보석 레벨 변화 → slot-specific per-level coefficient
 *   4. 보석 type 변화 (광휘) → type factor
 *
 * 우리 기존 SpecScoreComponents 모델은 디버그/표시용으로 유지.
 * 이 함수는 점수 시뮬레이션 전용.
 */
/**
 * 캐릭터별 스탯 (절대값 polish 옵션의 동적 cp ratio 계산용)
 *   W = 무기 공격력 (equipment endpoint의 weapon "기본 효과" 값)
 *   baseAttack = 공격력 (profile.Stats의 '공격력' 값, = sqrt(W × 힘민지) / 2.4495)
 */
export interface CharStats {
  W: number;
  baseAttack: number;
}

/** 공격력 +N abs 옵션의 character-specific 증폭 계수 — 한건뜬 측정값 (1.30)에서 도출, 적주피 ~30% 가정 */
const ABS_ATTACK_AMPLIFIER = 1.30;


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
): number => {
  let mult = 1.0;

  // 1. 각인 변경 (어빌 스톤 단계 + 등급)
  const curEffs = currentEng.ArkPassiveEffects ?? [];
  const modEffs = modifiedEng.ArkPassiveEffects ?? [];
  for (const cur of curEffs) {
    const mod = modEffs.find((m) => m.Name === cur.Name);
    if (!mod) continue;
    mult *= calcEngravingDelta(cur, mod);
  }

  // 2. 보석 변경 (레벨 + type)
  const curGems = currentGems.Gems ?? [];
  const modGems = modifiedGems.Gems ?? [];
  for (const cur of curGems) {
    const mod = modGems.find((m) => m.Slot === cur.Slot);
    if (!mod) continue;
    mult *= calcGemDelta(cur, mod);
  }

  // 3. 장비 변경 (강화 + 상재 + 등급) — additive composition
  //    lopec cp formula 분석 결과: 장비 슬롯 변경은 cp의 base attack 부분에 가산되며,
  //    슬롯 간 multiplicative 합성이 아닌 additive. 즉 ∑(ratio_i - 1) 사용.
  //    multiplicative로 합성하면 6슬롯 동시 변경 시 cross-term 누적으로 ~9% 과대평가.
  let equipAddDelta = 0;
  if (currentEquip && modifiedEquip) {
    const slots: EquipSlot[] = ['weapon', 'helmet', 'shoulder', 'armor', 'pants', 'gloves'];
    for (const slot of slots) {
      const cur = currentEquip[slot];
      const mod = modifiedEquip[slot];
      if (!cur || !mod) continue;
      const ratio = calcEquipDelta(slot, cur, mod);
      equipAddDelta += ratio - 1;
    }
  }

  // 4. 장신구 연마효과 변경 — additive composition.
  //    각 polish option은 단독 적용 시 측정된 cpRatio 보유.
  //    절대값 옵션(무기 공격력_abs, 공격력_abs)은 charStats가 있으면 동적 계산으로 character-aware
  //    처리 — 캐릭터별 W, baseAttack 차이를 sqrt 공식으로 반영.
  let polishAddDelta = 0;
  if (currentAccessories && modifiedAccessories) {
    for (const slot of ACCESSORY_SLOTS) {
      const cur = currentAccessories[slot];
      const mod = modifiedAccessories[slot];
      if (!cur || !mod) continue;
      for (let i = 0; i < 3; i++) {
        const curOpt = cur.polishOptions[i];
        const modOpt = mod.polishOptions[i];
        if (curOpt.label === modOpt.label) continue;
        const curRatio = resolvePolishCpRatio(curOpt, charStats);
        const modRatio = resolvePolishCpRatio(modOpt, charStats);
        polishAddDelta += modRatio - curRatio;
      }
    }
  }

  return currentScore * mult * (1 + equipAddDelta + polishAddDelta);
};

/**
 * 절대값 옵션은 character-specific으로 동적 계산. 그 외는 stored cpRatio 사용.
 *   - 무기 공격력_abs: sqrt(1 + value/W_char) — 정확
 *   - 공격력_abs: 1 + amplifier × value/baseAttack — 근사 (적주피 baseline 반영)
 */
const resolvePolishCpRatio = (
  opt: { type: string; value: number; cpRatio: number },
  charStats?: CharStats,
): number => {
  if (!charStats || charStats.W <= 0 || charStats.baseAttack <= 0) return opt.cpRatio;
  if (opt.type === '무기 공격력_abs') {
    return Math.sqrt(1 + opt.value / charStats.W);
  }
  if (opt.type === '공격력_abs') {
    return 1 + (ABS_ATTACK_AMPLIFIER * opt.value) / charStats.baseAttack;
  }
  return opt.cpRatio;
};

const calcEngravingDelta = (cur: ArkPassiveEffect, mod: ArkPassiveEffect): number => {
  let mult = 1.0;

  // 메인 슬롯 X단계 변화 — lopec engraving-level-N과 매핑 (인게임 전투력 기준)
  // ArkPassiveEffect.Level = X0, X1, ..., X4 (0~4)
  // step 배열은 X0→X1, X1→X2, X2→X3, X3→X4 (4개 인덱스 0~3)
  const curLevel = cur.Level;
  const modLevel = mod.Level;
  const steps = LOPEC_ENGRAVING_X_STEPS[cur.Name] ?? LOPEC_ENGRAVING_X_STEPS_DEFAULT;

  if (modLevel > curLevel) {
    // 단계 증가: i = curLevel ~ (modLevel-1) 까지 steps[i] 곱
    for (let i = curLevel; i < modLevel && i < steps.length; i++) {
      mult *= 1 + steps[i] / 100;
    }
  } else if (modLevel < curLevel) {
    // 단계 감소: 역방향 — 같은 step을 나눔
    for (let i = modLevel; i < curLevel && i < steps.length; i++) {
      mult /= 1 + steps[i] / 100;
    }
  }

  // 어빌리티 스톤 단계 변화 — lopec stone-option-select-N 계수 사용.
  // 측정 데이터는 Lv.1→2, Lv.2→3, Lv.3→4 기준이라 Lv.0↔1은 평균 per-stone 계수로 보정한다.
  const curStoneLevel = Math.max(0, Math.min(4, cur.AbilityStoneLevel ?? 0));
  const modStoneLevel = Math.max(0, Math.min(4, mod.AbilityStoneLevel ?? 0));
  const stoneSteps = LOPEC_STONE_LV_STEPS[cur.Name] ?? LOPEC_STONE_LV_STEPS_DEFAULT;
  const firstStoneStep = LOPEC_ENGRAVING_PER_STONE[cur.Name] ?? LOPEC_ENGRAVING_PER_STONE_DEFAULT;
  const stoneStepAt = (fromLevel: number): number =>
    fromLevel <= 0 ? firstStoneStep : stoneSteps[fromLevel - 1];

  if (modStoneLevel > curStoneLevel) {
    for (let lv = curStoneLevel; lv < modStoneLevel; lv++) {
      const step = stoneStepAt(lv);
      if (step !== undefined) mult *= 1 + step / 100;
    }
  } else if (modStoneLevel < curStoneLevel) {
    for (let lv = modStoneLevel; lv < curStoneLevel; lv++) {
      const step = stoneStepAt(lv);
      if (step !== undefined) mult /= 1 + step / 100;
    }
  }

  // 등급 변경
  if (cur.Grade !== mod.Grade) {
    if (cur.Grade === '유물' && mod.Grade === '전설') mult *= LOPEC_GRADE_FACTOR.reliсToLegendary;
    else if (cur.Grade === '전설' && mod.Grade === '유물')
      mult *= LOPEC_GRADE_FACTOR.legendaryToRelic;
  }

  return mult;
};

const calcGemDelta = (cur: GemItem, mod: GemItem): number => {
  let mult = 1.0;

  const curClass = classifyGem(cur.Name, cur.Tooltip);
  const modClass = classifyGem(mod.Name, mod.Tooltip);

  // 레벨 변화 — 단계별 step ratio 곱연산 (slot/type 무관 lopec 패턴)
  const curLv = cur.Level;
  const modLv = mod.Level;

  if (modLv > curLv) {
    for (let i = curLv; i < modLv; i++) {
      const idx = i - 1; // 1→2가 인덱스 0
      if (idx >= 0 && idx < LOPEC_GEM_LEVEL_STEPS.length) {
        mult *= 1 + LOPEC_GEM_LEVEL_STEPS[idx] / 100;
      }
    }
  } else if (modLv < curLv) {
    for (let i = modLv; i < curLv; i++) {
      const idx = i - 1;
      if (idx >= 0 && idx < LOPEC_GEM_LEVEL_STEPS.length) {
        mult /= 1 + LOPEC_GEM_LEVEL_STEPS[idx] / 100;
      }
    }
  }

  // type 변화 (광휘 보석 조율 변경) — 단순화
  if (curClass.type !== modClass.type) {
    const curTypeFactor =
      curClass.type === 'damage' || curClass.type === 'cooldown'
        ? LOPEC_GEM_TYPE_FACTOR[curClass.type as 'damage' | 'cooldown']
        : 1;
    const modTypeFactor =
      modClass.type === 'damage' || modClass.type === 'cooldown'
        ? LOPEC_GEM_TYPE_FACTOR[modClass.type as 'damage' | 'cooldown']
        : 1;
    mult *= modTypeFactor / curTypeFactor;
  }

  return mult;
};

const calcEquipDelta = (slot: EquipSlot, cur: EquipmentState, mod: EquipmentState): number => {
  let mult = 1.0;
  const ignoresAdvanced = cur.isInherited || mod.isInherited;
  const curAdvanced = cur.advancedLevel;
  const modAdvanced = ignoresAdvanced ? cur.advancedLevel : mod.advancedLevel;

  // 1. 일반 강화 변화
  if (cur.normalLevel !== mod.normalLevel) {
    if (slot === 'weapon') {
      // 무기는 normal × advanced 상호작용이 존재.
      // normal만 변경되는 케이스(실사용 다수)에서는 현재 advanced 값을 기준으로
      // ratio를 계산해야 Lopec 시뮬레이터와의 오차가 가장 작다.
      // (평균값 사용 시 단일 normal 변경에서 미세 과대/과소 오차가 누적될 수 있음)
      const isNormalOnly = curAdvanced === modAdvanced;
      const refAdv = isNormalOnly
        ? curAdvanced
        : (curAdvanced + modAdvanced) / 2;
      const curRatio = lookupWeaponNormalRatio(cur.normalLevel, refAdv);
      const modRatio = lookupWeaponNormalRatio(mod.normalLevel, refAdv);
      mult *= modRatio / curRatio;
    } else {
      const curRatio = lookupNormalRatio(slot, cur.normalLevel);
      const modRatio = lookupNormalRatio(slot, mod.normalLevel);
      mult *= modRatio / curRatio;
    }
  }

  // 2. 상급 재련 변화
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

  // 3. 등급(tier) 변화
  if (cur.tier !== mod.tier) {
    const tierMap = LOPEC_EQUIP_TIER_RATIO[slot];
    const curTierRatio = tierMap[cur.tier] ?? 1.0;
    const modTierRatio = tierMap[mod.tier] ?? 1.0;
    if (curTierRatio > 0) mult *= modTierRatio / curTierRatio;
  }

  return mult;
};
