/**
 * lopec 시뮬레이터에서 직접 추출한 정확 계수 (2026-05-15 발키리 빛의 기사 기준)
 *
 * 추출 방식: chrome-devtools로 lopec.kr/character/simulator/익명 측정 fixture 페이지의
 * 각 select 드롭다운을 자동 변경하며 점수 차이를 측정.
 *
 * 주의: 이 데이터는 캐릭터/직업/스킬 빌드에 따라 달라질 수 있음. 다른 직업으로
 * 일반화하려면 직업별 재측정 필요. 현재는 사용자 캐릭터 케이스에 최적화.
 */

type EngravingEffectRows = [number, number, number, number, number][];

const MASS_INCREASE_EFFECTS: EngravingEffectRows = [
  [16.00, 19.00, 19.75, 21.25, 22.00],
  [16.75, 19.75, 20.50, 22.00, 22.75],
  [17.50, 20.50, 21.25, 22.75, 23.50],
  [18.25, 21.25, 22.00, 23.50, 24.25],
  [19.00, 22.00, 22.75, 24.25, 25.00],
];

const AMBUSH_MASTER_EFFECTS: EngravingEffectRows = [
  [15.30, 18.00, 18.70, 20.00, 20.70],
  [16.00, 18.70, 19.40, 20.70, 21.40],
  [16.70, 19.40, 20.10, 21.40, 22.10],
  [17.40, 20.10, 20.80, 22.10, 22.80],
  [18.10, 20.80, 21.50, 22.80, 23.50],
];

const GENERIC_14_EFFECTS: EngravingEffectRows = [
  [14.00, 17.00, 17.75, 19.25, 20.00],
  [14.75, 17.75, 18.50, 20.00, 20.75],
  [15.50, 18.50, 19.25, 20.75, 21.50],
  [16.25, 19.25, 20.00, 21.50, 22.25],
  [17.00, 20.00, 20.75, 22.25, 23.00],
];

const CHARGE_EFFECTS: EngravingEffectRows = [
  [14.40, 16.80, 17.40, 18.60, 19.20],
  [15.00, 17.40, 18.00, 19.20, 19.80],
  [15.60, 18.00, 18.60, 19.80, 20.40],
  [16.20, 18.60, 19.20, 20.40, 21.00],
  [16.80, 19.20, 19.80, 21.00, 21.60],
];

const ETHER_PREDATOR_EFFECTS: EngravingEffectRows = [
  [12.60, 15.60, 16.50, 18.00, 18.60],
  [13.50, 16.50, 17.40, 18.90, 19.50],
  [14.40, 17.40, 18.30, 19.80, 20.40],
  [15.30, 18.30, 19.20, 20.70, 21.30],
  [16.20, 19.20, 20.10, 21.60, 22.20],
];

const MP_EFFICIENCY_EFFECTS: EngravingEffectRows = [
  [13.00, 16.00, 16.75, 18.25, 19.00],
  [13.75, 16.75, 17.50, 19.00, 19.75],
  [14.50, 17.50, 18.25, 19.75, 20.50],
  [15.25, 18.25, 19.00, 20.50, 21.25],
  [16.00, 19.00, 19.75, 21.25, 22.00],
];

const WEAK_POINT_DETECTION_EFFECTS: EngravingEffectRows = [
  [9.90, 12.30, 12.90, 14.10, 14.70],
  [10.73, 13.13, 13.73, 14.93, 15.53],
  [11.55, 13.95, 14.55, 15.75, 16.35],
  [12.38, 14.78, 15.38, 16.58, 17.18],
  [13.20, 15.60, 16.20, 17.40, 18.00],
];

const PRECISE_DAGGER_EFFECTS: EngravingEffectRows = [
  [10.60, 12.70, 13.23, 14.28, 14.80],
  [11.13, 13.23, 13.76, 14.81, 15.33],
  [11.65, 13.75, 14.28, 15.33, 15.85],
  [12.18, 14.28, 14.81, 15.86, 16.38],
  [12.70, 14.80, 15.33, 16.38, 16.90],
];

const PROPULSION_EFFECTS: EngravingEffectRows = [
  [9.80, 11.90, 12.43, 13.48, 14.00],
  [10.33, 12.43, 12.96, 14.01, 14.53],
  [10.85, 12.95, 13.48, 14.53, 15.05],
  [11.38, 13.48, 14.01, 15.06, 15.58],
  [11.90, 14.00, 14.53, 15.58, 16.10],
];

const MAGICK_STREAM_EFFECTS: EngravingEffectRows = [
  [7.53, 7.53, 7.53, 7.53, 7.53],
  [8.40, 8.40, 8.40, 8.40, 8.40],
  [9.29, 9.29, 9.29, 9.29, 9.29],
  [10.20, 10.20, 10.20, 10.20, 10.20],
  [11.11, 11.11, 11.11, 11.11, 11.11],
];

