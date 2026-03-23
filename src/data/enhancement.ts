/**
 * 로스트아크 장비 강화 데이터
 *
 * - 에기르/세르카 장비 일반 재련 (10강~25강)
 * - 실패할수록 기본 확률 증가 + 장기백(천장) 시스템 동시 적용
 * - 빙하의 숨결 / 재봉술 선택 사용 (합연산)
 *
 * [장기백 메커니즘 역설계]
 * 매 실패 후 장기백 게이지 += 해당 시도 성공확률 × PITY_K
 * 게이지가 1.0(100%)에 도달하면 다음 시도 천장 발동
 * 장기백 천장은 강화 단계·부스터 조합마다 다름 → ceiling 필드에 직접 저장
 */

// ─────────────────────────────────────────────
// 재료 타입
// ─────────────────────────────────────────────

export type MaterialType =
  // 방어구 - 일반 재련
  | '수호석'
  | '돌파석'
  | '아비도스 융화 재료'
  | '운명의 파편'
  | '빙하의 숨결'
  | '재봉술: 업화 [11-14]'
  | '재봉술: 업화 [15-18]'
  | '재봉술: 업화 [19-20]'
  // 무기 - 일반 재련
  | '파괴석'
  | '용암의 숨결'
  | '야금술: 업화 [11-14]'
  | '야금술: 업화 [15-18]'
  | '야금술: 업화 [19-20]'
  // 방어구 - 상급 재련 책
  | '장인의 재봉술: 1단계'
  | '장인의 재봉술: 2단계'
  | '장인의 재봉술: 3단계'
  | '장인의 재봉술: 4단계'
  // 무기 - 상급 재련 책
  | '장인의 야금술: 1단계'
  | '장인의 야금술: 2단계'
  | '장인의 야금술: 3단계'
  | '장인의 야금술: 4단계'
  // 세르카 방어구 - 일반 재련
  | '운명의 수호석 결정'
  | '위대한 운명의 돌파석'
  | '상급 아비도스 융화'
  // 세르카 무기 - 일반 재련
  | '운명의 파괴석 결정'
  ;

export interface MaterialAmount {
  type: MaterialType;
  amount: number;
}

// ─────────────────────────────────────────────
// 강화 단계
// ─────────────────────────────────────────────

export interface EnhancementCeiling {
  /** 책X 숨결X */
  none: number;
  /** 책O 숨결X 또는 책X 숨결O (대칭, 하나만 사용 시) */
  partial?: number;
  /** 책O 숨결O */
  both?: number;
}

export interface EnhancementStep {
  /** 현재 강 (10 = 10강 → 11강) */
  from: number;
  /** 1트 기본 성공 확률 (0.10 = 10%) */
  baseSuccessRate: number;
  /** 실패 1회당 기본 확률 증가량 (0.01 = +1%) */
  rateIncreasePerFailure: number;
  /** 기본 확률 상한 */
  maxBaseSuccessRate: number;
  /** 재봉술 사용 시 추가 확률 */
  bookBonus: number;
  /** 빙하의 숨결 사용 시 추가 확률 */
  breathBonus: number;
  /** 장기백 천장 트수 (부스터 조합별) */
  ceiling: EnhancementCeiling;
  /** 항상 소모되는 재료 */
  baseMaterials: MaterialAmount[];
  /** 재봉술 (선택, 사용 시 비용 추가) */
  bookMaterial?: MaterialAmount;
  /** 빙하의 숨결 (선택, 사용 시 비용 추가) */
  breathMaterial?: MaterialAmount;
  /** 직접 골드 비용 */
  gold: number;
  /** 실링 비용 */
  silver: number;
}

// ─────────────────────────────────────────────
// 에기르 방어구 일반 재련
// ─────────────────────────────────────────────

