import type {
  SiblingCharacter,
  CharacterProfile,
  GameEvent,
  CalendarItem,
  ArkGridData,
  EquipmentItem,
  GemData,
  EngravingData,
  ArkPassiveData,
  CardData,
} from '../types/lostark';

const BASE_URL = '/api/lostark';

const headers: HeadersInit = {
  accept: 'application/json',
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      ...headers,
      ...(options?.body != null ? { 'content-type': 'application/json' } : {}),
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

// --- Character APIs ---
export const fetchSiblings = (nickname: string, options?: RequestInit): Promise<SiblingCharacter[] | null> =>
  apiFetch(`/characters/${encodeURIComponent(nickname)}/siblings`, options);

export const fetchProfile = (characterName: string, options?: RequestInit): Promise<CharacterProfile> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/profiles`, options);

export const fetchArkGrid = (characterName: string, options?: RequestInit): Promise<ArkGridData> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/arkgrid`, options);

export const fetchEquipment = (characterName: string, options?: RequestInit): Promise<EquipmentItem[]> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/equipment`, options);

export const fetchGems = (characterName: string, options?: RequestInit): Promise<GemData> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/gems`, options);

export const fetchEngravings = (characterName: string, options?: RequestInit): Promise<EngravingData> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/engravings`, options);

export const fetchArkPassive = (characterName: string, options?: RequestInit): Promise<ArkPassiveData> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/arkpassive`, options);

export const fetchCards = (characterName: string, options?: RequestInit): Promise<CardData> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/cards`, options);

// --- Public content APIs ---
export const fetchEvents = (): Promise<GameEvent[]> =>
  apiFetch('/news/events');

export const fetchCalendar = (): Promise<CalendarItem[]> =>
  apiFetch('/gamecontents/calendar');

// --- 거래소 API ---

export interface MarketCategory {
  Code: number;
  CodeName: string;
  Subs?: MarketCategory[];
}

export interface MarketOptionsResponse {
  Categories: MarketCategory[];
}

export const fetchMarketOptions = (): Promise<MarketOptionsResponse> =>
  apiFetch<MarketOptionsResponse>('/markets/options');

export interface MarketItem {
  Id: number;
  Name: string;
  Grade: string;
  Icon: string;
  BundleCount: number;
  TradeRemainCount: number | null;
  YDayAvgPrice: number;
  RecentPrice: number;
  CurrentMinPrice: number;
}

export interface MarketSearchResponse {
  PageNo: number;
  PageSize: number;
  TotalCount: number;
  Items: MarketItem[];
}

export const fetchMarketItems = (
  itemName: string,
  categoryCode: number,
  extraParams?: Record<string, unknown>,
): Promise<MarketSearchResponse> =>
  apiFetch<MarketSearchResponse>('/markets/items', {
    method: 'POST',
    body: JSON.stringify({
      Sort: 'CURRENT_MIN_PRICE',
      CategoryCode: categoryCode,
      ItemName: itemName,
      PageNo: 0,
      SortCondition: 'ASC',
      ...extraParams,
    }),
  });

export interface AuctionItemOption {
  Type: string;
  OptionName: string;
  OptionNameTripod: string;
  Value: number;
  IsPenalty: boolean;
  ClassName: string;
}

export interface AuctionItem {
  Name: string;
  Grade: string;
  Tier: number;
  Level: number | null;
  Icon: string;
  GradeQuality: number | null;
  AuctionInfo: {
    StartPrice: number;
    BuyPrice: number;
    BidPrice: number;
    EndDate: string;
    BidCount: number;
    BidStartPrice: number;
    IsCompetitive: boolean;
    TradeAllowCount: number;
  };
  Options: AuctionItemOption[];
}

export interface AuctionSearchResponse {
  PageNo: number;
  PageSize: number;
  TotalCount: number;
  Items: AuctionItem[];
}

export interface AuctionSearchParams {
  CategoryCode?: number;
  ItemName?: string;
  PageNo?: number;
  Sort?: string;
  SortCondition?: string;
  PageSize?: number;
  [key: string]: unknown;
}

export const fetchAuctionItems = (
  params: AuctionSearchParams = {},
): Promise<AuctionSearchResponse> =>
  apiFetch<AuctionSearchResponse>('/auctions/items', {
    method: 'POST',
    body: JSON.stringify({
      CategoryCode: 210000,
      PageNo: 0,
      Sort: 'BUY_PRICE',
      SortCondition: 'ASC',
      PageSize: 10,
      ...params,
    }),
  });

// --- Shared constants ---
export const LS_NICKNAME = 'loaGold_nickname';
