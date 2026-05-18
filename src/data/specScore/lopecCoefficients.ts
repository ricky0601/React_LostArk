/**
 * lopec 시뮬레이터에서 직접 추출한 정확 계수 (2026-05-15 발키리 빛의 기사 기준)
 *
 * 추출 방식: chrome-devtools로 lopec.kr/character/simulator/한건뜬 페이지의
 * 각 select 드롭다운을 자동 변경하며 점수 차이를 측정.
 *
 * 주의: 이 데이터는 캐릭터/직업/스킬 빌드에 따라 달라질 수 있음. 다른 직업으로
 * 일반화하려면 직업별 재측정 필요. 현재는 사용자 캐릭터 케이스에 최적화.
 */

/** 각인 어빌리티 스톤 단계당 % 곱연산 인자 (평균값 — fallback용) */
export const LOPEC_ENGRAVING_PER_STONE: Record<string, number> = {
  원한: 0.6302,
  '예리한 둔기': 0.6232,
  아드레날린: 0.6455,
  돌격대장: 0.6510,
  '저주받은 인형': 0.6464,
};

/** 추출 안 된 각인의 fallback */
export const LOPEC_ENGRAVING_PER_STONE_DEFAULT = 0.65;

/**
 * 메인 슬롯 X단계 변경 시 step ratio (%) — X0→X1, X1→X2, X2→X3, X3→X4
 *
 * lopec engraving-level-N (메인 각인 슬롯의 X단계) 변경을 **인게임 전투력(combatPower)** 기준 측정.
 * 사용자 시뮬레이터의 점수 base = combatPower이므로 이 ratio 사용.
 *
 * 핵심 발견:
 * - 아드레날린이 가장 강함 (0.9%/단계) — 다른 각인의 1.5배
 * - 각 각인 단계별 거의 균등 (점진적 감소만)
 */
export const LOPEC_ENGRAVING_X_STEPS: Record<string, [number, number, number, number]> = {
  원한: [0.6160, 0.6122, 0.6085, 0.6050],
  '예리한 둔기': [0.6203, 0.6246, 0.6127, 0.6087],
  아드레날린: [0.9113, 0.9033, 0.8952, 0.8871],
  돌격대장: [0.6898, 0.6848, 0.6802, 0.6758],
  '저주받은 인형': [0.6581, 0.6536, 0.6493, 0.6451],
};

export const LOPEC_ENGRAVING_X_STEPS_DEFAULT: [number, number, number, number] = [
  0.65, 0.65, 0.65, 0.65,
];

/**
 * 어빌리티 스톤 슬롯 Lv.N 단계별 step ratio (%) — Lv.1→Lv.2, Lv.2→Lv.3, Lv.3→Lv.4
 *
 * lopec stone-option-select-N의 Lv.N 변경 측정.
 * 어빌리티 스톤이 부여하는 각인 단계 (시즌3 아크패시브 각인 단계).
 *
 * 주의: 우리 시뮬레이터의 "단계" 드롭다운은 이쪽과 매핑됨 (사용자 의도).
 * 즉 ArkPassiveEffect.Level = lopec stone Lv로 처리.
 *
 * 패턴: 후반 단계로 갈수록 효율 감소 (Lv.1→2 큰 효과, Lv.3→4 작은 효과)
 */
export const LOPEC_STONE_LV_STEPS: Record<string, [number, number, number]> = {
  원한: [1.9749, 1.2449, 0.6147],
  '예리한 둔기': [1.3404, 0.0, 0.6191], // Lv.2→3 측정값 cap (재확인 필요)
  아드레날린: [1.9696, 1.2373, 0.6114],
  돌격대장: [1.9790, 1.2527, 0.6184],
  '저주받은 인형': [1.9633, 1.2218, 0.6037],
};

export const LOPEC_STONE_LV_STEPS_DEFAULT: [number, number, number] = [1.97, 1.24, 0.61];

/** 각인 등급 변경 시 곱연산 인자 */
export const LOPEC_GRADE_FACTOR = {
  /** 유물 → 전설 변경 */
  reliсToLegendary: 0.98121,
  /** 전설 → 유물 변경 */
  legendaryToRelic: 1.01914,
} as const;