export const AEGIR_ARMOR_STEPS: EnhancementStep[] = [
  {
    from: 10,
    baseSuccessRate: 0.10,
    rateIncreasePerFailure: 0.01,  // 실패할수록 기본 확률 +1%
    maxBaseSuccessRate: 0.20,      // 20%에서 캡
    bookBonus: 0.10,
    breathBonus: 0.10,
    ceiling: { none: 15, partial: 10, both: 8 },
    baseMaterials: [
      { type: '수호석',        amount: 750  },
      { type: '돌파석',        amount: 11   },
      { type: '아비도스 융화 재료',  amount: 7    },
      { type: '운명의 파편',   amount: 3000 },
    ],
    bookMaterial:   { type: '재봉술: 업화 [11-14]', amount: 1  },
    breathMaterial: { type: '빙하의 숨결',           amount: 20 },
    gold:   970,
    silver: 33000,
  },
  {
    from: 11,
    baseSuccessRate: 0.10,
    rateIncreasePerFailure: 0.01,  // 실패할수록 기본 확률 +1%
    maxBaseSuccessRate: 0.20,      // 20%에서 캡
    bookBonus: 0.10,
    breathBonus: 0.10,
    ceiling: { none: 15, partial: 10, both: 8 },
    baseMaterials: [
      { type: '수호석',        amount: 780  },
      { type: '돌파석',        amount: 13   },
      { type: '아비도스 융화 재료',  amount: 7    },
      { type: '운명의 파편',   amount: 3180 },
    ],
    bookMaterial:   { type: '재봉술: 업화 [11-14]', amount: 1  },
    breathMaterial: { type: '빙하의 숨결',           amount: 20 },
    gold:   1070,
    silver: 33000,
  },
  {
    from: 12,
    baseSuccessRate: 0.05,
    rateIncreasePerFailure: 0.005, // 실패할수록 기본 확률 +0.5%
    maxBaseSuccessRate: 0.10,      // 10%에서 캡
    bookBonus: 0.05,
    breathBonus: 0.05,
    ceiling: { none: 26, partial: 18, both: 14 },
    baseMaterials: [
      { type: '수호석',        amount: 840  },
      { type: '돌파석',        amount: 14   },
      { type: '아비도스 융화 재료',  amount: 9    },
      { type: '운명의 파편',   amount: 4560 },
    ],
    bookMaterial:   { type: '재봉술: 업화 [11-14]', amount: 1  },
    breathMaterial: { type: '빙하의 숨결',           amount: 20 },
    gold:   1190,
    silver: 33000,
  },
  {
    from: 13,
    baseSuccessRate: 0.05,
    rateIncreasePerFailure: 0.005, // 실패할수록 기본 확률 +0.5%
    maxBaseSuccessRate: 0.10,      // 10%에서 캡
    bookBonus: 0.05,
    breathBonus: 0.05,
    ceiling: { none: 26, partial: 18, both: 14 },
    baseMaterials: [
      { type: '수호석',        amount: 930  },
      { type: '돌파석',        amount: 16   },
      { type: '아비도스 융화 재료',  amount: 9    },
      { type: '운명의 파편',   amount: 4920 },
    ],
    bookMaterial:   { type: '재봉술: 업화 [11-14]', amount: 1  },
    breathMaterial: { type: '빙하의 숨결',           amount: 20 },
    gold:   1320,
    silver: 33000,
  },
  {
    from: 14,
    baseSuccessRate: 0.04,
    rateIncreasePerFailure: 0.004, // 실패할수록 기본 확률 +0.4%
    maxBaseSuccessRate: 0.08,      // 8%에서 캡
    bookBonus: 0.05,
    breathBonus: 0.05,
    ceiling: { none: 31, partial: 20, both: 15 },
    baseMaterials: [
      { type: '수호석',        amount: 1020  },
      { type: '돌파석',        amount: 18   },
      { type: '아비도스 융화 재료',  amount: 11    },
      { type: '운명의 파편',   amount: 5280 },
    ],
    bookMaterial:   { type: '재봉술: 업화 [11-14]', amount: 1  },
    breathMaterial: { type: '빙하의 숨결',           amount: 20 },
    gold:   1460,
    silver: 33000,
  },
  {
    from: 15,
    baseSuccessRate: 0.04,
    rateIncreasePerFailure: 0.004, // 실패할수록 기본 확률 +0.4%
    maxBaseSuccessRate: 0.08,      // 8%에서 캡
    bookBonus: 0.04,
    breathBonus: 0.04,
    ceiling: { none: 31, partial: 21, both: 16 },
    baseMaterials: [
      { type: '수호석',        amount: 1170  },
      { type: '돌파석',        amount: 20   },
      { type: '아비도스 융화 재료',  amount: 11    },
      { type: '운명의 파편',   amount: 5640 },
    ],
    bookMaterial:   { type: '재봉술: 업화 [15-18]', amount: 1  },
    breathMaterial: { type: '빙하의 숨결',           amount: 20 },
    gold:   1600,
    silver: 33000,
  },
  {
    from: 16,
    baseSuccessRate: 0.03,
    rateIncreasePerFailure: 0.003, // 실패할수록 기본 확률 +0.3%
    maxBaseSuccessRate: 0.06,      // 6%에서 캡
    bookBonus: 0.04,
    breathBonus: 0.04,
    ceiling: { none: 40, partial: 25, both: 18 },
    baseMaterials: [
      { type: '수호석',        amount: 1320  },
      { type: '돌파석',        amount: 22   },
      { type: '아비도스 융화 재료',  amount: 15    },
      { type: '운명의 파편',   amount: 7200 },
    ],
    bookMaterial:   { type: '재봉술: 업화 [15-18]', amount: 1  },
    breathMaterial: { type: '빙하의 숨결',           amount: 20 },
    gold:   1760,
    silver: 39000,
  },
  {
    from: 17,
    baseSuccessRate: 0.03,
    rateIncreasePerFailure: 0.003, // 실패할수록 기본 확률 +0.3%
    maxBaseSuccessRate: 0.06,      // 6%에서 캡
    bookBonus: 0.03,
    breathBonus: 0.03,
    ceiling: { none: 40, partial: 27, both: 21 },
    baseMaterials: [
      { type: '수호석',        amount: 1470  },
      { type: '돌파석',        amount: 23   },
      { type: '아비도스 융화 재료',  amount: 15    },
      { type: '운명의 파편',   amount: 7740 },
    ],
    bookMaterial:   { type: '재봉술: 업화 [15-18]', amount: 1  },
    breathMaterial: { type: '빙하의 숨결',           amount: 20 },
    gold:   1930,
    silver: 39000,
  },
  {
    from: 18,
    baseSuccessRate: 0.03,
    rateIncreasePerFailure: 0.003, // 실패할수록 기본 확률 +0.3%
    maxBaseSuccessRate: 0.06,      // 6%에서 캡
    bookBonus: 0.03,
    breathBonus: 0.03,
    ceiling: { none: 40, partial: 27, both: 21 },
    baseMaterials: [
      { type: '수호석',        amount: 1620  },
      { type: '돌파석',        amount: 25   },
      { type: '아비도스 융화 재료',  amount: 15    },
      { type: '운명의 파편',   amount: 8220 },
    ],
    bookMaterial:   { type: '재봉술: 업화 [19-20]', amount: 1  },
    breathMaterial: { type: '빙하의 숨결',           amount: 20 },
    gold:   2110,
    silver: 39000,
  },
  {
    from: 19,
    baseSuccessRate: 0.015,
    rateIncreasePerFailure: 0.0015, // 실패할수록 기본 확률 +0.15%
    maxBaseSuccessRate: 0.03,       // 3%에서 캡
    bookBonus: 0.015,
    breathBonus: 0.015,
    ceiling: { none: 76, partial: 51, both: 39 },
    baseMaterials: [
      { type: '수호석',        amount: 1770  },
      { type: '돌파석',        amount: 27   },
      { type: '아비도스 융화 재료',  amount: 21   },
      { type: '운명의 파편',   amount: 9600 },
    ],
    bookMaterial:   { type: '재봉술: 업화 [19-20]', amount: 1  },
    breathMaterial: { type: '빙하의 숨결',           amount: 25 },
    gold:   2300,
    silver: 54000,
  },
  {
    from: 20,
    baseSuccessRate: 0.015,
    rateIncreasePerFailure: 0.0015,
    maxBaseSuccessRate: 0.03,
    bookBonus: 0,
    breathBonus: 0.015,
    ceiling: { none: 76, partial: 51 },
    baseMaterials: [
      { type: '수호석',        amount: 1920  },
      { type: '돌파석',        amount: 29   },
      { type: '아비도스 융화 재료',  amount: 21   },
      { type: '운명의 파편',   amount: 10260 },
    ],
    breathMaterial: { type: '빙하의 숨결', amount: 25 },
    gold:   2500,
    silver: 54000,
  },
  {
    from: 21,
    baseSuccessRate: 0.01,
    rateIncreasePerFailure: 0.001,  // 실패할수록 기본 확률 +0.1%
    maxBaseSuccessRate: 0.02,       // 2%에서 캡
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 112, partial: 75 },
    baseMaterials: [
      { type: '수호석',        amount: 2220  },
      { type: '돌파석',        amount: 31   },
      { type: '아비도스 융화 재료',  amount: 21   },
      { type: '운명의 파편',   amount: 10920 },
    ],
    breathMaterial: { type: '빙하의 숨결', amount: 25 },
    gold:   2710,
    silver: 72000,
  },
  {
    from: 22,
    baseSuccessRate: 0.01,
    rateIncreasePerFailure: 0.001,  // 실패할수록 기본 확률 +0.1%
    maxBaseSuccessRate: 0.02,       // 2%에서 캡
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 112, partial: 75 },
    baseMaterials: [
      { type: '수호석',        amount: 2400  },
      { type: '돌파석',        amount: 34   },
      { type: '아비도스 융화 재료',  amount: 21   },
      { type: '운명의 파편',   amount: 11520 },
    ],
    breathMaterial: { type: '빙하의 숨결', amount: 25 },
    gold:   2920,
    silver: 72000,
  },
  {
    from: 23,
    baseSuccessRate: 0.005,
    rateIncreasePerFailure: 0.0005, // 실패할수록 기본 확률 +0.05%
    maxBaseSuccessRate: 0.01,       // 1%에서 캡
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 219, partial: 110 },
    baseMaterials: [
      { type: '수호석',        amount: 2520  },
      { type: '돌파석',        amount: 36   },
      { type: '아비도스 융화 재료',  amount: 30   },
      { type: '운명의 파편',   amount: 12240 },
    ],
    breathMaterial: { type: '빙하의 숨결', amount: 50 },
    gold:   3150,
    silver: 90000,
  },
  {
    from: 24,
    baseSuccessRate: 0.005,
    rateIncreasePerFailure: 0.0005, // 실패할수록 기본 확률 +0.05%
    maxBaseSuccessRate: 0.01,       // 1%에서 캡
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 219, partial: 110 },
    baseMaterials: [
      { type: '수호석',        amount: 2700  },
      { type: '돌파석',        amount: 40   },
      { type: '아비도스 융화 재료',  amount: 30   },
      { type: '운명의 파편',   amount: 12900 },
    ],
    breathMaterial: { type: '빙하의 숨결', amount: 50 },
    gold:   3390,
    silver: 90000,
  },
];

