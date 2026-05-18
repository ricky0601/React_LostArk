import type { ClassAwakeningEntry, CommonEngravingEntry } from './types';

/**
 * 공용 각인 — 시즌3 아크패시브 기준 전체 43종
 *
 * stages[0..3] = 전설 1~4단계 누적 (%)
 * stages[4..7] = 유물 1~4단계 누적 (%, 유물 1단계는 전설 4단계 위에 적층)
 * 빈 stages → 데이터 미확보 (점수 계산 시 0 처리)
 *
 * 출처: namu.wiki/로스트아크/각인 (2026-05-13 기준), 인벤 99632
 * 가나다 순. 단계별 수치는 점진적 검증 필요.
 */
export const COMMON_ENGRAVINGS: CommonEngravingEntry[] = [
  { id: '각성', stages: [], supporter: true, note: '서폿 필수. 각성기 쿨감 44~50%, 사용횟수 +1/5/5' },
  { id: '강령술', stages: [], note: '소환물 효과 강화' },
  { id: '강화 방패', stages: [], note: '실드 강화' },
  {
    id: '결투의 대가',
    stages: [2, 3, 4.5, 6, 7, 8.5, 10, 12],
    note: '백/헤드 어택 채용 직업 보조',
  },
  { id: '구슬동자', stages: [], supporter: true, note: '서폿 보조 (각성과 함께 종결)' },
  { id: '굳은 의지', stages: [], note: '제압 시 효과' },
  { id: '급소 타격', stages: [], note: '치명타 피해 증가' },
  {
    id: '기습의 대가',
    stages: [2, 3, 4.5, 6, 7, 8.5, 10, 12],
    note: '백어택 추가 피해. 백사멸 직업 종결',
  },
  { id: '긴급 구조', stages: [], note: '생존 보조' },
  { id: '달인의 저력', stages: [], note: '낮은 체력 시 효과' },
  {
    id: '돌격대장',
    stages: [2.5, 3.75, 5.25, 7, 8.5, 10, 11.5, 13],
    note: '이동기 사용 후 공격력 증가. 시즌3 1티어 각인',
  },
  { id: '마나의 흐름', stages: [], note: '마나 회복' },
  { id: '마나 효율 증가', stages: [], note: '마나 소모 감소' },
  { id: '바리케이드', stages: [1.5, 2.5, 3.5, 5, 6, 7, 8, 9], note: '실드 보유 시 피증' },
  { id: '번개의 분노', stages: [], note: '뇌속성 강화' },
  { id: '부러진 뼈', stages: [], note: '취약 적 추가 피해' },
  { id: '분쇄의 주먹', stages: [], note: '무력화 피해 증가' },
  { id: '불굴', stages: [], note: '피격 시 효과' },
  { id: '선수필승', stages: [], note: '전투 초반 효과' },
  { id: '속전속결', stages: [], note: '쿨감/공속' },
  {
    id: '슈퍼 차지',
    stages: [2, 3, 4.5, 6, 7, 8.5, 10, 12],
    note: '차지 스킬 충전 속도 + 피증',
  },
  { id: '승부사', stages: [], note: '확률 기반 피증' },
  { id: '시선 집중', stages: [], note: '도발 효과' },
  { id: '실드 관통', stages: [], note: '실드 무시 피해' },
  {
    id: '아드레날린',
    stages: [3, 4.5, 6, 8, 9.5, 11, 12.5, 14],
    note: '공격력 누적 버프. 어빌리티 스톤 핵심',
  },
  { id: '안정된 상태', stages: [], note: '높은 체력 시 효과' },
  { id: '약자 무시', stages: [], note: '낮은 체력 적 추가 피해' },
  { id: '여신의 가호', stages: [], note: '피해 감소' },
  {
    id: '에테르 포식자',
    stages: [2, 3, 4.5, 6, 7, 8.5, 10, 12],
    note: '에테르 사용 강화 (배틀마스터/리퍼 핵심)',
  },
  {
    id: '예리한 둔기',
    stages: [0.694, 1.387, 2.081, 2.775, 4, 5.5, 7, 8.5],
    note: '치적 70%에서 ≈10% 환산. 치명타 의존',
  },
  {
    id: '원한',
    stages: [3, 6.75, 12, 18, 21, 24.75, 30, 36],
    note: '단계별 추가 +3, +3.75, +5.25, +6 (보스 한정). 누적 12~21% 범위는 유물 단계',
  },
  { id: '위기 모면', stages: [], note: '저체력 회피' },
  {
    id: '저주받은 인형',
    stages: [2.5, 3.75, 5.25, 7, 8.5, 10, 11.5, 13],
    note: '공격력 % 증가 / HP회복 50% 감소',
  },
  { id: '전문의', stages: [], note: '회복/실드 효율 (서폿)', supporter: true },
  { id: '정기 흡수', stages: [], note: '공격속도 + 자체 회복' },
  { id: '정밀 단도', stages: [], note: '치명타 확률/피해 보정' },
  { id: '중갑 착용', stages: [], note: '방어력 증가' },
  {
    id: '질량 증가',
    stages: [2.5, 3.75, 5.25, 7, 8.5, 10, 11.5, 13],
    note: '백/헤드 어택 추가 피해',
  },
  { id: '최대 마나 증가', stages: [], note: '마나 풀 증가' },
  { id: '추진력', stages: [], note: '이동 속도/스킬 강화' },
  {
    id: '타격의 대가',
    stages: [2, 3, 4.5, 6, 7, 8.5, 10, 11],
    note: '돌격대장/질량증가 대비 표기상 -2%p',
  },
  { id: '탈출의 명수', stages: [], note: '구속 해제' },
  { id: '폭발물 전문가', stages: [], note: '폭발물 강화' },
];

