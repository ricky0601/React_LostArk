export type IsoTimestamp = string;
export type IsoDate = string;

export interface LokkiProfile {
  readonly user_id: string;
  readonly display_name: string | null;
  readonly avatar_url: string | null;
  readonly discord_id: string | null;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

export interface LokkiRoster {
  readonly id: string;
  readonly user_id: string;
  readonly representative_character_name: string | null;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

export interface LokkiCharacter {
  readonly id: string;
  readonly user_id: string;
  readonly roster_id: string;
  readonly character_name: string;
  readonly server_name: string | null;
  readonly character_class: string | null;
  readonly item_level: number | null;
  readonly is_main: boolean;
  readonly last_synced_at: IsoTimestamp | null;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

export interface LokkiWeeklyState {
  readonly id: string;
  readonly user_id: string;
  readonly character_id: string | null;
  readonly week_start: IsoDate;
  readonly activity_key: string;
  readonly completed_count: number;
  readonly target_count: number;
  readonly earned_gold: number;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

export interface CreateLokkiRoster {
  readonly user_id: string;
  readonly representative_character_name?: string | null;
}
export type UpdateLokkiRoster = Partial<Omit<CreateLokkiRoster, 'user_id'>>;

export interface CreateLokkiCharacter {
  readonly user_id: string;
  readonly roster_id: string;
  readonly character_name: string;
  readonly server_name?: string | null;
  readonly character_class?: string | null;
  readonly item_level?: number | null;
  readonly is_main?: boolean;
  readonly last_synced_at?: IsoTimestamp | null;
}
export type UpdateLokkiCharacter = Partial<Omit<CreateLokkiCharacter, 'user_id'>>;

export interface CreateLokkiWeeklyState {
  readonly user_id: string;
  readonly character_id?: string | null;
  readonly week_start: IsoDate;
  readonly activity_key: string;
  readonly completed_count?: number;
  readonly target_count?: number;
  readonly earned_gold?: number;
}
export type UpdateLokkiWeeklyState = Partial<Omit<CreateLokkiWeeklyState, 'user_id'>>;
