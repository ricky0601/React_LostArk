/** 원정대 캐릭터 (siblings API 응답) */
export interface SiblingCharacter {
  ServerName: string;
  CharacterName: string;
  CharacterLevel: number;
  CharacterClassName: string;
  ItemAvgLevel: string;
  ItemMaxLevel: string;
}

/** 캐릭터 프로필 (profiles API 응답) */
export interface CharacterProfile {
  CharacterImage: string;
  CharacterName: string;
  CharacterClassName: string;
  CharacterLevel: number;
  ItemAvgLevel: string;
  ItemMaxLevel: string;
  ServerName: string;
  Title: string | null;
  GuildName: string | null;
  ExpeditionLevel: number;
  PvpGradeName: string;
  TownLevel: number | null;
  TownName: string;
  UsingSkillPoint: number;
  TotalSkillPoint: number;
  Stats: Array<{ Type: string; Value: string; Tooltip: string[] }>;
  Tendencies: Array<{ Type: string; Point: number; MaxPoint: number }>;
  CombatPower: string | null;
}

/** GET /news/events 응답 아이템 */
export interface GameEvent {
  Title: string;
  Thumbnail: string;
  Link: string;
  StartDate: string;
  EndDate: string;
  RewardDate: string | null;
}

/** GET /gamecontents/calendar 응답 아이템 */
export interface CalendarItem {
  CategoryName: string;
  ContentsName: string;
  ContentsIcon: string;
  MinItemLevel: number;
  StartTimes: string[] | null;
  Location: string;
  RewardItems: CalendarRewardItem[];
}

export interface CalendarRewardItem {
  Name: string;
  Icon: string;
  Grade: string;
  StartTimes: string[] | null;
}

/** GET /armories/characters/{name}/arkgrid 응답 */
export interface ArkGridData {
  Slots: ArkGridSlot[] | null;
  Effects: ArkGridEffect[] | null;
}

export interface ArkGridSlot {
  Index: number;
  Icon: string;
  Name: string | null;
  Point: number;
  Grade: string;
  Tooltip: string;
  Gems: ArkGridGem[] | null;
}

export interface ArkGridGem {
  Index: number;
  Icon: string;
  IsActive: boolean;
  Grade: string;
  Tooltip: string;
}

export interface ArkGridEffect {
  Name: string;
  Level: number;
  Tooltip: string;
}

/** GET /armories/characters/{name}/equipment 응답 아이템 */
export interface EquipmentItem {
  Type: string;
  Name: string;
  Icon: string;
  Grade: string;
  Tooltip: string;
}

/** GET /armories/characters/{name}/avatars 응답 아이템 */
export interface AvatarItem {
  readonly Type: string;
  readonly Name: string;
  readonly Icon: string;
  readonly Grade: string;
  readonly IsSet: boolean;
  readonly IsInner: boolean;
  readonly Tooltip: string;
}

/** GET /armories/characters/{name}/gems 응답 */
export interface GemData {
  Gems: GemItem[] | null;
  Effects: GemEffects | null;
}

export interface GemItem {
  Slot: number;
  Name: string;
  Icon: string;
  Level: number;
  Grade: string;
  Tooltip: string;
}

export interface GemEffects {
  Description: string;
  Skills: GemSkillEffect[];
}

export interface GemSkillEffect {
  GemSlot: number;
  Name: string;
  Description: string[];
  Option: string;
  Icon: string;
  Tooltip: string;
}

/** GET /armories/characters/{name}/engravings 응답 */
export interface EngravingData {
  Engravings: EngravingItem[] | null;
  Effects: EngravingEffect[] | null;
  ArkPassiveEffects: ArkPassiveEffect[] | null;
}

export interface EngravingItem {
  Slot: number;
  Name: string;
  Icon: string;
  Tooltip: string;
}

export interface EngravingEffect {
  Name: string;
  Description: string;
}

export interface ArkPassiveEffect {
  AbilityStoneLevel: number | null;
  Grade: string;
  Level: number;
  Name: string;
  Description: string;
  Icon?: string;
}

/** GET /armories/characters/{name}/arkpassive 응답 — 직업 깨달음 포함 */
export interface ArkPassiveData {
  IsArkPassive: boolean;
  Title: string | null;
  Points: ArkPassivePoint[] | null;
  Effects: ArkPassiveDataEffect[] | null;
}

export interface ArkPassivePoint {
  Name: string;
  Value: number;
  Tooltip: string;
  /** 카르마 랭크/레벨. 예: '6랭크 26레벨' */
  Description?: string;
}

export interface ArkPassiveDataEffect {
  /** 진화/깨달음/도약 중 하나 */
  Name: string;
  /** 일부 이전 응답에만 제공되며, 현재 응답은 Description에 레벨을 포함한다. */
  Level?: number;
  /** 티어·노드 이름·레벨이 포함된 설명 */
  Description: string;
  ToolTip?: string;
  Icon?: string;
}

/** GET /armories/characters/{name}/cards 응답 */
export interface CardData {
  Cards: CardItem[] | null;
  Effects: CardSetEntry[] | null;
}

export interface CardItem {
  Slot: number;
  Name: string;
  Icon: string;
  AwakeCount: number;
  AwakeTotal: number;
  Grade: string;
  Tooltip: string;
}

export interface CardSetEntry {
  Index: number;
  CardEffects: CardSetEffect[];
  Items: CardSetItem[];
}

export interface CardSetEffect {
  Index: number;
  /** 예: '세상을 구하는 빛 6세트 (30각성합계)' */
  Name: string;
  Description: string;
}

export interface CardSetItem {
  Name: string;
  Icon: string;
}