// ─────────────────────────────────────────────
// 에기르 무기 일반 재련
// ─────────────────────────────────────────────

export const AEGIR_WEAPON_STEPS: EnhancementStep[] = [
  {
    from: 10,
    baseSuccessRate: 0.10,
    rateIncreasePerFailure: 0.01,
    maxBaseSuccessRate: 0.20,
    bookBonus: 0.10,
    breathBonus: 0.10,
    ceiling: { none: 15, partial: 10, both: 8 },
    baseMaterials: [
      { type: '파괴석',            amount: 1250 },
      { type: '돌파석',            amount: 18   },
      { type: '아비도스 융화 재료', amount: 12   },
      { type: '운명의 파편',       amount: 5000 },
    ],
    bookMaterial:   { type: '야금술: 업화 [11-14]', amount: 1  },
    breathMaterial: { type: '용암의 숨결',           amount: 20 },
    gold:   1620,
    silver: 55000,
  },
  {
    from: 11,
    baseSuccessRate: 0.10,
    rateIncreasePerFailure: 0.01,
    maxBaseSuccessRate: 0.20,
    bookBonus: 0.10,
    breathBonus: 0.10,
    ceiling: { none: 15, partial: 10, both: 8 },
    baseMaterials: [
      { type: '파괴석',            amount: 1300 },
      { type: '돌파석',            amount: 21   },
      { type: '아비도스 융화 재료', amount: 12   },
      { type: '운명의 파편',       amount: 5300 },
    ],
    bookMaterial:   { type: '야금술: 업화 [11-14]', amount: 1  },
    breathMaterial: { type: '용암의 숨결',           amount: 20 },
    gold:   1790,
    silver: 55000,
  },
  {
    from: 12,
    baseSuccessRate: 0.05,
    rateIncreasePerFailure: 0.01,
    maxBaseSuccessRate: 0.10,
    bookBonus: 0.05,
    breathBonus: 0.05,
    ceiling: { none: 26, partial: 18, both: 14 },
    baseMaterials: [
      { type: '파괴석',            amount: 1400 },
      { type: '돌파석',            amount: 24   },
      { type: '아비도스 융화 재료', amount: 15   },
      { type: '운명의 파편',       amount: 7600 },
    ],
    bookMaterial:   { type: '야금술: 업화 [11-14]', amount: 1  },
    breathMaterial: { type: '용암의 숨결',           amount: 20 },
    gold:   1990,
    silver: 55000,
  },
  {
    from: 13,
    baseSuccessRate: 0.05,
    rateIncreasePerFailure: 0.005,
    maxBaseSuccessRate: 0.10,
    bookBonus: 0.05,
    breathBonus: 0.05,
    ceiling: { none: 26, partial: 18, both: 14 },
    baseMaterials: [
      { type: '파괴석',            amount: 1550 },
      { type: '돌파석',            amount: 27   },
      { type: '아비도스 융화 재료', amount: 15   },
      { type: '운명의 파편',       amount: 8200 },
    ],
    bookMaterial:   { type: '야금술: 업화 [11-14]', amount: 1  },
    breathMaterial: { type: '용암의 숨결',           amount: 20 },
    gold:   2200,
    silver: 55000,
  },
  {
    from: 14,
    baseSuccessRate: 0.04,
    rateIncreasePerFailure: 0.004,
    maxBaseSuccessRate: 0.08,
    bookBonus: 0.05,
    breathBonus: 0.05,
    ceiling: { none: 31, partial: 20, both: 15 },
    baseMaterials: [
      { type: '파괴석',            amount: 1700 },
      { type: '돌파석',            amount: 30   },
      { type: '아비도스 융화 재료', amount: 18   },
      { type: '운명의 파편',       amount: 8800 },
    ],
    bookMaterial:   { type: '야금술: 업화 [15-18]', amount: 1  },
    breathMaterial: { type: '용암의 숨결',           amount: 20 },
    gold:   2430,
    silver: 55000,
  },
  {
    from: 15,
    baseSuccessRate: 0.04,
    rateIncreasePerFailure: 0.004,
    maxBaseSuccessRate: 0.08,
    bookBonus: 0.05,
    breathBonus: 0.05,
    ceiling: { none: 31, partial: 21, both: 16 },
    baseMaterials: [
      { type: '파괴석',            amount: 1950 },
      { type: '돌파석',            amount: 33   },
      { type: '아비도스 융화 재료', amount: 18   },
      { type: '운명의 파편',       amount: 9400 },
    ],
    bookMaterial:   { type: '야금술: 업화 [15-18]', amount: 1  },
    breathMaterial: { type: '용암의 숨결',           amount: 20 },
    gold:   2670,
    silver: 55000,
  },
  {
    from: 16,
    baseSuccessRate: 0.03,
    rateIncreasePerFailure: 0.003,
    maxBaseSuccessRate: 0.06,
    bookBonus: 0.04,
    breathBonus: 0.04,
    ceiling: { none: 40, partial: 25, both: 18 },
    baseMaterials: [
      { type: '파괴석',            amount: 2200 },
      { type: '돌파석',            amount: 36   },
      { type: '아비도스 융화 재료', amount: 25   },
      { type: '운명의 파편',       amount: 12000 },
    ],
    bookMaterial:   { type: '야금술: 업화 [15-18]', amount: 1  },
    breathMaterial: { type: '용암의 숨결',           amount: 20 },
    gold:   2940,
    silver: 65000,
  },
  {
    from: 17,
    baseSuccessRate: 0.03,
    rateIncreasePerFailure: 0.003,
    maxBaseSuccessRate: 0.06,
    bookBonus: 0.03,
    breathBonus: 0.03,
    ceiling: { none: 40, partial: 27, both: 21 },
    baseMaterials: [
      { type: '파괴석',            amount: 2450 },
      { type: '돌파석',            amount: 39   },
      { type: '아비도스 융화 재료', amount: 25   },
      { type: '운명의 파편',       amount: 12900 },
    ],
    bookMaterial:   { type: '야금술: 업화 [15-18]', amount: 1  },
    breathMaterial: { type: '용암의 숨결',           amount: 20 },
    gold:   3220,
    silver: 65000,
  },
  {
    from: 18,
    baseSuccessRate: 0.03,
    rateIncreasePerFailure: 0.003,
    maxBaseSuccessRate: 0.06,
    bookBonus: 0.03,
    breathBonus: 0.03,
    ceiling: { none: 40, partial: 27, both: 21 },
    baseMaterials: [
      { type: '파괴석',            amount: 2700 },
      { type: '돌파석',            amount: 42   },
      { type: '아비도스 융화 재료', amount: 25   },
      { type: '운명의 파편',       amount: 13700 },
    ],
    bookMaterial:   { type: '야금술: 업화 [19-20]', amount: 1  },
    breathMaterial: { type: '용암의 숨결',           amount: 20 },
    gold:   3510,
    silver: 65000,
  },
  {
    from: 19,
    baseSuccessRate: 0.015,
    rateIncreasePerFailure: 0.0015,
    maxBaseSuccessRate: 0.03,
    bookBonus: 0.015,
    breathBonus: 0.015,
    ceiling: { none: 76, partial: 51, both: 39 },
    baseMaterials: [
      { type: '파괴석',            amount: 2950 },
      { type: '돌파석',            amount: 45   },
      { type: '아비도스 융화 재료', amount: 35   },
      { type: '운명의 파편',       amount: 16000 },
    ],
    bookMaterial:   { type: '야금술: 업화 [19-20]', amount: 1  },
    breathMaterial: { type: '용암의 숨결',           amount: 20 },
    gold:   3830,
    silver: 90000,
  },
  {
    from: 20,
    baseSuccessRate: 0.015,
    rateIncreasePerFailure: 0.0015,  // 실패할수록 기본 확률 +0.15%
    maxBaseSuccessRate: 0.03,       // 3%에서 캡
    bookBonus: 0,
    breathBonus: 0.015,
    ceiling: { none: 76, partial: 51 },
    baseMaterials: [
      { type: '파괴석',        amount: 3200  },
      { type: '돌파석',        amount: 48   },
      { type: '아비도스 융화 재료',  amount: 35   },
      { type: '운명의 파편',   amount: 17100 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 25 },
    gold:   4160,
    silver: 90000,
  },
  {
    from: 21,
    baseSuccessRate: 0.01,
    rateIncreasePerFailure: 0.001,  // 실패할수록 기본 확률 +0.1%
    maxBaseSuccessRate: 0.02,       // 2%에서 캡
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 112, partial: 75 },
    baseMaterials: [
      { type: '파괴석',        amount: 3700  },
      { type: '돌파석',        amount: 52   },
      { type: '아비도스 융화 재료',  amount: 35   },
      { type: '운명의 파편',   amount: 18200 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 25 },
    gold:   4510,
    silver: 120000,
  },
  {
    from: 22,
    baseSuccessRate: 0.01,
    rateIncreasePerFailure: 0.001,  // 실패할수록 기본 확률 +0.1%
    maxBaseSuccessRate: 0.02,       // 2%에서 캡
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 112, partial: 75 },
    baseMaterials: [
      { type: '파괴석',        amount: 4000  },
      { type: '돌파석',        amount: 56   },
      { type: '아비도스 융화 재료',  amount: 35   },
      { type: '운명의 파편',   amount: 19200 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 25 },
    gold:   4870,
    silver: 120000,
  },
  {
    from: 23,
    baseSuccessRate: 0.005,
    rateIncreasePerFailure: 0.0005, // 실패할수록 기본 확률 +0.05%
    maxBaseSuccessRate: 0.01,       // 1%에서 캡
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 219, partial: 110 },
    baseMaterials: [
      { type: '파괴석',        amount: 4200  },
      { type: '돌파석',        amount: 60   },
      { type: '아비도스 융화 재료',  amount: 50   },
      { type: '운명의 파편',   amount: 20400 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 50 },
    gold:   5250,
    silver: 150000,
  },
  {
    from: 24,
    baseSuccessRate: 0.005,
    rateIncreasePerFailure: 0.0005, // 실패할수록 기본 확률 +0.05%
    maxBaseSuccessRate: 0.01,       // 1%에서 캡
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 219, partial: 110 },
    baseMaterials: [
      { type: '파괴석',        amount: 4500  },
      { type: '돌파석',        amount: 65   },
      { type: '아비도스 융화 재료',  amount: 50   },
      { type: '운명의 파편',   amount: 21500 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 50 },
    gold:   5650,
    silver: 150000,
  },
];

// ─────────────────────────────────────────────
// 세르카 방어구 일반 재련
// ─────────────────────────────────────────────

export const SERKA_ARMOR_STEPS: EnhancementStep[] = [
  {
    from: 11,
    baseSuccessRate: 0.05,
    rateIncreasePerFailure: 0.005,
    maxBaseSuccessRate: 0.10,
    bookBonus: 0,
    breathBonus: 0.05,
    ceiling: { none: 26, partial: 18 },
    baseMaterials: [
      { type: '운명의 수호석 결정',  amount: 930  },
      { type: '위대한 운명의 돌파석', amount: 11   },
      { type: '상급 아비도스 융화',  amount: 11   },
      { type: '운명의 파편',        amount: 9570 },
    ],
    breathMaterial: { type: '빙하의 숨결', amount: 20 },
    gold:   2450,
    silver: 13200,
    },
    {
      from: 12,
      baseSuccessRate: 0.05,
      rateIncreasePerFailure: 0.005,
      maxBaseSuccessRate: 0.10,
      bookBonus: 0,
      breathBonus: 0.05,
      ceiling: { none: 26, partial: 18 },
      baseMaterials: [
        { type: '운명의 수호석 결정',  amount: 1030  },
        { type: '위대한 운명의 돌파석', amount: 12    },
        { type: '상급 아비도스 융화',  amount: 12    },
        { type: '운명의 파편',        amount: 10540 },
      ],
      breathMaterial: { type: '빙하의 숨결', amount: 20 },
      gold:   2700,
      silver: 13200,
    },
    {
      from: 13,
      baseSuccessRate: 0.04,
      rateIncreasePerFailure: 0.004,
      maxBaseSuccessRate: 0.08,
      bookBonus: 0,
      breathBonus: 0.04,
      ceiling: { none: 31, partial: 21 },
      baseMaterials: [
        { type: '운명의 수호석 결정',  amount: 1120  },
        { type: '위대한 운명의 돌파석', amount: 13    },
        { type: '상급 아비도스 융화',  amount: 13    },
        { type: '운명의 파편',        amount: 11520 },
      ],
      breathMaterial: { type: '빙하의 숨결', amount: 20 },
      gold:   2950,
      silver: 13200,
    },
    {
      from: 14,
      baseSuccessRate: 0.04,
      rateIncreasePerFailure: 0.004,
      maxBaseSuccessRate: 0.08,
      bookBonus: 0,
      breathBonus: 0.04,
      ceiling: { none: 31, partial: 21 },
      baseMaterials: [
        { type: '운명의 수호석 결정',  amount: 1240  },
        { type: '위대한 운명의 돌파석', amount: 14    },
        { type: '상급 아비도스 융화',  amount: 15    },
        { type: '운명의 파편',        amount: 12690 },
      ],
      breathMaterial: { type: '빙하의 숨결', amount: 20 },
      gold:   3250,
      silver: 13200,
    },
    {
      from: 15,
      baseSuccessRate: 0.04,
      rateIncreasePerFailure: 0.004,
      maxBaseSuccessRate: 0.08,
      bookBonus: 0,
      breathBonus: 0.04,
      ceiling: { none: 31, partial: 21 },
      baseMaterials: [
        { type: '운명의 수호석 결정',  amount: 1330  },
        { type: '위대한 운명의 돌파석', amount: 15    },
        { type: '상급 아비도스 융화',  amount: 16    },
        { type: '운명의 파편',        amount: 13670 },
      ],
      breathMaterial: { type: '빙하의 숨결', amount: 20 },
      gold:   3500,
      silver: 13200,
    },
    {
      from: 16,
      baseSuccessRate: 0.03,
      rateIncreasePerFailure: 0.003,
      maxBaseSuccessRate: 0.06,
      bookBonus: 0,
      breathBonus: 0.03,
      ceiling: { none: 40, partial: 27 },
      baseMaterials: [
        { type: '운명의 수호석 결정',  amount: 1450  },
        { type: '위대한 운명의 돌파석', amount: 17    },
        { type: '상급 아비도스 융화',  amount: 17    },
        { type: '운명의 파편',        amount: 14840 },
      ],
      breathMaterial: { type: '빙하의 숨결', amount: 20 },
      gold:   3800,
      silver: 15600,
    },
    {
      from: 17,
      baseSuccessRate: 0.03,
      rateIncreasePerFailure: 0.003,
      maxBaseSuccessRate: 0.06,
      bookBonus: 0,
      breathBonus: 0.03,
      ceiling: { none: 40, partial: 27 },
      baseMaterials: [
        { type: '운명의 수호석 결정',  amount: 1560  },
        { type: '위대한 운명의 돌파석', amount: 18    },
        { type: '상급 아비도스 융화',  amount: 19    },
        { type: '운명의 파편',        amount: 16010 },
      ],
      breathMaterial: { type: '빙하의 숨결', amount: 20 },
      gold:   4100,
      silver: 15600,
    },
    {
      from: 18,
      baseSuccessRate: 0.03,
      rateIncreasePerFailure: 0.003,
      maxBaseSuccessRate: 0.06,
      bookBonus: 0,
      breathBonus: 0.03,
      ceiling: { none: 40, partial: 27 },
      baseMaterials: [
        { type: '운명의 수호석 결정',  amount: 1700  },
        { type: '위대한 운명의 돌파석', amount: 20    },
        { type: '상급 아비도스 융화',  amount: 20    },
        { type: '운명의 파편',        amount: 17380 },
      ],
      breathMaterial: { type: '빙하의 숨결', amount: 20 },
      gold:   4450,
      silver: 15600,
    },
    {
      from: 19,
      baseSuccessRate: 0.015,
      rateIncreasePerFailure: 0.0015,
      maxBaseSuccessRate: 0.03,
      bookBonus: 0,
      breathBonus: 0.015,
      ceiling: { none: 76, partial: 51 },
      baseMaterials: [
        { type: '운명의 수호석 결정',  amount: 1810  },
        { type: '위대한 운명의 돌파석', amount: 21    },
        { type: '상급 아비도스 융화',  amount: 22    },
        { type: '운명의 파편',        amount: 18550 },
      ],
      breathMaterial: { type: '빙하의 숨결', amount: 25 },
      gold:   4750,
      silver: 21600,
    },
    {
      from: 20,
      baseSuccessRate: 0.015,
      rateIncreasePerFailure: 0.0015,
      maxBaseSuccessRate: 0.03,
      bookBonus: 0,
      breathBonus: 0.015,
      ceiling: { none: 76, partial: 51 },
      baseMaterials: [
        { type: '운명의 수호석 결정',  amount: 1950  },
        { type: '위대한 운명의 돌파석', amount: 23    },
        { type: '상급 아비도스 융화',  amount: 23    },
        { type: '운명의 파편',        amount: 19920 },
      ],
      breathMaterial: { type: '빙하의 숨결', amount: 25 },
      gold:   5100,
      silver: 21600,
      },
      {
        from: 21,
        baseSuccessRate: 0.01,
        rateIncreasePerFailure: 0.001,
        maxBaseSuccessRate: 0.02,
        bookBonus: 0,
        breathBonus: 0.01,
        ceiling: { none: 112, partial: 75 },
        baseMaterials: [
          { type: '운명의 수호석 결정',  amount: 2080  },
          { type: '위대한 운명의 돌파석', amount: 24    },
          { type: '상급 아비도스 융화',  amount: 25    },
          { type: '운명의 파편',        amount: 21280 },
        ],
        breathMaterial: { type: '빙하의 숨결', amount: 25 },
        gold:   5450,
        silver: 28800,
      },
      {
        from: 22,
        baseSuccessRate: 0.01,
        rateIncreasePerFailure: 0.001,
        maxBaseSuccessRate: 0.02,
        bookBonus: 0,
        breathBonus: 0.01,
        ceiling: { none: 112, partial: 75 },
        baseMaterials: [
          { type: '운명의 수호석 결정',  amount: 2200  },
          { type: '위대한 운명의 돌파석', amount: 26    },
          { type: '상급 아비도스 융화',  amount: 26    },
          { type: '운명의 파편',        amount: 22460 },
        ],
        breathMaterial: { type: '빙하의 숨결', amount: 25 },
        gold:   5750,
        silver: 28800,
      },
      {
        from: 23,
        baseSuccessRate: 0.005,
        rateIncreasePerFailure: 0.0005,
        maxBaseSuccessRate: 0.01,
        bookBonus: 0,
        breathBonus: 0.01,
        ceiling: { none: 219, partial: 110 },
        baseMaterials: [
          { type: '운명의 수호석 결정',  amount: 2330  },
          { type: '위대한 운명의 돌파석', amount: 27    },
          { type: '상급 아비도스 융화',  amount: 28    },
          { type: '운명의 파편',        amount: 23820 },
        ],
        breathMaterial: { type: '빙하의 숨결', amount: 50 },
        gold:   6100,
        silver: 36000,
      },
      {
        from: 24,
        baseSuccessRate: 0.005,
        rateIncreasePerFailure: 0.0005,
        maxBaseSuccessRate: 0.01,
        bookBonus: 0,
        breathBonus: 0.01,
        ceiling: { none: 219, partial: 110 },
        baseMaterials: [
          { type: '운명의 수호석 결정',  amount: 2450  },
          { type: '위대한 운명의 돌파석', amount: 29    },
          { type: '상급 아비도스 융화',  amount: 30    },
          { type: '운명의 파편',        amount: 25000 },
        ],
        breathMaterial: { type: '빙하의 숨결', amount: 50 },
        gold:   6400,
        silver: 36000,
      },
];

// ─────────────────────────────────────────────
// 세르카 무기 일반 재련
// ─────────────────────────────────────────────

export const SERKA_WEAPON_STEPS: EnhancementStep[] = [
  {
    from: 11,
    baseSuccessRate: 0.05,
    rateIncreasePerFailure: 0.005,
    maxBaseSuccessRate: 0.10,
    bookBonus: 0,
    breathBonus: 0.05,
    ceiling: { none: 26, partial: 18 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 1700  },
      { type: '위대한 운명의 돌파석', amount: 17    },
      { type: '상급 아비도스 융화',  amount: 18    },
      { type: '운명의 파편',        amount: 15890 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 20 },
    gold:   4050,
    silver: 22000,
  },
  {
    from: 12,
    baseSuccessRate: 0.05,
    rateIncreasePerFailure: 0.005,
    maxBaseSuccessRate: 0.10,
    bookBonus: 0,
    breathBonus: 0.05,
    ceiling: { none: 26, partial: 18 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 1890  },
      { type: '위대한 운명의 돌파석', amount: 19    },
      { type: '상급 아비도스 융화',  amount: 21    },
      { type: '운명의 파편',        amount: 17660 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 20 },
    gold:   4500,
    silver: 22000,
  },
  {
    from: 13,
    baseSuccessRate: 0.04,
    rateIncreasePerFailure: 0.004,
    maxBaseSuccessRate: 0.08,
    bookBonus: 0,
    breathBonus: 0.04,
    ceiling: { none: 31, partial: 21 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 2080  },
      { type: '위대한 운명의 돌파석', amount: 21    },
      { type: '상급 아비도스 융화',  amount: 23    },
      { type: '운명의 파편',        amount: 19420 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 20 },
    gold:   4950,
    silver: 22000,
  },
  {
    from: 14,
    baseSuccessRate: 0.04,
    rateIncreasePerFailure: 0.004,
    maxBaseSuccessRate: 0.08,
    bookBonus: 0,
    breathBonus: 0.04,
    ceiling: { none: 31, partial: 21 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 2270  },
      { type: '위대한 운명의 돌파석', amount: 23    },
      { type: '상급 아비도스 융화',  amount: 25    },
      { type: '운명의 파편',        amount: 21190 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 20 },
    gold:   5400,
    silver: 22000,
  },
  {
    from: 15,
    baseSuccessRate: 0.04,
    rateIncreasePerFailure: 0.004,
    maxBaseSuccessRate: 0.08,
    bookBonus: 0,
    breathBonus: 0.04,
    ceiling: { none: 31, partial: 21 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 2460  },
      { type: '위대한 운명의 돌파석', amount: 25    },
      { type: '상급 아비도스 융화',  amount: 27    },
      { type: '운명의 파편',        amount: 22960 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 20 },
    gold:   5850,
    silver: 22000,
  },
  {
    from: 16,
    baseSuccessRate: 0.03,
    rateIncreasePerFailure: 0.003,
    maxBaseSuccessRate: 0.06,
    bookBonus: 0,
    breathBonus: 0.03,
    ceiling: { none: 40, partial: 27 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 2690  },
      { type: '위대한 운명의 돌파석', amount: 28    },
      { type: '상급 아비도스 융화',  amount: 29    },
      { type: '운명의 파편',        amount: 25120 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 20 },
    gold:   6400,
    silver: 26000,
  },
  {
    from: 17,
    baseSuccessRate: 0.03,
    rateIncreasePerFailure: 0.003,
    maxBaseSuccessRate: 0.06,
    bookBonus: 0,
    breathBonus: 0.03,
    ceiling: { none: 40, partial: 27 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 2900  },
      { type: '위대한 운명의 돌파석', amount: 30    },
      { type: '상급 아비도스 융화',  amount: 32    },
      { type: '운명의 파편',        amount: 27080 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 20 },
    gold:   6900,
    silver: 26000,
  },
  {
    from: 18,
    baseSuccessRate: 0.03,
    rateIncreasePerFailure: 0.003,
    maxBaseSuccessRate: 0.06,
    bookBonus: 0,
    breathBonus: 0.03,
    ceiling: { none: 40, partial: 27 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 3110  },
      { type: '위대한 운명의 돌파석', amount: 32    },
      { type: '상급 아비도스 융화',  amount: 34    },
      { type: '운명의 파편',        amount: 29040 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 20 },
    gold:   7400,
    silver: 26000,
  },
  {
    from: 19,
    baseSuccessRate: 0.015,
    rateIncreasePerFailure: 0.0015,
    maxBaseSuccessRate: 0.03,
    bookBonus: 0,
    breathBonus: 0.015,
    ceiling: { none: 76, partial: 51 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 3340  },
      { type: '위대한 운명의 돌파석', amount: 34    },
      { type: '상급 아비도스 융화',  amount: 37    },
      { type: '운명의 파편',        amount: 31200 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 25 },
    gold:   7950,
    silver: 36000,
  },
  {
    from: 20,
    baseSuccessRate: 0.015,
    rateIncreasePerFailure: 0.0015,
    maxBaseSuccessRate: 0.03,
    bookBonus: 0,
    breathBonus: 0.015,
    ceiling: { none: 76, partial: 51 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 3570  },
      { type: '위대한 운명의 돌파석', amount: 37    },
      { type: '상급 아비도스 융화',  amount: 39    },
      { type: '운명의 파편',        amount: 33360 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 25 },
    gold:   8500,
    silver: 36000,
  },
  {
    from: 21,
    baseSuccessRate: 0.01,
    rateIncreasePerFailure: 0.001,
    maxBaseSuccessRate: 0.02,
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 112, partial: 75 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 3800  },
      { type: '위대한 운명의 돌파석', amount: 39    },
      { type: '상급 아비도스 융화',  amount: 42    },
      { type: '운명의 파편',        amount: 35520 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 25 },
    gold:   9050,
    silver: 48000,
  },
  {
    from: 22,
    baseSuccessRate: 0.01,
    rateIncreasePerFailure: 0.001,
    maxBaseSuccessRate: 0.02,
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 112, partial: 75 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 4030  },
      { type: '위대한 운명의 돌파석', amount: 42    },
      { type: '상급 아비도스 융화',  amount: 44    },
      { type: '운명의 파편',        amount: 37680 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 25 },
    gold:   9600,
    silver: 48000,
  },
  {
    from: 23,
    baseSuccessRate: 0.005,
    rateIncreasePerFailure: 0.0005,
    maxBaseSuccessRate: 0.01,
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 219, partial: 110 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 4260  },
      { type: '위대한 운명의 돌파석', amount: 44    },
      { type: '상급 아비도스 융화',  amount: 47    },
      { type: '운명의 파편',        amount: 39840 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 50 },
    gold:   10150,
    silver: 60000,
  },
  {
    from: 24,
    baseSuccessRate: 0.005,
    rateIncreasePerFailure: 0.0005,
    maxBaseSuccessRate: 0.01,
    bookBonus: 0,
    breathBonus: 0.01,
    ceiling: { none: 219, partial: 110 },
    baseMaterials: [
      { type: '운명의 파괴석 결정',   amount: 4500  },
      { type: '위대한 운명의 돌파석', amount: 47    },
      { type: '상급 아비도스 융화',  amount: 50    },
      { type: '운명의 파편',        amount: 42000 },
    ],
    breathMaterial: { type: '용암의 숨결', amount: 50 },
    gold:   10700,
    silver: 60000,
  },
];

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────