const SIGHT_FOCUS_EFFECTS: EngravingEffectRows = [
  [7.50, 8.70, 9.00, 9.60, 9.90],
  [7.88, 9.08, 9.38, 9.98, 10.28],
  [8.25, 9.45, 9.75, 10.35, 10.65],
  [8.63, 9.83, 10.13, 10.73, 11.03],
  [9.00, 10.20, 10.50, 11.10, 11.40],
];

const BROKEN_BONE_EFFECTS: EngravingEffectRows = [
  [7.40, 8.20, 8.40, 8.80, 9.00],
  [7.65, 8.45, 8.65, 9.05, 9.25],
  [7.90, 8.70, 8.90, 9.30, 9.50],
  [8.15, 8.95, 9.15, 9.55, 9.75],
  [8.40, 9.20, 9.40, 9.80, 10.00],
];

const SHIELD_PIERCING_EFFECTS: EngravingEffectRows = [
  [4.60, 5.40, 5.60, 6.00, 6.20],
  [4.80, 5.60, 5.80, 6.20, 6.40],
  [5.00, 5.80, 6.00, 6.40, 6.60],
  [5.20, 6.00, 6.20, 6.60, 6.80],
  [5.40, 6.20, 6.40, 6.80, 7.00],
];

const DROPS_OF_ETHER_EFFECTS: EngravingEffectRows = [
  [4.00, 4.48, 4.60, 4.84, 4.96],
  [4.16, 4.64, 4.76, 5.00, 5.12],
  [4.32, 4.80, 4.92, 5.16, 5.28],
  [4.48, 4.96, 5.08, 5.32, 5.44],
  [4.64, 5.12, 5.24, 5.48, 5.60],
];

const CONTENDER_EFFECTS: EngravingEffectRows = [
  [1.68, 1.98, 2.06, 2.21, 2.28],
  [1.68, 1.98, 2.06, 2.21, 2.28],
  [1.89, 2.19, 2.27, 2.42, 2.49],
  [1.89, 2.19, 2.27, 2.42, 2.49],
  [2.10, 2.40, 2.48, 2.63, 2.70],
];

const CRUSHING_FIST_EFFECTS: EngravingEffectRows = [
  [1.30, 1.45, 1.49, 1.56, 1.60],
  [1.38, 1.53, 1.57, 1.64, 1.68],
  [1.45, 1.60, 1.64, 1.71, 1.75],
  [1.53, 1.68, 1.72, 1.79, 1.83],
  [1.60, 1.75, 1.79, 1.86, 1.90],
];

/** Books X0~X4 × stone Lv0~Lv4 누적 각인 효과(%). */
export const LOPEC_ENGRAVING_TOTAL_EFFECTS: Record<string, EngravingEffectRows> = {
  원한: [
    [18.00, 21.00, 21.75, 23.25, 24.00],
    [18.75, 21.75, 22.50, 24.00, 24.75],
    [19.50, 22.50, 23.25, 24.75, 25.50],
    [20.25, 23.25, 24.00, 25.50, 26.25],
    [21.00, 24.00, 24.75, 26.25, 27.00],
  ],
  아드레날린: [
    [15.20, 18.08, 18.80, 20.18, 20.90],
    [16.25, 19.13, 19.85, 21.23, 21.95],
    [17.30, 20.18, 20.90, 22.28, 23.00],
    [18.35, 21.23, 21.95, 23.33, 24.05],
    [19.40, 22.28, 23.00, 24.38, 25.10],
  ],
  '예리한 둔기': [
    [14.39, 17.18, 17.89, 19.31, 19.98],
    [15.13, 17.92, 18.63, 20.05, 20.72],
    [15.88, 18.67, 19.38, 20.80, 21.47],
    [16.62, 19.41, 20.12, 21.54, 22.21],
    [17.36, 20.15, 20.86, 22.28, 22.95],
  ],
  '달인의 저력': GENERIC_14_EFFECTS,
  바리케이드: GENERIC_14_EFFECTS,
  '안정된 상태': GENERIC_14_EFFECTS,
  '저주받은 인형': GENERIC_14_EFFECTS,
  '타격의 대가': GENERIC_14_EFFECTS,
  돌격대장: [
    [16.00, 19.00, 19.76, 21.28, 22.00],
    [16.80, 19.80, 20.56, 22.08, 22.80],
    [17.60, 20.60, 21.36, 22.88, 23.60],
    [18.40, 21.40, 22.16, 23.68, 24.40],
    [19.20, 22.20, 22.96, 24.48, 25.20],
  ],
  '질량 증가': MASS_INCREASE_EFFECTS,
  '결투의 대가': AMBUSH_MASTER_EFFECTS,
  '기습의 대가': AMBUSH_MASTER_EFFECTS,
  속전속결: CHARGE_EFFECTS,
  '슈퍼 차지': CHARGE_EFFECTS,
  '에테르 포식자': ETHER_PREDATOR_EFFECTS,
  '마나 효율 증가': MP_EFFICIENCY_EFFECTS,
  '약자 무시': WEAK_POINT_DETECTION_EFFECTS,
  '정밀 단도': PRECISE_DAGGER_EFFECTS,
  추진력: PROPULSION_EFFECTS,
  '마나의 흐름': MAGICK_STREAM_EFFECTS,
  '시선 집중': SIGHT_FOCUS_EFFECTS,
  '부러진 뼈': BROKEN_BONE_EFFECTS,
  실드관통: SHIELD_PIERCING_EFFECTS,
  '실드 관통': SHIELD_PIERCING_EFFECTS,
  구슬동자: DROPS_OF_ETHER_EFFECTS,
  승부사: CONTENDER_EFFECTS,
  '분쇄의 주먹': CRUSHING_FIST_EFFECTS,
};