/**
 * 페널티 각인 (디버프 슬롯, 어빌리티 스톤의 음수 부분에서 활성화)
 */
export const PENALTY_ENGRAVINGS: CommonEngravingEntry[] = [
  { id: '공격력 감소', stages: [], penalty: true },
  { id: '공격속도 감소', stages: [], penalty: true },
  { id: '이동속도 감소', stages: [], penalty: true },
  { id: '방어력 감소', stages: [], penalty: true },
];

/**
 * 직업 깨달음 (구 직업각인) — 시즌3 아크패시브 깨달음 탭
 *
 * 각 클래스의 정체성을 결정하는 직업각인. 클래스당 2개 중 1개 선택.
 * stages[0..3] = 1~4단계 누적 딜증가율(%) 추정치.
 * supporter 직업각인은 stages가 빈 배열 → 버프력 환산 필요 (별도 모델).
 *
 * 출처: namu.wiki 각 클래스 페이지, 인벤 134642~134681 (직업별 각인 정리)
 *      게임톡 71108(슬레이어), 인벤 297358(시즌3 신규)
 * 2026-05-15 기준 정정 완료.
 */
export const CLASS_AWAKENINGS: ClassAwakeningEntry[] = [
  // === 전사 (Warrior) ===
  { id: '분노의 망치', className: '디스트로이어', role: 'dealer', stages: [12, 18, 24, 30], note: '집속기로 3코어 모아 해방기 한방' },
  { id: '중력 수련', className: '디스트로이어', role: 'dealer', stages: [10, 15, 20, 25], note: '아덴기 진입 시 이동기 초기화, 중수딜' },
  { id: '광기', className: '버서커', role: 'dealer', stages: [16, 22, 30, 38], note: '폭주 시 최대 10중첩 피증, 받피감 72% 상시' },
  { id: '광전사의 비기', className: '버서커', role: 'dealer', stages: [14, 20, 26, 34], note: '폭주 시 딜증, 특화 계수 높음' },
  { id: '고독한 기사', className: '워로드', role: 'dealer', stages: [12, 17, 22, 28], note: '방어 태세 시 랜스 강화' },
  { id: '전투 태세', className: '워로드', role: 'dealer', stages: [12, 17, 22, 28], note: '방어 태세 중 전투 준비 효과' },
  { id: '심판자', className: '홀리나이트', role: 'supporter', stages: [], note: '징벌 25%, 신앙 100%, 집행자 지속시간 2배' },
  { id: '축복의 오라', className: '홀리나이트', role: 'supporter', stages: [], note: '축복 오라 강화' },
  { id: '처단자', className: '슬레이어', role: 'dealer', stages: [14, 20, 26, 34], note: '극특화. 광폭 25% 피증, 광폭 50% 단축, 탈진 X' },
  { id: '포식자', className: '슬레이어', role: 'dealer', stages: [14, 20, 26, 34], note: '극신속. 광폭 치피 40%, 흡혈 10%' },
  { id: '빛의 기사', className: '발키리', role: 'dealer', stages: [12, 18, 24, 32], note: '딜키리. 수호 스킬 잠금, 종언의 빛 아덴기' },
  { id: '해방자', className: '발키리', role: 'supporter', stages: [], note: '서폿. 정의 스킬 잠금, 빛의 해방 공증 12초' },

  // === 가디언나이트 (Guardian Knight) — 2025-12-10 출시 ===
  { id: '업화의 계승자', className: '가디언나이트', role: 'dealer', stages: [12, 18, 24, 32], note: '헤드어택 딜러' },
  { id: '드레드 로어', className: '가디언나이트', role: 'dealer', stages: [12, 18, 24, 32], note: '차지/즉발 빌드. 변신 용기사' },

  // === 무도가 (Martial Artist) ===
  { id: '일격필살', className: '스트라이커', role: 'dealer', stages: [12, 18, 24, 32], note: '오의 스킬 강화 (구슬 1개 증가)' },
  { id: '오의난무', className: '스트라이커', role: 'dealer', stages: [10, 15, 22, 30], note: '오의 스킬 구슬 1개 고정. 편의성' },
  { id: '충격 단련', className: '인파이터', role: 'dealer', stages: [10, 15, 22, 30], note: '충격 스킬 피해 20%, 에너지 4%/초 회복' },
  { id: '극의: 체술', className: '인파이터', role: 'dealer', stages: [12, 18, 24, 32], note: '기력 회복 600%, 기력 60% 강화, 충격 -30%' },
  { id: '초심', className: '배틀마스터', role: 'dealer', stages: [10, 15, 22, 30], note: '피해 25% 증가, 엘리멘탈 게이지 획득 불가' },
  { id: '오의 강화', className: '배틀마스터', role: 'dealer', stages: [10, 15, 22, 30], note: '구슬 +1, 구슬 1개당 오의 피해 12%' },
  { id: '절정', className: '창술사', role: 'dealer', stages: [12, 18, 24, 30], note: '절정 버프 = 특화 의존' },
  { id: '절제', className: '창술사', role: 'dealer', stages: [12, 18, 24, 30], note: '신속-치명 위주. 자체 치적 수급' },
  { id: '세맥타통', className: '기공사', role: 'dealer', stages: [10, 15, 22, 30], note: '내공 30% 미만 시 +15% 피증' },
  { id: '역천지체', className: '기공사', role: 'dealer', stages: [10, 15, 22, 30], note: '역천 빌드' },
  { id: '수라의 길', className: '브레이커', role: 'dealer', stages: [12, 18, 24, 32], note: '수라 게이지로 변경, 기본/충격 교차' },
  { id: '호신투기', className: '브레이커', role: 'dealer', stages: [2, 8, 14, 20], note: '피증 2/8/14%, 가드 자세 15초' },

  // === 헌터 (Hunter) ===
  { id: '강화 무기', className: '데빌헌터', role: 'dealer', stages: [12, 18, 24, 32], note: '스탠스 변경 시 치적 27% (6초)' },
  { id: '핸드 거너', className: '데빌헌터', role: 'dealer', stages: [12, 18, 24, 32], note: '피해 60% 증가, 핸드건 스탠스만' },
  { id: '화력 강화', className: '블래스터', role: 'dealer', stages: [12, 18, 24, 32], note: '받피감 30%, 치적 25~35%' },
  { id: '연속 포격', className: '블래스터', role: 'dealer', stages: [10, 15, 22, 30], note: '포격 처치 시 쿨초기화, 포격 +2% 누적' },
  { id: '죽음의 습격', className: '호크아이', role: 'dealer', stages: [12, 18, 24, 32], note: '최후의 습격 게이지 50% 반환, 피증 40% (8초)' },
  { id: '두 번째 동료', className: '호크아이', role: 'dealer', stages: [10, 15, 22, 30], note: '실버호크 MK-Ⅱ 소환, 기본공격 +150%' },
  { id: '아르테타인의 기술', className: '스카우터', role: 'dealer', stages: [12, 18, 24, 32], note: '드론/합작 피해 +25%, 배터리 +20%' },
  { id: '진화의 유산', className: '스카우터', role: 'dealer', stages: [12, 18, 24, 32], note: '하이퍼 싱크 모드. 싱크 스킬 21% 피증' },
  { id: '피스메이커', className: '건슬링어', role: 'dealer', stages: [12, 18, 24, 32], note: '스탠스 변경 시 공속 16%, 치적 15%, 피증 42% (9초)' },
  { id: '사냥의 시간', className: '건슬링어', role: 'dealer', stages: [10, 15, 22, 30], note: '핸드건/소총 위주' },

  // === 마법사 (Mage) ===
  { id: '절실한 구원', className: '바드', role: 'supporter', stages: [], note: '구원의 세레나데 회복 강화 (특화 의존)' },
  { id: '진실된 용맹', className: '바드', role: 'supporter', stages: [], note: '버프력 환산 필요' },
  { id: '점화', className: '소서리스', role: 'dealer', stages: [12, 18, 24, 32], note: '아덴 누적 후 순간 폭딜. 폭딜러 시조' },
  { id: '환류', className: '소서리스', role: 'dealer', stages: [10, 15, 22, 30], note: '점멸 버프 기반 운영, 응집되는 마력' },
  { id: '넘치는 교감', className: '서머너', role: 'dealer', stages: [10, 15, 22, 30], note: '환수 유지시간 +20%, 공/이속 +10%' },
  { id: '상급 소환사', className: '서머너', role: 'dealer', stages: [12, 18, 24, 32], note: '환수 기본공격 강화, 소환 스킬 +36%' },
  { id: '황후의 은총', className: '아르카나', role: 'dealer', stages: [12, 18, 24, 32], note: '4스택 루인 +30%, 마나 20% 회복' },
  { id: '황제의 칙령', className: '아르카나', role: 'dealer', stages: [10, 15, 22, 30], note: '일반 스킬 덱 +50%, 피해 +30%, 황제 카드' },

  // === 암살자 (Assassin) ===
  { id: '멈출 수 없는 충동', className: '데모닉', role: 'dealer', stages: [12, 18, 24, 32], note: '충모닉. 충동 변신 메인' },
  { id: '완벽한 억제', className: '데모닉', role: 'dealer', stages: [10, 15, 22, 30], note: '억모닉. 휴먼 폼 위주' },
  { id: '달의 소리', className: '리퍼', role: 'dealer', stages: [12, 18, 24, 32], note: '급습 한방 딜링, 환영 폼' },
  { id: '갈증', className: '리퍼', role: 'dealer', stages: [10, 15, 22, 30], note: '혼돈 유지 지속 딜링, 그림자 매복' },
  { id: '만월의 집행자', className: '소울이터', role: 'dealer', stages: [12, 18, 24, 32], note: '만월 빌드' },
  { id: '그믐의 경계', className: '소울이터', role: 'dealer', stages: [10, 15, 22, 30], note: '그믐 빌드' },
  { id: '잔재된 기운', className: '블레이드', role: 'dealer', stages: [12, 18, 24, 32], note: '아츠 단계 사라지고 바로 버스트' },
  { id: '버스트', className: '블레이드', role: 'dealer', stages: [10, 15, 22, 30], note: '시즌3에서 비주류화' },

  // === 스페셜리스트 (Specialist) ===
  { id: '회귀', className: '도화가', role: 'supporter', stages: [], note: '서폿 메인. 만개 광역힐 X, 단일 버스트힐 O' },
  { id: '만개', className: '도화가', role: 'supporter', stages: [], note: '광역 힐 + 버스트 힐' },
  { id: '이슬비', className: '기상술사', role: 'dealer', stages: [12, 18, 24, 32], note: '기상 스킬 위주. 특화 1당 +0.071%' },
  { id: '질풍노도', className: '기상술사', role: 'dealer', stages: [10, 15, 22, 30], note: '여우비 범위 감소, 빗방울 50% 증가, 파티 공/이속 12%' },
  { id: '환수 각성', className: '환수사', role: 'dealer', stages: [12, 18, 24, 32], note: '공/이속 20% (30초), 환수 스킬 치피 증가' },
  { id: '야성', className: '환수사', role: 'dealer', stages: [10, 15, 22, 30], note: '곰/여우 둔갑. 곰=받피감, 여우=이속' },
];

export const findCommonEngraving = (id: string): CommonEngravingEntry | undefined =>
  COMMON_ENGRAVINGS.find((e) => e.id === id) ?? PENALTY_ENGRAVINGS.find((e) => e.id === id);

export const findClassAwakening = (id: string, className?: string): ClassAwakeningEntry | undefined => {
  if (className) {
    const match = CLASS_AWAKENINGS.find((e) => e.id === id && e.className === className);
    if (match) return match;
  }
  return CLASS_AWAKENINGS.find((e) => e.id === id);
};
