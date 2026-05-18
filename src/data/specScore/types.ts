/**
 * 환산 점수 계산 시스템 공용 타입
 *
 * 시즌3 아크패시브 기준 (2024-12-18 이후 전구간 적용):
 * - 5개 전투 슬롯에는 "공용 각인"만 장착 가능 (27개 직업각인 슬롯 시스템 사라짐)
 * - 기존 직업각인은 "깨달음" 탭으로 이동 (직업 정체성 — 클래스별 고정)
 * - 각인은 전설 1~4단계 + 유물 1~4단계 = 총 8단계 (각인서 5권/단계)
 * - 어빌리티 스톤 세공 6/7/9/10 → 각인에 +1/+2/+3/+4단계 추가
 * - 어빌리티 스톤 합 5단계 이상 → 기본 공격력 +1.50% (전역)
 *
 * 점수 모델: 딜러는 "딜 증가율 누적 (%)", 서폿은 "버프력 환산 (%)"
 */

/** 직업군 분류 (점수 모델 분기용) */
export type JobRole = 'dealer' | 'supporter';

/** 직업 깨달음 (구 직업각인) — 클래스별 고정 정체성 */
export type ClassAwakeningId = string;

/** 공용 각인 ID (한글 정식 명칭) */
export type CommonEngravingId = string;

/** 스탯 종류 (CharacterProfile.Stats.Type 과 일치) */
export type StatType = '치명' | '특화' | '신속' | '제압' | '인내' | '숙련';

/** 직업 깨달음 정의 — 직업당 1~2개, 단계 0~4 (전설 기준) */
export interface ClassAwakeningEntry {
  id: ClassAwakeningId;
  className: string;
  role: JobRole;
  /** 단계 1~4별 누적 딜증가율 추정치(%). 0 인덱스 = 1단계 */
  stages: number[];
  note?: string;
}

/**
 * 공용 각인 정의 — 전설/유물 통합 8단계
 *
 * stages[0..3]  = 전설 1~4단계 누적 (%)
 * stages[4..7]  = 유물 1~4단계 누적 (%, 전설 4단계 포함된 누적치)
 * stages.length === 0  → 데이터 미확보, fallback 적용
 */
export interface CommonEngravingEntry {
  id: CommonEngravingId;
  stages: number[];
  /** 서폿용 각인이면 true (각성·구슬동자 등) */
  supporter?: boolean;
  /** 페널티 각인이면 true (디버프 슬롯) */
  penalty?: boolean;
  note?: string;
}

/** 보석 레벨별 효율 (T4 기준) */
export interface GemEfficiencyEntry {
  level: number;
  /** 멸화/겁화: 특정 스킬 피해 증가 % (딜러 직접 환산) */
  damage: number;
  /** 홍염/작열: 특정 스킬 쿨다운 감소 % */
  cooldown: number;
  /** T4 전용: 기본 공격력 % */
  baseAttack: number;
  /** 겁화 전용: 지원 효과 옵션 % (서폿 버프력 합연산) */
  supportEffect: number;
}

/** 카드 세트 효과 */
export interface CardSetEntry {
  id: string;
  awakening: Partial<Record<12 | 18 | 24 | 30, number>>;
  role?: JobRole;
  note?: string;
}

/**
 * 직업별 스탯 가중치 (1포인트당 딜 기여도, 정규화 0~1)
 *
 * 같은 직업이라도 직업각인(awakening)에 따라 세팅이 달라지므로
 * awakeningId 우선 매칭 → className fallback 매칭.
 */
export interface StatWeightEntry {
  className: string;
  /** 직업각인 ID (선택). 매칭 시 className 매칭보다 우선 */
  awakeningId?: ClassAwakeningId;
  weights: Partial<Record<StatType, number>>;
  note?: string;
}