/** 보석 슬롯별 type-아래 단계당 % (현재 캐릭터 빌드 기준, 호환성 유지용) */
export const LOPEC_GEM_PER_LEVEL: Record<number, { damage: number; cooldown: number }> = {
  0: { damage: 1.497, cooldown: 0.808 },
  3: { damage: 0.968, cooldown: 0.808 },
  1: { damage: 0.439, cooldown: 0.808 },
  2: { damage: 0.439, cooldown: 0.808 },
  4: { damage: 0.439, cooldown: 0.808 },
  5: { damage: 0.439, cooldown: 0.808 },
  6: { damage: 0.439, cooldown: 0.808 },
  7: { damage: 0.439, cooldown: 0.808 },
  8: { damage: 0.439, cooldown: 0.808 },
  9: { damage: 0.439, cooldown: 0.808 },
  10: { damage: 0.439, cooldown: 0.808 },
};

export const LOPEC_GEM_PER_LEVEL_DEFAULT = { damage: 0.5, cooldown: 0.808 };

/**
 * 보석 단계별 step ratio (cp 기준) — 1→2, 2→3, ..., 9→10
 *
 * slot/type 무관 (lopec 모델 일관성 확인됨).
 * 한건뜬 캐릭터(baseline 4523) 측정값. 끼욧통(baseline 2063)과 거의 동일하지만 ±0.005%p 차이.
 *
 * 패턴: 1→2 큰 점프 (1.48%), 중간 단계 0.67~0.76%, 7→10 약 0.78~0.79%
 *
 * 검증: 일괄 10레벨 변경 시 lopec +803.93, 우리 모델 ≈ +810 (±6점 일치).
 */
export const LOPEC_GEM_LEVEL_STEPS: [
  number, number, number, number, number, number, number, number, number,
] = [1.4791, 0.6738, 0.7157, 0.7117, 0.7537, 0.7494, 0.7913, 0.7871, 0.7834];

/** 광휘 보석의 type 변경 시 곱연산 인자 (추후 추출 후 보정) */
export const LOPEC_GEM_TYPE_FACTOR = {
  damage: 1.0,
  cooldown: 0.55, // 작열은 평균적으로 겁화보다 효율 낮음 (대략)
  support: 0.1,
} as const;

// ============================================================
// 장비 (무기 + 방어구 5슬롯)
//
// 추출 방식: lopec.kr 시뮬레이터의 armory-{slot}-{normal|advanced|tier} 드롭다운을
// chrome-devtools로 자동 변경하며 인게임 전투력(combatPower) 차이 측정.
//
// 한건뜬 캐릭터 (발키리 빛의 기사, T4 전율, 2026-05-18 측정 기준)
//
// 핵심 발견:
// - 무기 normal +25 vs +0 = +39.08% — 단일 가장 큰 영향
// - 무기 advanced X40 vs X0 = +14.15%
// - 방어구 advanced는 무기의 ~10% (장갑 +2.45% / 상의 +1.30% etc.)
// - 슬롯별로 ratio 패턴이 다르므로 통일 계수 불가, 슬롯별 저장
// - 상급재련 X30/X40 구간에 추가 보너스 step (1.3%/5단계 vs 보너스 2.4~2.9%/5단계)
// ============================================================

export type EquipSlot = 'weapon' | 'helmet' | 'shoulder' | 'armor' | 'pants' | 'gloves';

/**
 * 강화 단계별 누적 ratio (해당 슬롯의 +0 기준)
 * index 0=+0, 1=+5, 2=+10, 3=+15, 4=+20, 5=+25
 * 사이 값은 lookup 함수에서 선형 보간.
 */
export const LOPEC_EQUIP_NORMAL_STEPS: Record<EquipSlot, number[]> = {
  weapon:   [1.0, 1.06785, 1.14322, 1.22674, 1.30750, 1.39076],
  helmet:   [1.0, 1.00884, 1.01923, 1.03145, 1.04394, 1.05748],
  shoulder: [1.0, 1.00950, 1.02067, 1.03377, 1.04714, 1.06163],
  armor:    [1.0, 1.00700, 1.01525, 1.02496, 1.03490, 1.04571],
  pants:    [1.0, 1.00805, 1.01754, 1.02869, 1.04009, 1.05246],
  gloves:   [1.0, 1.01241, 1.02696, 1.04398, 1.06129, 1.08000],
};

/**
 * 상급 재련 단계별 누적 ratio (해당 슬롯의 X0 기준)
 * index 0..8 = X(i*5), 즉 X0, X5, X10, ..., X40
 *
 * 무기/투구는 5단계 간격 실측. 나머지 4슬롯은 10단계 간격 실측 + 선형 보간.
 * 무기/투구 데이터에서 보이는 X30/X40 보너스 step 패턴은 보간값에도 반영 (대략적).
 */