/**
 * n번째 시도의 성공 확률 (실패 누적 반영)
 * @param step 강화 단계
 * @param attemptIndex 0-based 시도 인덱스 (0 = 1트)
 * @param useBook 재봉술 사용 여부
 * @param useBreath 빙하의 숨결 사용 여부
 */
export const calcAttemptRate = (
  step: EnhancementStep,
  attemptIndex: number,
  useBook: boolean,
  useBreath: boolean,
): number => {
  const base = Math.min(
    step.maxBaseSuccessRate,
    step.baseSuccessRate + attemptIndex * step.rateIncreasePerFailure,
  );
  const boosters = (useBook ? step.bookBonus : 0) + (useBreath ? step.breathBonus : 0);
  return Math.min(1, base + boosters);
};

/**
 * 부스터 조합에 따른 장기백 천장 트수 반환
 * - both: 책O 숨결O
 * - partial: 책O 숨결X 또는 책X 숨결O (대칭)
 * - none: 책X 숨결X
 */
export const getCeiling = (
  step: EnhancementStep,
  useBook: boolean,
  useBreath: boolean,
): number => {
  const useBoth = useBook && useBreath;
  const useAny  = useBook || useBreath;
  if (useBoth   && step.ceiling.both    != null) return step.ceiling.both;
  if (useAny    && step.ceiling.partial != null) return step.ceiling.partial;
  return step.ceiling.none;
};

