import type { StatWeightEntry } from './types';

/**
 * 직업별·직업각인별 스탯 가중치 (1포인트당 딜 기여도, 정규화 0~1)
 *
 * 1.0 = 1순위, 0.6~0.8 = 2순위, 0.0~0.3 = 거의 무관.
 * awakeningId가 명시된 항목은 해당 깨달음 선택 시 우선 적용.
 * awakeningId 미명시 entry = className만으로 매칭 (해당 직업 default).
 *
 * 신뢰도:
 *   - [확보]: 명시 수치 또는 비율 출처 (note에 표시)
 *   - [추정]: 직업각인 메타에서 일반적 합의
 *
 * 27개 클래스 전체 커버 (2026-05-15 기준):
 *   전사 7, 무도가 6, 헌터 5, 마법사 4, 암살자 4, 스페셜리스트 3 = 29개
 *   (가디언나이트는 6개 군과 무관한 오리지널)
 */
export const STAT_WEIGHTS: StatWeightEntry[] = [
  // === 전사 (Warrior) ===
  // 디스트로이어
  { className: '디스트로이어', awakeningId: '분노의 망치', weights: { 치명: 1.0, 특화: 0.7, 신속: 0.2 }, note: '[추정] 한방 빌드' },
  { className: '디스트로이어', awakeningId: '중력 수련', weights: { 특화: 1.0, 치명: 0.6, 신속: 0.3 }, note: '[추정] 중수딜 빌드' },
  { className: '디스트로이어', weights: { 치명: 1.0, 특화: 0.7, 신속: 0.2 } },

  // 버서커
  { className: '버서커', awakeningId: '광기', weights: { 치명: 1.0, 특화: 0.6, 신속: 0.0 }, note: '[확보] 받피감 72% + 10중첩 피증' },
  { className: '버서커', awakeningId: '광전사의 비기', weights: { 특화: 1.0, 치명: 0.7, 신속: 0.3 }, note: '[확보] 특화 계수 높음' },
  { className: '버서커', weights: { 치명: 1.0, 특화: 0.6, 신속: 0.0 } },

  // 워로드
  { className: '워로드', awakeningId: '고독한 기사', weights: { 특화: 1.0, 신속: 0.6, 치명: 0.3 }, note: '[추정] 랜스 강화' },
  { className: '워로드', awakeningId: '전투 태세', weights: { 신속: 1.0, 특화: 0.5, 치명: 0.4 }, note: '[추정] 시즌3 신규' },
  { className: '워로드', weights: { 특화: 1.0, 신속: 0.6, 치명: 0.3 } },

  // 홀리나이트 (서폿)
  { className: '홀리나이트', awakeningId: '심판자', weights: { 신속: 1.0, 특화: 0.35 }, note: '[확보] 신속 1800/특화 600 ≈ 3:1' },
  { className: '홀리나이트', awakeningId: '축복의 오라', weights: { 신속: 1.0, 특화: 0.4 }, note: '[확보] 특화 10/신속 30' },
  { className: '홀리나이트', weights: { 신속: 1.0, 특화: 0.35 } },

  // 슬레이어
  { className: '슬레이어', awakeningId: '처단자', weights: { 특화: 1.0, 치명: 0.6, 신속: 0.2 }, note: '[확보] 극특화. 광폭 25% 피증' },
  { className: '슬레이어', awakeningId: '포식자', weights: { 신속: 1.0, 치명: 0.7, 특화: 0.3 }, note: '[확보] 극신속. 광폭 치피 40%' },
  { className: '슬레이어', weights: { 특화: 1.0, 치명: 0.6, 신속: 0.3 } },

  // 발키리
  { className: '발키리', awakeningId: '빛의 기사', weights: { 치명: 1.0, 특화: 0.6, 신속: 0.5 }, note: '[추정] 딜키리. 종언의 빛' },
  { className: '발키리', awakeningId: '해방자', weights: { 신속: 1.0, 특화: 0.4 }, note: '[추정] 서폿. 빛의 해방' },
  { className: '발키리', weights: { 치명: 1.0, 특화: 0.6, 신속: 0.5 } },

  // === 가디언나이트 (오리지널 클래스) ===
  { className: '가디언나이트', awakeningId: '업화의 계승자', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.3 }, note: '[추정] 헤드어택 딜러, 극신 채용' },
  { className: '가디언나이트', awakeningId: '드레드 로어', weights: { 치명: 1.0, 특화: 0.8, 신속: 0.4 }, note: '[추정] 차지/즉발 빌드' },
  { className: '가디언나이트', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.4 } },

  // === 무도가 (Martial Artist) ===
  // 스트라이커
  { className: '스트라이커', awakeningId: '일격필살', weights: { 특화: 1.0, 신속: 0.5, 치명: 0.5 }, note: '[확보] 극특화 빌드 가능' },
  { className: '스트라이커', awakeningId: '오의난무', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.3 }, note: '[추정] 편의성 빌드' },
  { className: '스트라이커', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.3 } },

  // 인파이터
  { className: '인파이터', awakeningId: '충격 단련', weights: { 신속: 1.0, 치명: 0.6, 특화: 0.3 }, note: '[확보] 정기흡수 채용, 신속 위주' },
  { className: '인파이터', awakeningId: '극의: 체술', weights: { 치명: 1.0, 특화: 0.7, 신속: 0.4 }, note: '[추정] 기력 위주' },
  { className: '인파이터', weights: { 신속: 1.0, 치명: 0.6, 특화: 0.3 } },

  // 배틀마스터
  { className: '배틀마스터', awakeningId: '초심', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.4 }, note: '[추정] 25% 피증' },
  { className: '배틀마스터', awakeningId: '오의 강화', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.4 }, note: '[추정] 구슬 1개당 12%' },
  { className: '배틀마스터', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.4 } },

  // 창술사
  { className: '창술사', awakeningId: '절정', weights: { 특화: 1.0, 신속: 0.8, 치명: 0.3 }, note: '[확보] 절정 버프=특화. 도약 카르마 후 특신' },
  { className: '창술사', awakeningId: '절제', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.2 }, note: '[확보] 신속-치명. 사멸이면 극신속' },
  { className: '창술사', weights: { 특화: 1.0, 신속: 0.8, 치명: 0.3 } },

  // 기공사
  { className: '기공사', awakeningId: '세맥타통', weights: { 특화: 1.0, 신속: 0.7, 치명: 0.4 }, note: '[추정] 세맥기공' },
  { className: '기공사', awakeningId: '역천지체', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.4 }, note: '[추정] 역천 빌드' },
  { className: '기공사', weights: { 특화: 1.0, 신속: 0.7, 치명: 0.4 } },

  // 브레이커
  { className: '브레이커', awakeningId: '수라의 길', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.4 }, note: '[추정] 수라 게이지' },
  { className: '브레이커', awakeningId: '호신투기', weights: { 특화: 1.0, 신속: 0.6, 치명: 0.4 }, note: '[추정] 가드 자세 15초' },
  { className: '브레이커', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.4 } },

  // === 헌터 (Hunter) ===
  // 데빌헌터
  { className: '데빌헌터', awakeningId: '강화 무기', weights: { 치명: 1.0, 특화: 0.7, 신속: 0.4 }, note: '[확보] 스탠스 변경 시 치적 27%' },
  { className: '데빌헌터', awakeningId: '핸드 거너', weights: { 치명: 1.0, 특화: 0.6, 신속: 0.4 }, note: '[추정] 핸드건 only, 60% 피증' },
  { className: '데빌헌터', weights: { 치명: 1.0, 특화: 0.7, 신속: 0.4 } },

  // 블래스터
  { className: '블래스터', awakeningId: '화력 강화', weights: { 치명: 1.0, 특화: 0.8, 신속: 0.2 }, note: '[확보] 치적 +25~35%' },
  { className: '블래스터', awakeningId: '연속 포격', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.4 }, note: '[추정] 포격 누적' },
  { className: '블래스터', weights: { 치명: 1.0, 특화: 0.8, 신속: 0.2 } },

  // 호크아이
  { className: '호크아이', awakeningId: '죽음의 습격', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.3 }, note: '[확보] 최후의 습격 한방' },
  { className: '호크아이', awakeningId: '두 번째 동료', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.4 }, note: '[추정] 실버호크 MK-Ⅱ' },
  { className: '호크아이', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.3 } },

  // 스카우터
  { className: '스카우터', awakeningId: '아르테타인의 기술', weights: { 특화: 1.0, 치명: 0.7, 신속: 0.4 }, note: '[추정] 드론/합작 25%, 배터리 20%' },
  { className: '스카우터', awakeningId: '진화의 유산', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.4 }, note: '[확보] 하이퍼 싱크 21%' },
  { className: '스카우터', weights: { 특화: 1.0, 치명: 0.7, 신속: 0.4 } },

  // 건슬링어
  { className: '건슬링어', awakeningId: '피스메이커', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.4 }, note: '[확보] 시즌3 진화형 피해로 특화 유용' },
  { className: '건슬링어', awakeningId: '사냥의 시간', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.4 }, note: '[추정] 핸드건/소총' },
  { className: '건슬링어', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.4 } },

  // === 마법사 (Mage) ===
  // 바드 (서폿)
  { className: '바드', awakeningId: '절실한 구원', weights: { 특화: 1.0, 신속: 0.65 }, note: '[확보] 신속 1300/특화 700 ≈ 2:1. 회복 특화 의존' },
  { className: '바드', awakeningId: '진실된 용맹', weights: { 특화: 1.0, 신속: 0.65 }, note: '[확보] 동일 비율' },
  { className: '바드', weights: { 특화: 1.0, 신속: 0.65 } },

  // 소서리스
  { className: '소서리스', awakeningId: '점화', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.5 }, note: '[추정] 폭딜러 시조, 아덴 누적' },
  { className: '소서리스', awakeningId: '환류', weights: { 특화: 1.0, 신속: 0.7, 치명: 0.4 }, note: '[추정] 점멸 버프 운영' },
  { className: '소서리스', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.5 } },

  // 서머너
  { className: '서머너', awakeningId: '넘치는 교감', weights: { 신속: 1.0, 특화: 0.7, 치명: 0.4 }, note: '[추정] 환수 유지 + 공/이속' },
  { className: '서머너', awakeningId: '상급 소환사', weights: { 특화: 1.0, 신속: 0.7, 치명: 0.4 }, note: '[추정] 소환 36% 피증, 교감 빌드' },
  { className: '서머너', weights: { 특화: 1.0, 신속: 0.7, 치명: 0.4 } },

  // 아르카나
  { className: '아르카나', awakeningId: '황후의 은총', weights: { 특화: 1.0, 신속: 0.7, 치명: 0.4 }, note: '[추정] 4스택 루인 30%' },
  { className: '아르카나', awakeningId: '황제의 칙령', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.4 }, note: '[추정] 일반 스킬 30%, 황제 카드' },
  { className: '아르카나', weights: { 특화: 1.0, 신속: 0.7, 치명: 0.4 } },

  // === 암살자 (Assassin) ===
  // 데모닉
  { className: '데모닉', awakeningId: '멈출 수 없는 충동', weights: { 특화: 1.0, 신속: 0.6, 치명: 0.4 }, note: '[추정] 충동 변신 메인' },
  { className: '데모닉', awakeningId: '완벽한 억제', weights: { 치명: 1.0, 특화: 0.7, 신속: 0.4 }, note: '[추정] 휴먼 폼 위주' },
  { className: '데모닉', weights: { 특화: 1.0, 신속: 0.7, 치명: 0.4 } },

  // 리퍼
  { className: '리퍼', awakeningId: '달의 소리', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.3 }, note: '[추정] 환영 폼 한방' },
  { className: '리퍼', awakeningId: '갈증', weights: { 신속: 1.0, 치명: 0.7, 특화: 0.3 }, note: '[추정] 그림자 매복 지속딜' },
  { className: '리퍼', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.3 } },

  // 소울이터
  { className: '소울이터', awakeningId: '만월의 집행자', weights: { 신속: 1.0, 치명: 0.7, 특화: 0.4 }, note: '[추정] 만월 빌드' },
  { className: '소울이터', awakeningId: '그믐의 경계', weights: { 치명: 1.0, 특화: 0.7, 신속: 0.4 }, note: '[추정] 그믐 빌드' },
  { className: '소울이터', weights: { 신속: 1.0, 치명: 0.7, 특화: 0.4 } },

  // 블레이드
  { className: '블레이드', awakeningId: '잔재된 기운', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.4 }, note: '[확보] 시즌3 메인. 버스트 즉발' },
  { className: '블레이드', awakeningId: '버스트', weights: { 치명: 1.0, 특화: 0.7, 신속: 0.5 }, note: '[추정] 시즌3 비주류화' },
  { className: '블레이드', weights: { 치명: 1.0, 신속: 0.7, 특화: 0.4 } },

  // === 스페셜리스트 (Specialist) ===
  // 도화가 (서폿)
  { className: '도화가', awakeningId: '회귀', weights: { 신속: 1.0, 특화: 0.4 }, note: '[추정] 서폿 메인' },
  { className: '도화가', awakeningId: '만개', weights: { 신속: 1.0, 특화: 0.5 }, note: '[추정] 광역 힐' },
  { className: '도화가', weights: { 신속: 1.0, 특화: 0.4 } },

  // 기상술사
  { className: '기상술사', awakeningId: '이슬비', weights: { 특화: 1.0, 신속: 0.7, 치명: 0.4 }, note: '[확보] 특화 1당 +0.071% (기상 스킬)' },
  { className: '기상술사', awakeningId: '질풍노도', weights: { 신속: 1.0, 치명: 0.7, 특화: 0.4 }, note: '[추정] 빠른 스킬 사용' },
  { className: '기상술사', weights: { 특화: 1.0, 신속: 0.7, 치명: 0.4 } },

  // 환수사
  { className: '환수사', awakeningId: '환수 각성', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.3 }, note: '[추정] 공/이속 20% 30초' },
  { className: '환수사', awakeningId: '야성', weights: { 신속: 1.0, 치명: 0.7, 특화: 0.3 }, note: '[추정] 곰/여우 둔갑' },
  { className: '환수사', weights: { 치명: 1.0, 신속: 0.8, 특화: 0.3 } },
];

/** 데이터 미확보 시 기본 가중치 (균등 분배) */
export const DEFAULT_STAT_WEIGHTS: StatWeightEntry['weights'] = {
  치명: 0.8,
  특화: 0.6,
  신속: 0.6,
};

/**
 * 직업명 + (선택) 직업각인 ID로 스탯 가중치 조회
 * - awakeningId 매칭 우선
 * - 없으면 className default (awakeningId 미지정 entry)
 * - 둘 다 없으면 DEFAULT
 */
export const getStatWeights = (
  className: string,
  awakeningId?: string,
): StatWeightEntry['weights'] => {
  if (awakeningId) {
    const exact = STAT_WEIGHTS.find((s) => s.className === className && s.awakeningId === awakeningId);
    if (exact) return exact.weights;
  }
  const defaultEntry = STAT_WEIGHTS.find((s) => s.className === className && !s.awakeningId);
  if (defaultEntry) return defaultEntry.weights;
  return DEFAULT_STAT_WEIGHTS;
};