export const LOPEC_EQUIP_ADVANCED_STEPS: Record<EquipSlot, number[]> = {
  weapon:   [1.0, 1.01322, 1.02673, 1.04052, 1.05461, 1.06899, 1.09446, 1.10960, 1.14148],
  helmet:   [1.0, 1.00144, 1.00294, 1.00448, 1.00607, 1.00773, 1.01073, 1.01253, 1.01643],
  // X5,X15,X25,X35는 인접 측정값(10단계 간격)의 선형 보간
  shoulder: [1.0, 1.00163, 1.00326, 1.00500, 1.00673, 1.00931, 1.01188, 1.01503, 1.01818],
  armor:    [1.0, 1.00116, 1.00231, 1.00355, 1.00479, 1.00663, 1.00846, 1.01071, 1.01296],
  pants:    [1.0, 1.00134, 1.00267, 1.00410, 1.00552, 1.00764, 1.00976, 1.01235, 1.01494],
  gloves:   [1.0, 1.00221, 1.00441, 1.00676, 1.00911, 1.01258, 1.01605, 1.02029, 1.02452],
};

/**
 * 등급별 ratio (T4 유물 = 1.0 기준)
 *
 * 무기 측정값: 유물=고대=3507.66, 전율=4003.83 (전율만 의미 있는 차이)
 *   ※ T4 에스더는 1456.66로 측정됨 — lopec 시뮬레이터의 미지원/특수 처리로 추정, 제외
 * 방어구는 helmet 측정값을 5슬롯 공통으로 사용 (큰 차이 없을 것으로 가정)
 */
export const LOPEC_EQUIP_TIER_RATIO: Record<EquipSlot, Record<string, number>> = {
  weapon:   { '유물': 1.0, '고대': 1.0,     '전율': 1.14143 },
  helmet:   { '유물': 1.0, '고대': 1.01743, '전율': 1.03414 },
  shoulder: { '유물': 1.0, '고대': 1.01743, '전율': 1.03414 },
  armor:    { '유물': 1.0, '고대': 1.01743, '전율': 1.03414 },
  pants:    { '유물': 1.0, '고대': 1.01743, '전율': 1.03414 },
  gloves:   { '유물': 1.0, '고대': 1.01743, '전율': 1.03414 },
};

/**
 * 강화 단계 (0~25) → 누적 ratio 변환 (선형 보간)
 */
export const lookupNormalRatio = (slot: EquipSlot, level: number): number => {
  const steps = LOPEC_EQUIP_NORMAL_STEPS[slot];
  if (level <= 0) return steps[0];
  if (level >= 25) return steps[5];
  const idx = level / 5;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return steps[lo];
  const frac = idx - lo;
  return steps[lo] + (steps[hi] - steps[lo]) * frac;
};

/**
 * 상급재련 단계 (0~40) → 누적 ratio 변환 (선형 보간)
 */
export const lookupAdvancedRatio = (slot: EquipSlot, level: number): number => {
  const steps = LOPEC_EQUIP_ADVANCED_STEPS[slot];
  if (level <= 0) return steps[0];
  if (level >= 40) return steps[8];
  const idx = level / 5;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return steps[lo];
  const frac = idx - lo;
  return steps[lo] + (steps[hi] - steps[lo]) * frac;
};

/** EquipmentItem.Type → EquipSlot 매핑 (한국어 부위명) */
export const EQUIP_TYPE_TO_SLOT: Record<string, EquipSlot> = {
  '무기': 'weapon',
  '투구': 'helmet',
  '어깨': 'shoulder',
  '상의': 'armor',
  '하의': 'pants',
  '장갑': 'gloves',
};

/** Grade 문자열에서 T4 등급 추출 ("유물"/"고대"/"전율"/"에스더") */
export const extractEquipTier = (grade: string): string => {
  // Grade가 정확히 "유물"/"고대"/"전율"/"에스더"인 경우 (Lost Ark API 패턴)
  if (grade === '유물' || grade === '고대' || grade === '전율' || grade === '에스더') return grade;
  return '전율'; // 미상 시 기본값 (T4 표준)
};

/**
 * 무기 normal 강화 × advanced 상호작용 보정 테이블.
 *
 * lopec의 cp formula는 무기에서 normal과 advanced를 단순 곱연산하지 않고
 * cross-term을 포함하기 때문에 advanced level에 따라 normal 강화의
 * 효과가 다르게 나타남. 이를 반영하기 위해 2D 테이블 사용.
 *
 * Index: [advanced (0/10/20/30/40)][normal (15/20/25)]
 * Ratio normalized to weapon +15 at given advanced level.
 *
 * 한건뜬 측정 (T4 전율, 2026-05-18).
 *
 * 패턴: advanced 단계가 높을수록 weapon normal 강화 효과도 약간 증폭.
 *   +15→+25 ratio: X0 +13.37% → X40 +14.98% (1.6%p 차이)
 *
 * 검증: 끼욧통 (X30, +18→+25) 예상 ratio 1.10142 vs lopec 1.10234 (오차 0.09%).
 */