/**
 * 장기백(천장) + 확률 증가를 반영한 기대 시도 횟수
 *
 * E[시도] = Σ(k=1..N-1) k · P(첫 성공이 k번째) + N · P(N-1번 모두 실패)
 */
export const calcExpectedAttempts = (
  step: EnhancementStep,
  useBook: boolean,
  useBreath: boolean,
): number => {
  const ceiling = getCeiling(step, useBook, useBreath);
  let expected = 0;
  let probAllFailed = 1;

  for (let i = 0; i < ceiling - 1; i++) {
    const rate = calcAttemptRate(step, i, useBook, useBreath);
    expected += (i + 1) * probAllFailed * rate;
    probAllFailed *= (1 - rate);
  }

  // 천장: ceiling번째 시도는 반드시 성공
  expected += ceiling * probAllFailed;

  return expected;
};

/**
 * 1회 시도 재료 목록 (선택 부스터 포함/제외)
 */
export const getAttemptMaterials = (
  step: EnhancementStep,
  useBook: boolean,
  useBreath: boolean,
): MaterialAmount[] => [
  ...step.baseMaterials,
  ...(useBook   && step.bookMaterial   ? [step.bookMaterial]   : []),
  ...(useBreath && step.breathMaterial ? [step.breathMaterial] : []),
];

