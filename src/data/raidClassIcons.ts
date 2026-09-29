export interface RaidClassIconTemplate {
  readonly className: string;
  readonly fileName: string;
  readonly url: string;
  readonly sourceUrl: string;
}

const OFFICIAL_CLASS_ICON_BASE = 'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/common/class';
const LOCAL_CLASS_ICON_BASE = '/images/raid-composition/classes';

const icon = (className: string, fileName: string): RaidClassIconTemplate => ({
  className,
  fileName,
  url: `${LOCAL_CLASS_ICON_BASE}/${fileName}.svg`,
  sourceUrl: `${OFFICIAL_CLASS_ICON_BASE}/${fileName}.svg`,
});

/**
 * 로스트아크 공식 직업 게시판의 클래스 아이콘 목록.
 * 기본 클래스 아이콘은 제외하고 8인 공격대 슬롯에 표시되는 전직 30개만 포함한다.
 * 확인일: 2026-09-09
 * 출처: https://lostark.game.onstove.com/Community/DimensionMaster/List
 */
export const RAID_CLASS_ICON_TEMPLATES: readonly RaidClassIconTemplate[] = [
  icon('디스트로이어', 'destroyer'),
  icon('워로드', 'warlord'),
  icon('버서커', 'berserker'),
  icon('홀리나이트', 'holyknight'),
  icon('슬레이어', 'slayer'),
  icon('발키리', 'valkyrie'),
  icon('스트라이커', 'striker'),
  icon('브레이커', 'breaker'),
  icon('배틀마스터', 'battlemaster'),
  icon('인파이터', 'infighter'),
  icon('기공사', 'soulmaster'),
  icon('창술사', 'lancemaster'),
  icon('데빌헌터', 'devilhunter'),
  icon('블래스터', 'blaster'),
  icon('호크아이', 'hawkeye'),
  icon('스카우터', 'scouter'),
  icon('건슬링어', 'gunslinger'),
  icon('바드', 'bard'),
  icon('서머너', 'summoner'),
  icon('아르카나', 'arcana'),
  icon('소서리스', 'elementalmaster'),
  icon('블레이드', 'blade'),
  icon('데모닉', 'demonic'),
  icon('리퍼', 'reaper'),
  icon('소울이터', 'souleater'),
  icon('도화가', 'artist'),
  icon('기상술사', 'aeromancer'),
  icon('환수사', 'wildsoul'),
  icon('차원술사', 'dimension_master'),
  icon('가디언나이트', 'dragon_knight'),
] as const;

export const RAID_CLASS_ICON_BY_NAME: ReadonlyMap<string, RaidClassIconTemplate> = new Map(
  RAID_CLASS_ICON_TEMPLATES.map((template) => [template.className, template]),
);