/** 보석 1개당 순수 전투력 증가량(%). */
export const LOPEC_GEM_PURE_POWER_BY_TIER: Record<'T3' | 'T4', Record<number, number>> = {
  T3: {
    1: 0.48,
    2: 0.96,
    3: 1.44,
    4: 1.92,
    5: 2.40,
    6: 2.88,
    7: 3.36,
    8: 3.84,
    9: 4.80,
    10: 6.40,
  },
  T4: {
    1: 1.28,
    2: 1.92,
    3: 2.56,
    4: 3.20,
    5: 3.84,
    6: 4.48,
    7: 5.12,
    8: 5.76,
    9: 6.40,
    10: 7.04,
  },
};

/** 4티어 보석 기본 공격력% 증가량. 전체 보석 합산 후 별도 배율로 적용한다. */
export const LOPEC_T4_GEM_BASE_ATTACK_BY_LEVEL: Record<number, number> = {
  1: 0,
  2: 0.05,
  3: 0.10,
  4: 0.20,
  5: 0.30,
  6: 0.45,
  7: 0.60,
  8: 0.80,
  9: 1.00,
  10: 1.20,
};

// ============================================================
// 장비 (무기 + 방어구 5슬롯)
//
// 추출 방식: lopec.kr 시뮬레이터의 armory-{slot}-{normal|advanced|tier} 드롭다운을
// chrome-devtools로 자동 변경하며 인게임 전투력(combatPower) 차이 측정.
//
// 익명 측정 fixture 캐릭터 (발키리 빛의 기사, T4 전율, 2026-05-18 측정 기준)
//
// 핵심 발견:
// - 무기 normal +25 vs +0 = +39.08% — 단일 가장 큰 영향
// - 무기 advanced X40 vs X0 = +14.15%
// - 방어구 advanced는 무기의 ~10% (장갑 +2.45% / 상의 +1.30% etc.)
// - 슬롯별로 ratio 패턴이 다르므로 통일 계수 불가, 슬롯별 저장
// - 상급재련 X30/X40 구간에 추가 보너스 step (1.3%/5단계 vs 보너스 2.4~2.9%/5단계)
// ============================================================

export type StandardEquipSlot = 'weapon' | 'helmet' | 'shoulder' | 'armor' | 'pants' | 'gloves';
export const ARMLET_UNEQUIPPED_LEVEL = -1;
export type EquippedArmletLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 15 | 20 | 25;
export type ArmletLevel = typeof ARMLET_UNEQUIPPED_LEVEL | EquippedArmletLevel;
export type EquipSlot = StandardEquipSlot | 'armlet';

export const STANDARD_EQUIP_SLOTS: StandardEquipSlot[] = ['weapon', 'helmet', 'shoulder', 'armor', 'pants', 'gloves'];
export const ARMLET_LEVELS: EquippedArmletLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25];
export const ARMLET_SELECT_LEVELS: ArmletLevel[] = [ARMLET_UNEQUIPPED_LEVEL, ...ARMLET_LEVELS];

export interface ArmletPower {
  readonly weaponAttack: number;
  readonly mainStat: number;
  readonly baseAttack: number;
  readonly baseAttackPercent: number;
  readonly grade: string;
  readonly icon: string;
}