// ─────────────────────────────────────────────
// 상급 재련 (에기르 전용)
// ─────────────────────────────────────────────
//
// - 총 4단계, 단계당 1000 XP (100 × 10칸)
// - 1회 시도 결과: 성공(10xp) / 대성공(20xp) / 대성공×2(40xp)
// - 강화 재료(숨결/책) 조합에 따라 확률 변동
// - 선조의 가호: 6회마다 발동, 결과 XP에 배수/보너스
// - 단계 경계 도달 시 초과 XP 소멸, 선조 사이클 리셋
//
// [기대 XP/회]
//   없음:    0.80×10 + 0.15×20 + 0.05×40 = 13
//   하나:    0.50×10 + 0.30×20 + 0.20×40 = 19
//   둘 다:   0.00×10 + 0.60×20 + 0.40×40 = 28
//
// [선조턴 기대 XP 배율 (7-event cycle)]
//   1~2단계: E[ancestor] = base×2.30 + 8.0
//     → cycle XP = base×8.30 + 8.0, 유효 XP/회 = (base×8.30 + 8.0) / 7
//   3~4단계: 나베르 포함(12.5%), 강화선조 steady-state ~11.1%
//     → E[ancestor] ≈ base×2.0 + 23.56
//     → 유효 XP/회 = (base×8.0 + 23.56) / 7
// ─────────────────────────────────────────────

