import type { AttackPosition, ClassSynergy, RaidRole } from './raidComposition';

export interface RaidBuildResolution {
  readonly role: RaidRole;
  readonly position: AttackPosition;
  readonly title: string;
  readonly needsReview: boolean;
  readonly synergies?: readonly ClassSynergy[];
}

interface RaidBuildDefinition {
  readonly className: string;
  readonly titles: readonly string[];
  readonly role: RaidRole;
  readonly position: AttackPosition;
  readonly synergies?: readonly ClassSynergy[];
}

export const RAID_BUILD_POSITION_SOURCE = {
  label: '에펨코리아 — 시즌3 클래스 직업각인별 딜러 유형 구분',
  url: 'https://www.fmkorea.com/9295915170',
  publishedAt: '2025-12-20',
  note: '공식 용어가 아닌 일반적인 유저 인식 기준의 분류',
} as const;

const BUILD_DEFINITIONS: readonly RaidBuildDefinition[] = [
  { className: '워로드', titles: ['고독한 기사'], role: 'dealer', position: 'entropy-head' },
  { className: '디스트로이어', titles: ['분노의 망치', '중력 수련'], role: 'dealer', position: 'entropy-head' },
  { className: '브레이커', titles: ['수라의 길'], role: 'dealer', position: 'entropy-head' },
  { className: '가디언나이트', titles: ['드레드 로어'], role: 'dealer', position: 'entropy-head' },
  { className: '슬레이어', titles: ['포식자', '처단자'], role: 'dealer', position: 'entropy-back' },
  { className: '블레이드', titles: ['버스트', '잔재된 기운'], role: 'dealer', position: 'entropy-back' },
  { className: '리퍼', titles: ['갈증', '달의 소리'], role: 'dealer', position: 'entropy-back' },
  { className: '홀리나이트', titles: ['심판자'], role: 'dealer', position: 'entropy-back', synergies: [{ name: '치명타 피해 증가', stackingGroup: 'paladin:치명타 피해 증가' }] },
  { className: '인파이터', titles: ['극의 : 체술', '극의: 체술', '충격 단련', '충격단련'], role: 'dealer', position: 'entropy-back' },
  { className: '창술사', titles: ['절제', '절정'], role: 'dealer', position: 'entropy-back' },
  { className: '스트라이커', titles: ['오의난무', '오의 난무', '일격필살', '일격 필살'], role: 'dealer', position: 'entropy-back' },
  { className: '데빌헌터', titles: ['전술 탄환', '전술탄환'], role: 'dealer', position: 'entropy-back' },
  { className: '블래스터', titles: ['포격 강화'], role: 'dealer', position: 'hit-master' },
  { className: '소서리스', titles: ['점화', '환류'], role: 'dealer', position: 'hit-master' },
  { className: '서머너', titles: ['상급 소환사', '넘치는 교감'], role: 'dealer', position: 'hit-master' },
  { className: '건슬링어', titles: ['피스메이커', '사냥의 시간'], role: 'dealer', position: 'hit-master' },
  { className: '가디언나이트', titles: ['업화의 계승자'], role: 'dealer', position: 'hit-master' },
  { className: '기상술사', titles: ['이슬비', '질풍노도'], role: 'dealer', position: 'hit-master' },
  { className: '브레이커', titles: ['권왕파천무'], role: 'dealer', position: 'hit-master' },
  { className: '버서커', titles: ['광기', '광전사의 비기'], role: 'dealer', position: 'hit-master' },
  { className: '워로드', titles: ['전투 태세'], role: 'dealer', position: 'hit-master' },
  { className: '발키리', titles: ['빛의 기사'], role: 'dealer', position: 'hit-master', synergies: [{ name: '치명타 피해 증가', stackingGroup: 'valkyrie:치명타 피해 증가' }] },
  { className: '배틀마스터', titles: ['초심', '오의 강화'], role: 'dealer', position: 'hit-master' },
  { className: '기공사', titles: ['역천지체', '세맥타통'], role: 'dealer', position: 'hit-master' },
  { className: '스카우터', titles: ['진화의 유산', '아르데타인의 기술'], role: 'dealer', position: 'hit-master' },
  { className: '호크아이', titles: ['두 번째 동료', '두번째 동료', '죽음의 습격'], role: 'dealer', position: 'hit-master' },
  { className: '환수사', titles: ['야성', '환수 각성'], role: 'dealer', position: 'hit-master' },
  { className: '아르카나', titles: ['황제의 칙령', '황후의 은총'], role: 'dealer', position: 'hit-master' },
  { className: '데모닉', titles: ['완벽한 억제', '멈출 수 없는 충동'], role: 'dealer', position: 'hit-master' },
  { className: '소울이터', titles: ['만월의 집행자', '그믐의 경계'], role: 'dealer', position: 'hit-master' },
  { className: '블래스터', titles: ['화력 강화'], role: 'dealer', position: 'hit-master' },
  { className: '데빌헌터', titles: ['핸드거너'], role: 'dealer', position: 'hit-master' },
  { className: '바드', titles: ['진실된 용맹'], role: 'dealer', position: 'hit-master', synergies: [{ name: '방어력 감소', stackingGroup: 'bard:방어력 감소' }] },
  { className: '도화가', titles: ['회귀'], role: 'dealer', position: 'hit-master', synergies: [{ name: '방어력 감소', stackingGroup: 'artist:방어력 감소' }] },
  { className: '홀리나이트', titles: ['축복의 오라'], role: 'support', position: 'unknown' },
  { className: '차원술사', titles: ['공간 검사'], role: 'dealer', position: 'entropy-back' },
  { className: '차원술사', titles: ['시간 관리자'], role: 'dealer', position: 'hit-master' },
  { className: '바드', titles: ['절실한 구원'], role: 'support', position: 'unknown' },
  { className: '도화가', titles: ['만개'], role: 'support', position: 'unknown' },
  { className: '발키리', titles: ['해방자'], role: 'support', position: 'unknown' },
];

const normalizeTitle = (value: string): string => value.replace(/\s+/g, '').trim();

const BUILD_BY_CLASS_AND_TITLE = new Map<string, RaidBuildDefinition>();
BUILD_DEFINITIONS.forEach((definition) => {
  definition.titles.forEach((title) => {
    BUILD_BY_CLASS_AND_TITLE.set(`${definition.className}:${normalizeTitle(title)}`, definition);
  });
});

export const resolveRaidBuild = (className: string, arkPassiveTitle: string | null | undefined): RaidBuildResolution => {
  const title = arkPassiveTitle?.trim() ?? '';
  const definition = BUILD_BY_CLASS_AND_TITLE.get(`${className}:${normalizeTitle(title)}`);
  if (!definition) return { role: 'unknown', position: 'unknown', title, needsReview: true };
  return {
    role: definition.role,
    position: definition.position,
    title,
    needsReview: false,
    ...(definition.synergies ? { synergies: definition.synergies } : {}),
  };
};