export const ARMLET_POWER_BY_LEVEL: Record<ArmletLevel, ArmletPower> = {
  [-1]: { weaponAttack: 0, mainStat: 0, baseAttack: 0, baseAttackPercent: 0, grade: '미착용', icon: '/images/arms1.webp' },
  0: { weaponAttack: 3500, mainStat: 10500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  1: { weaponAttack: 5350, mainStat: 10500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  2: { weaponAttack: 5350, mainStat: 16500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  3: { weaponAttack: 7210, mainStat: 16500, baseAttack: 0, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  4: { weaponAttack: 7210, mainStat: 22530, baseAttack: 0, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  5: { weaponAttack: 7210, mainStat: 22530, baseAttack: 850, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  6: { weaponAttack: 9077, mainStat: 22530, baseAttack: 850, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  7: { weaponAttack: 9077, mainStat: 28608, baseAttack: 850, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  8: { weaponAttack: 10969, mainStat: 28608, baseAttack: 850, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  9: { weaponAttack: 10969, mainStat: 34746, baseAttack: 850, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  10: { weaponAttack: 10969, mainStat: 34746, baseAttack: 2030, baseAttackPercent: 0, grade: '영웅', icon: '/images/arms1.webp' },
  15: { weaponAttack: 14817, mainStat: 47268, baseAttack: 3690, baseAttackPercent: 1.0, grade: '전설', icon: '/images/arms2.webp' },
  20: { weaponAttack: 18794, mainStat: 60216, baseAttack: 5980, baseAttackPercent: 2.0, grade: '유물', icon: '/images/arms3.webp' },
  25: { weaponAttack: 22940, mainStat: 73710, baseAttack: 9050, baseAttackPercent: 3.0, grade: '고대', icon: '/images/arms4.webp' },
};

export const isArmletLevel = (level: number): level is ArmletLevel =>
  level === ARMLET_UNEQUIPPED_LEVEL || ARMLET_LEVELS.some((armletLevel) => armletLevel === level);

export const resolveArmletLevel = (level: number): ArmletLevel | null =>
  isArmletLevel(level) ? level : null;

/**
 * 상급 재련 단계별 누적 ratio (해당 슬롯의 X0 기준)
 * index 0..8 = X(i*5), 즉 X0, X5, X10, ..., X40
 *
 * 무기/투구는 5단계 간격 실측. 나머지 4슬롯은 10단계 간격 실측 + 선형 보간.
 * 무기/투구 데이터에서 보이는 X30/X40 보너스 step 패턴은 보간값에도 반영 (대략적).
 */
export const LOPEC_EQUIP_ADVANCED_STEPS: Record<StandardEquipSlot, number[]> = {
  weapon:   [1.0, 1.01322, 1.02673, 1.04052, 1.05461, 1.06899, 1.09446, 1.10960, 1.14148],
  helmet:   [1.0, 1.00144, 1.00294, 1.00448, 1.00607, 1.00773, 1.01073, 1.01253, 1.01643],
  // X5,X15,X25,X35는 인접 측정값(10단계 간격)의 선형 보간
  shoulder: [1.0, 1.00163, 1.00326, 1.00500, 1.00673, 1.00931, 1.01188, 1.01503, 1.01818],
  armor:    [1.0, 1.00116, 1.00231, 1.00355, 1.00479, 1.00663, 1.00846, 1.01071, 1.01296],
  pants:    [1.0, 1.00134, 1.00267, 1.00410, 1.00552, 1.00764, 1.00976, 1.01235, 1.01494],
  gloves:   [1.0, 1.00221, 1.00441, 1.00676, 1.00911, 1.01258, 1.01605, 1.02029, 1.02452],
};

/**
 * 상급재련 단계 (0~40) → 누적 ratio 변환 (선형 보간)
 */
export const lookupAdvancedRatio = (slot: StandardEquipSlot, level: number): number => {
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
  '완갑': 'armlet',
};

/** Grade 문자열에서 T4 등급 추출 ("유물"/"고대"/"전율"/"에스더") */
export const extractEquipTier = (grade: string): string => {
  // Grade가 정확히 "유물"/"고대"/"전율"/"에스더"인 경우 (Lost Ark API 패턴)
  if (grade === '영웅' || grade === '전설' || grade === '유물' || grade === '고대' || grade === '전율' || grade === '에스더') return grade;
  return '전율'; // 미상 시 기본값 (T4 표준)
};

/**
 * 무기 advanced 단계 → 누적 ratio (normal level 의존).
 * advanced별 무기 절대 cp 측정값으로 advanced 변화 ratio 계산.
 *
 * 데이터는 익명 측정 fixture weapon 절대 cp (5 advanced × 3 normal):
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
 * normal × advanced cross-term 반영. weapon은 별도 처리(LOPEC_WEAPON_ABS_CP).
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
