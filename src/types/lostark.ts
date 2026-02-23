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
  Name: string;
  Point: number;
  Grade: string;
  Tooltip: string;
  Gems: ArkGridGem[];
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
}
