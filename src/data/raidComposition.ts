export type RaidRole = 'dealer' | 'support' | 'unknown';
export type AttackPosition = 'entropy-head' | 'entropy-back' | 'hit-master' | 'unknown';

export interface RaidCompositionDataSource {
  readonly id: string;
  readonly label: string;
  readonly url: string;
}

export interface ClassSynergy {
  readonly name: string;
  /** 실제 중첩 단위. 같은 효과여도 서로 중첩되는 다른 직업은 별도 그룹을 사용한다. */
  readonly stackingGroup: string;
}

export interface RaidClassData {
  readonly name: string;
  readonly role: RaidRole;
  readonly position: AttackPosition;
  readonly synergies: readonly ClassSynergy[];
  readonly sourceIds: readonly string[];
  readonly needsReview: boolean;
  readonly reviewReason?: string;
}

export const RAID_COMPOSITION_DATA_METADATA = {
  version: 'kr-2026-09-09-review-3',
  gameVersion: '2026-09-04 KR live',
  lastCheckedAt: '2026-09-09',
  verificationStatus: 'partially-verified',
  notes: [
    '직업 아이콘만으로 역할이나 공격 포지션이 달라질 수 있는 직업은 unknown으로 분류한다.',
    '동일 효과의 다른 직업 시너지는 중첩될 수 있으므로 stackingGroup은 효과 이름이 아닌 직업별 중첩 단위를 나타낸다.',
    '커뮤니티 자료만 확인된 항목은 needsReview로 표시하며 UI에서 확정 자료처럼 노출하지 않는다.',
    '아크패시브 타이틀별 헤드·백·타대는 2025-12-20 커뮤니티 분류를 사용하며 미등록 타이틀은 unknown으로 유지한다.',
  ],
  sources: [
    {
      id: 'official-classes',
      label: '로스트아크 공식 클래스 목록',
      url: 'https://lostark.game.onstove.com/Class',
    },
    {
      id: 'official-dimensionmaster-synergy',
      label: '공식 업데이트 — 디스트로이어·차원술사 갑옷 파괴 중첩 수정',
      url: 'https://lostark.game.onstove.com/News/Notice/Views/13492',
    },
    {
      id: 'community-synergy-2026-01-26',
      label: '로스트아크 인벤 — 2026년 기준 전 직업 시너지 정리',
      url: 'https://www.inven.co.kr/board/lostark/4821/109381',
    },
    {
      id: 'community-position-reference',
      label: '로스트아크 인벤 — 전직업 사멸/비사멸/타대 분류',
      url: 'https://tr.inven.co.kr/view/6903',
    },
    {
      id: 'loaguard-synergy-2026',
      label: 'LoaGuard — 클래스 시너지 가이드',
      url: 'https://loaguard.com/synergy/',
    },
    {
      id: 'canfactory-synergy-2026',
      label: 'G11 — 로스트아크 직업 시너지 및 편성 원칙',
      url: 'https://canfactory.tistory.com/681',
    },
    {
      id: 'fmkorea-build-position-2025-12-20',
      label: '에펨코리아 — 시즌3 클래스 직업각인별 딜러 유형 구분',
      url: 'https://www.fmkorea.com/9295915170',
    },
  ] satisfies readonly RaidCompositionDataSource[],
} as const;

const COMMUNITY_SOURCE = [
  'official-classes',
  'community-synergy-2026-01-26',
  'community-position-reference',
  'loaguard-synergy-2026',
] as const;
const OFFICIAL_DIMENSIONMASTER_SOURCE = [
  'official-classes',
  'official-dimensionmaster-synergy',
] as const;

const synergy = (name: string, classKey: string): readonly ClassSynergy[] => [{
  name,
  stackingGroup: `${classKey}:${name}`,
}];

/**
 * 화면의 직업 아이콘만 확인한 상태에서 사용할 보수적인 기본값이다.
 * 각인/빌드 확인이 필요한 값은 임의로 확정하지 않고 unknown으로 둔다.
 */
