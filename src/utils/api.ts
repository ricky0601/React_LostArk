import type { SiblingCharacter, CharacterProfile, GameEvent, CalendarItem, ArkGridData, EquipmentItem, GemData, EngravingData } from '../types/lostark';

const BASE_URL = 'https://developer-lostark.game.onstove.com';
const API_KEY = process.env.REACT_APP_API_KEY;

const headers: HeadersInit = {
  accept: 'application/json',
  authorization: `bearer ${API_KEY}`,
};

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

// --- Character APIs ---
export const fetchSiblings = (nickname: string): Promise<SiblingCharacter[] | null> =>
  apiFetch(`/characters/${encodeURIComponent(nickname)}/siblings`);

export const fetchProfile = (characterName: string): Promise<CharacterProfile> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/profiles`);

export const fetchArkGrid = (characterName: string): Promise<ArkGridData> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/arkgrid`);

export const fetchEquipment = (characterName: string): Promise<EquipmentItem[]> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/equipment`);

export const fetchGems = (characterName: string): Promise<GemData> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/gems`);

export const fetchEngravings = (characterName: string): Promise<EngravingData> =>
  apiFetch(`/armories/characters/${encodeURIComponent(characterName)}/engravings`);

// --- Public content APIs ---
export const fetchEvents = (): Promise<GameEvent[]> =>
  apiFetch('/news/events');

export const fetchCalendar = (): Promise<CalendarItem[]> =>
  apiFetch('/gamecontents/calendar');

// --- Shared constants ---
export const LS_NICKNAME = 'loaGold_nickname';