export interface AdvancedEnhancementStage {
  stage: 1 | 2 | 3 | 4;
  /** 테메르 효과 시 무료가 되는 재련 재료 */
  mainMaterials: MaterialAmount[];
  gold: number;
  /** 선택 강화 재료 - 숨결 */
  breathMaterial: MaterialAmount;
  /** 선택 강화 재료 - 책 */
  bookMaterial: MaterialAmount;
}

// ── 방어구 상급 재련 ──────────────────────────

export const ADV_ARMOR_STAGES: AdvancedEnhancementStage[] = [
  {
    stage: 1,
    mainMaterials: [
      { type: '수호석',          amount: 150 },
      { type: '돌파석',          amount: 4   },
      { type: '아비도스 융화 재료', amount: 5   },
      { type: '운명의 파편',     amount: 300 },
    ],
    gold: 475,
    breathMaterial: { type: '빙하의 숨결',       amount: 4 },
    bookMaterial:   { type: '장인의 재봉술: 1단계', amount: 1 },
  },
  {
    stage: 2,
    mainMaterials: [
      { type: '수호석',          amount: 270 },
      { type: '돌파석',          amount: 5   },
      { type: '아비도스 융화 재료', amount: 5   },
      { type: '운명의 파편',     amount: 600 },
    ],
    gold: 900,
    breathMaterial: { type: '빙하의 숨결',       amount: 6 },
    bookMaterial:   { type: '장인의 재봉술: 2단계', amount: 1 },
  },
  {
    stage: 3,
    mainMaterials: [
      { type: '수호석',          amount: 1000 },
      { type: '돌파석',          amount: 18   },
      { type: '아비도스 융화 재료', amount: 17   },
      { type: '운명의 파편',     amount: 7000 },
    ],
    gold: 2000,
    breathMaterial: { type: '빙하의 숨결',       amount: 20 },
    bookMaterial:   { type: '장인의 재봉술: 3단계', amount: 1 },
  },
  {
    stage: 4,
    mainMaterials: [
      { type: '수호석',          amount: 1200 },
      { type: '돌파석',          amount: 23   },
      { type: '아비도스 융화 재료', amount: 19   },
      { type: '운명의 파편',     amount: 8000 },
    ],
    gold: 2400,
    breathMaterial: { type: '빙하의 숨결',       amount: 24 },
    bookMaterial:   { type: '장인의 재봉술: 4단계', amount: 1 },
  },
];