export const LOPEC_WEAPON_NORMAL_BY_ADV: Record<number, Record<number, number>> = {
  0:  { 15: 1.0, 20: 1.06582, 25: 1.13369 },
  10: { 15: 1.0, 20: 1.06786, 25: 1.14323 },
  20: { 15: 1.0, 20: 1.06897, 25: 1.14552 },
  30: { 15: 1.0, 20: 1.07005, 25: 1.14773 },
  40: { 15: 1.0, 20: 1.07111, 25: 1.14984 },
};

/**
 * 무기 advanced 단계 → 누적 ratio (normal level 의존).
 * 동일 LOPEC_WEAPON_NORMAL_BY_ADV 데이터에서 추출 — adv별 +N 정규화값을
 * 절대 cp로 환산 후 advanced 변화 ratio 계산.
 *
 * 데이터는 한건뜬 weapon 절대 cp (5 advanced × 3 normal):
 *   X0:  +15=4296.32, +20=4579.09, +25=4870.67
 *   X10: +15=3417.83, +20=3649.74, +25=3907.34
 *   X20: +15=3507.66, +20=3749.59, +25=4018.06
 *   X30: +15=3637.22, +20=3892.02, +25=4174.50
 *   X40: +15=3790.51, +20=4059.98, +25=4358.46
 *   ※ X0 시리즈는 다른 page state에서 측정되어 절대값 비교 불가 — X10+ 시리즈끼리만 비교 가능.
 */
export const LOPEC_WEAPON_ABS_CP: Record<number, Record<number, number>> = {
  10: { 15: 3417.83, 20: 3649.74, 25: 3907.34 },
  20: { 15: 3507.66, 20: 3749.59, 25: 4018.06 },
  30: { 15: 3637.22, 20: 3892.02, 25: 4174.50 },
  40: { 15: 3790.51, 20: 4059.98, 25: 4358.46 },
};

/**
 * 무기 advanced 단계 → 누적 ratio (normal level 의존).
 * 두 advanced 사이의 cp ratio = cp[modAdv][normal] / cp[curAdv][normal]
 * X0 절대값은 다른 state여서 비교 불가, X10 기준으로 정규화.
 */
export const lookupWeaponAdvancedAt = (advancedLevel: number, normalLevel: number): number => {
  // X10을 reference로 사용 (X0는 page state 다름)
  const cpAt = (adv: number, n: number): number => {
    const advClamped = Math.max(10, Math.min(40, adv));
    const advLo = Math.floor(advClamped / 10) * 10;
    const advHi = Math.min(40, advLo + 10);
    const cpAtAdvN = (a: number): number => {
      const table = LOPEC_WEAPON_ABS_CP[a];
      if (!table) return 0;
      const nClamped = Math.max(15, Math.min(25, n));
      if (nClamped >= 25) return table[25];
      if (nClamped >= 20) return table[20] + ((nClamped - 20) / 5) * (table[25] - table[20]);
      return table[15] + ((nClamped - 15) / 5) * (table[20] - table[15]);
    };
    if (advLo === advHi) return cpAtAdvN(advLo);
    return cpAtAdvN(advLo) + (cpAtAdvN(advHi) - cpAtAdvN(advLo)) * ((advClamped - advLo) / 10);
  };
  return cpAt(advancedLevel, normalLevel);
};

/**
 * weapon normal 강화 단계 → 누적 ratio (advanced level 의존).
 * +15 = 1.0 기준. advanced 단계는 0/10/20/30/40 사이에서 선형 보간.
 *
 * +0~+14 범위는 lopec model에서 비물리적인 cp drop이 발생 — 정상 범위 아님.
 * 이 범위는 기존 LOPEC_EQUIP_NORMAL_STEPS.weapon (X0 측정값) 사용으로 fallback.
 */