export const RAID_CLASS_DATA: readonly RaidClassData[] = [
  { name: '디스트로이어', role: 'dealer', position: 'entropy-head', synergies: [...synergy('방어력 감소', 'destroyer'), ...synergy('무력화 피해 증가', 'destroyer')], sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '버서커', role: 'dealer', position: 'unknown', synergies: synergy('피해 증가', 'berserker'), sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '빌드에 따른 공격 포지션 수동 확인 필요' },
  { name: '워로드', role: 'dealer', position: 'unknown', synergies: [...synergy('방어력 감소', 'gunlancer'), ...synergy('헤드·백어택 피해 증가', 'gunlancer')], sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '고독한 기사/전투 태세에 따라 헤드·타대가 달라짐' },
  { name: '홀리나이트', role: 'unknown', position: 'unknown', synergies: [], sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '심판자/축복의 오라에 따라 딜러·서포터 역할이 달라짐' },
  { name: '슬레이어', role: 'dealer', position: 'entropy-back', synergies: synergy('피해 증가', 'slayer'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '발키리', role: 'unknown', position: 'unknown', synergies: [], sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '빛의 기사/해방자에 따라 딜러·서포터 역할과 시너지가 달라짐' },
  { name: '인파이터', role: 'dealer', position: 'entropy-back', synergies: [...synergy('피해 증가', 'scrapper'), ...synergy('무력화 피해 증가', 'scrapper')], sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '배틀마스터', role: 'dealer', position: 'unknown', synergies: synergy('치명타 적중률 증가', 'wardancer'), sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '빌드에 따른 공격 포지션 수동 확인 필요' },
  { name: '창술사', role: 'dealer', position: 'entropy-back', synergies: synergy('치명타 피해 증가', 'glaivier'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '기공사', role: 'dealer', position: 'hit-master', synergies: synergy('공격력 증가', 'soulfist'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '브레이커', role: 'dealer', position: 'unknown', synergies: synergy('피해 증가', 'breaker'), sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '수라의 길/권왕파천무에 따라 헤드·타대가 달라짐' },
  { name: '스트라이커', role: 'dealer', position: 'entropy-back', synergies: synergy('치명타 적중률 증가', 'striker'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '데빌헌터', role: 'dealer', position: 'unknown', synergies: synergy('치명타 적중률 증가', 'deadeye'), sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '빌드에 따른 공격 포지션 수동 확인 필요' },
  { name: '블래스터', role: 'dealer', position: 'hit-master', synergies: [...synergy('방어력 감소', 'artillerist'), ...synergy('무력화 피해 증가', 'artillerist')], sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '스카우터', role: 'dealer', position: 'hit-master', synergies: synergy('공격력 증가', 'machinist'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '호크아이', role: 'dealer', position: 'hit-master', synergies: synergy('피해 증가', 'sharpshooter'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '건슬링어', role: 'dealer', position: 'hit-master', synergies: synergy('치명타 적중률 증가', 'gunslinger'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '바드', role: 'unknown', position: 'unknown', synergies: [], sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '진실된 용맹/절실한 구원에 따라 딜러·서포터 역할이 달라짐' },
  { name: '서머너', role: 'dealer', position: 'hit-master', synergies: synergy('방어력 감소', 'summoner'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '소서리스', role: 'dealer', position: 'hit-master', synergies: synergy('피해 증가', 'sorceress'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '아르카나', role: 'dealer', position: 'hit-master', synergies: synergy('치명타 적중률 증가', 'arcanist'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '데모닉', role: 'dealer', position: 'unknown', synergies: synergy('피해 증가', 'shadowhunter'), sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '빌드에 따른 공격 포지션 수동 확인 필요' },
  { name: '리퍼', role: 'dealer', position: 'entropy-back', synergies: synergy('방어력 감소', 'reaper'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '블레이드', role: 'dealer', position: 'entropy-back', synergies: synergy('헤드·백어택 피해 증가', 'deathblade'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '소울이터', role: 'dealer', position: 'hit-master', synergies: synergy('피해 증가', 'souleater'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '도화가', role: 'unknown', position: 'unknown', synergies: [], sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '회귀/만개에 따라 딜러·서포터 역할이 달라짐' },
  { name: '기상술사', role: 'dealer', position: 'hit-master', synergies: synergy('치명타 적중률 증가', 'aeromancer'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '환수사', role: 'dealer', position: 'hit-master', synergies: synergy('방어력 감소', 'wildsoul'), sourceIds: COMMUNITY_SOURCE, needsReview: true },
  { name: '차원술사', role: 'dealer', position: 'unknown', synergies: synergy('방어력 감소', 'dimensionmaster'), sourceIds: OFFICIAL_DIMENSIONMASTER_SOURCE, needsReview: true, reviewReason: '공간 검사(백)/시간 관리자(타대)로 아크패시브 확인 필요' },
  { name: '가디언나이트', role: 'dealer', position: 'unknown', synergies: synergy('피해 증가', 'guardianknight'), sourceIds: COMMUNITY_SOURCE, needsReview: true, reviewReason: '공식 최신 시너지·공격 포지션 출처 추가 확인 필요' },
];

export const RAID_CLASS_DATA_BY_NAME: ReadonlyMap<string, RaidClassData> = new Map(
  RAID_CLASS_DATA.map((classData) => [classData.name, classData]),
);