// ── 무기 상급 재련 ────────────────────────────

export const ADV_WEAPON_STAGES: AdvancedEnhancementStage[] = [
  {
    stage: 1,
    mainMaterials: [
      { type: '파괴석',          amount: 180 },
      { type: '돌파석',          amount: 5   },
      { type: '아비도스 융화 재료', amount: 8   },
      { type: '운명의 파편',     amount: 500 },
    ],
    gold: 563,
    breathMaterial: { type: '용암의 숨결',       amount: 4 },
    bookMaterial:   { type: '장인의 야금술: 1단계', amount: 1 },
  },
  {
    stage: 2,
    mainMaterials: [
      { type: '파괴석',          amount: 330 },
      { type: '돌파석',          amount: 7   },
      { type: '아비도스 융화 재료', amount: 9   },
      { type: '운명의 파편',     amount: 1000 },
    ],
    gold: 1250,
    breathMaterial: { type: '용암의 숨결',       amount: 6 },
    bookMaterial:   { type: '장인의 야금술: 2단계', amount: 1 },
  },
  {
    stage: 3,
    mainMaterials: [
      { type: '파괴석',          amount: 1200 },
      { type: '돌파석',          amount: 25   },
      { type: '아비도스 융화 재료', amount: 28   },
      { type: '운명의 파편',     amount: 11500 },
    ],
    gold: 3000,
    breathMaterial: { type: '용암의 숨결',       amount: 20 },
    bookMaterial:   { type: '장인의 야금술: 3단계', amount: 1 },
  },
  {
    stage: 4,
    mainMaterials: [
      { type: '파괴석',          amount: 1400 },
      { type: '돌파석',          amount: 32   },
      { type: '아비도스 융화 재료', amount: 30   },
      { type: '운명의 파편',     amount: 13000 },
    ],
    gold: 4000,
    breathMaterial: { type: '용암의 숨결',       amount: 24 },
    bookMaterial:   { type: '장인의 야금술: 4단계', amount: 1 },
  },
];

// ── 상수 ─────────────────────────────────────

/** 단계당 필요 XP */
export const ADV_STAGE_XP = 1000;

/**
 * 턴별 책/숨결 사용 조합
 * 'none'=없음 / 'book'=책만 / 'breath'=숨결만 / 'both'=책+숨결
 */
export type AdvTurnOption = 'none' | 'book' | 'breath' | 'both';

/** 1회 시도 기대 XP (강화 재료 조합별) */
export const ADV_BASE_XP = {
  none:    0.80 * 10 + 0.15 * 20 + 0.05 * 40, // 13
  partial: 0.50 * 10 + 0.30 * 20 + 0.20 * 40, // 19
  both:    0.00 * 10 + 0.60 * 20 + 0.40 * 40, // 28
} as const;

const advOptionBaseXp = (opt: AdvTurnOption): number =>
  opt === 'both' ? ADV_BASE_XP.both : opt === 'none' ? ADV_BASE_XP.none : ADV_BASE_XP.partial;

// ── 기대 시도 횟수 계산 ───────────────────────

/**
 * 상급 재련 1단계 완성에 필요한 기대 시도 횟수
 *
 * 일반턴 / 선조턴 / 강화선조턴을 각각 독립적으로 설정 가능.
 * 책/숨결 사용 여부에 따라 그 턴의 base XP(13/19/28)가 결정되고,
 * 선조 효과(배수·보너스)는 해당 base XP에 적용됨.
 *
 * 사이클 구성:
 *   1~2단계: 일반×6 + 선조×1  (cycleLen=7)
 *     선조 E[XP] = ancestorBase×2.30 + 8.0
 *   3~4단계: 일반×6 + 선조×1 + 강화선조×0.125  (cycleLen=7.125)
 *     선조 E[XP]     = ancestorBase×1.875 + 18.75
 *     강화선조 E[XP] = enhancedBase×3.0   + 62.0
 */
export const calcAdvExpectedAttempts = (
  normalOpt: AdvTurnOption,
  ancestorOpt: AdvTurnOption,
  enhancedOpt: AdvTurnOption,
  stage: 1 | 2 | 3 | 4,
): number => {
  const normalXp   = advOptionBaseXp(normalOpt);
  const ancestorXp = advOptionBaseXp(ancestorOpt);
  const enhancedXp = advOptionBaseXp(enhancedOpt);

  let cycleXp: number;
  let cycleLen: number;

  if (stage <= 2) {
    cycleXp  = 6 * normalXp + (ancestorXp * 2.30 + 8.0);
    cycleLen = 7;
  } else {
    const normalAncestorXp   = ancestorXp * 1.875 + 18.75;
    const enhancedAncestorXp = enhancedXp * 3.0   + 62.0;
    cycleXp  = 6 * normalXp + normalAncestorXp + 0.125 * enhancedAncestorXp;
    cycleLen = 7.125;
  }

  return ADV_STAGE_XP / (cycleXp / cycleLen);
};

/**
 * 상급 재련 1회 시도당 재료 목록
 *
 * 재련 재료(main)는 매 시도 소모.
 * 강화 재료(optional)는 사이클 내 사용 빈도에 따라 비례 소모:
 *   - 일반턴: 사이클의 6/cycleLen 비율
 *   - 선조턴: 1/cycleLen 비율
 *   - 강화선조: 0.125/cycleLen 비율 (3~4단계만)
 */
export const getAdvAttemptMaterials = (
  stageData: AdvancedEnhancementStage,
  normalOpt: AdvTurnOption,
  ancestorOpt: AdvTurnOption,
  enhancedOpt: AdvTurnOption,
): { main: MaterialAmount[]; optional: MaterialAmount[] } => {
  const hasEnhanced = stageData.stage > 2;
  const cycleLen = hasEnhanced ? 7.125 : 7;

  const usesBook   = (opt: AdvTurnOption) => opt === 'book'   || opt === 'both';
  const usesBreath = (opt: AdvTurnOption) => opt === 'breath' || opt === 'both';

  const bookPerCycle =
    (usesBook(normalOpt)                     ? 6     : 0) +
    (usesBook(ancestorOpt)                   ? 1     : 0) +
    (hasEnhanced && usesBook(enhancedOpt)    ? 0.125 : 0);

  const breathPerCycle =
    (usesBreath(normalOpt)                   ? 6     : 0) +
    (usesBreath(ancestorOpt)                 ? 1     : 0) +
    (hasEnhanced && usesBreath(enhancedOpt)  ? 0.125 : 0);

  const bookRate   = bookPerCycle   / cycleLen;
  const breathRate = breathPerCycle / cycleLen;

  return {
    main: stageData.mainMaterials,
    optional: [
      ...(bookRate   > 0 ? [{ type: stageData.bookMaterial.type,   amount: stageData.bookMaterial.amount   * bookRate   }] : []),
      ...(breathRate > 0 ? [{ type: stageData.breathMaterial.type, amount: stageData.breathMaterial.amount * breathRate }] : []),
    ],
  };
};