export const lookupWeaponNormalRatio = (normalLevel: number, advancedLevel: number): number => {
  // +15 미만은 fallback: 기존 1D 테이블 + +15 정규화
  if (normalLevel < 15) {
    const r15atX0 = LOPEC_EQUIP_NORMAL_STEPS.weapon[3]; // +15 in old table
    const rN = lookupNormalRatio('weapon', normalLevel);
    return rN / r15atX0; // +15 = 1.0이 되도록 정규화
  }

  const clampedAdv = Math.max(0, Math.min(40, advancedLevel));
  const advLo = Math.floor(clampedAdv / 10) * 10;
  const advHi = Math.min(40, advLo + 10);
  const advFrac = advHi > advLo ? (clampedAdv - advLo) / 10 : 0;

  const ratioAtAdvNormal = (adv: number, n: number): number => {
    const table = LOPEC_WEAPON_NORMAL_BY_ADV[adv];
    if (!table) return 1.0;
    const r15 = table[15];
    const r20 = table[20];
    const r25 = table[25];
    if (n >= 25) return r25;
    if (n >= 20) return r20 + ((n - 20) / 5) * (r25 - r20);
    return r15 + ((n - 15) / 5) * (r20 - r15);
  };

  const ratLo = ratioAtAdvNormal(advLo, normalLevel);
  const ratHi = ratioAtAdvNormal(advHi, normalLevel);
  return ratLo + (ratHi - ratLo) * advFrac;
};

/**
 * 방어구 advanced 단계 누적 ratio × normal level 상호작용 테이블.
 *
 * lopec model 검증: 방어구 advanced ratio가 normal level에 따라 증가
 *   (예: gloves X0→X40 ratio = +2.45% at +16 normal → +3.16% at +18 normal)
 *
 * 슬롯당 2개 normal baseline에서 advanced X0/X10/X20/X30/X40 측정.
 * 사이 값은 lookup에서 선형 보간.
 *
 * 끼욧통 (+18 normal, X40) 검증: 17pt 오차 → 1.5pt 이내 (예측 +181.38 vs lopec +179.86)
 */
export const LOPEC_ARMOR_ADV_BY_NORMAL: Partial<Record<EquipSlot, Record<number, number[]>>> = {
  helmet: {
    14: [1.0, 1.002937, 1.006072, 1.010725, 1.016425],
    18: [1.0, 1.003326, 1.006879, 1.012102, 1.018487],
  },
  shoulder: {
    15: [1.0, 1.003255, 1.006733, 1.011880, 1.018180],
    18: [1.0, 1.003862, 1.007981, 1.014042, 1.021435],
  },
  armor: {
    14: [1.0, 1.002313, 1.004785, 1.008458, 1.012966],
    18: [1.0, 1.003101, 1.006415, 1.011295, 1.017256],
  },
  pants: {
    14: [1.0, 1.002668, 1.005519, 1.009757, 1.014944],
    18: [1.0, 1.003617, 1.007476, 1.013154, 1.020087],
  },
  gloves: {
    16: [1.0, 1.004410, 1.009110, 1.016050, 1.024523],
    18: [1.0, 1.005715, 1.011803, 1.020735, 1.031604],
  },
};

/**
 * 방어구 advanced 단계 → 누적 ratio (normal level 의존).
 * normal × advanced cross-term 반영. weapon은 별도 처리(LOPEC_WEAPON_NORMAL_BY_ADV).
 */
export const lookupArmorAdvancedRatio = (
  slot: EquipSlot,
  advancedLevel: number,
  normalLevel: number,
): number => {
  const table = LOPEC_ARMOR_ADV_BY_NORMAL[slot];
  if (!table) return 1.0;
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (keys.length === 0) return 1.0;

  const ratioAtNormal = (n: number, advL: number): number => {
    const arr = table[n];
    if (!arr) return 1.0;
    // arr: [X0, X10, X20, X30, X40] — index = X/10
    const advC = Math.max(0, Math.min(40, advL));
    const idx = advC / 10;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return arr[lo];
    return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
  };

  // normal level을 두 측정 baseline 사이에서 보간
  const nMin = keys[0];
  const nMax = keys[keys.length - 1];
  const nClamped = Math.max(nMin, Math.min(nMax, normalLevel));
  if (keys.length === 1) return ratioAtNormal(keys[0], advancedLevel);

  let lo = keys[0];
  let hi = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (nClamped >= keys[i] && nClamped <= keys[i + 1]) {
      lo = keys[i];
      hi = keys[i + 1];
      break;
    }
  }
  const rLo = ratioAtNormal(lo, advancedLevel);
  const rHi = ratioAtNormal(hi, advancedLevel);
  if (lo === hi) return rLo;
  return rLo + (rHi - rLo) * ((nClamped - lo) / (hi - lo));
};
