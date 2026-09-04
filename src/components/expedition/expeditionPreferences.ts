import { safeLocalStorage } from '../../utils/safeStorage';
import type { ExpeditionViewMode } from './expeditionModel';

export interface ExpeditionPreferences {
  readonly viewMode: ExpeditionViewMode;
  readonly selectedCharacters: readonly string[];
  readonly knownCharacters: readonly string[];
  readonly collapsedServers: readonly string[];
  readonly isRosterExpanded: boolean;
}

const STORAGE_PREFIX = 'loaExpeditionDashboard:v1:';
const DEFAULT_SELECTION_LIMIT = 6;
// 캐릭터 1명당 profile + equipment + arkPassive + arkGrid + gems = 5요청이 나간다.
// 공유 API 키를 쓰므로 한 사용자의 전체 선택이 다른 사용자까지 429로 밀어낼 수 있다.
export const MAX_SELECTION_LIMIT = 12;
const VIEW_MODES: readonly ExpeditionViewMode[] = ['card', 'grid', 'table'];

const storageKey = (nickname: string): string => `${STORAGE_PREFIX}${nickname.trim().toLocaleLowerCase()}`;

export const loadExpeditionPreferences = (
  nickname: string,
  characterNames: readonly string[],
): ExpeditionPreferences => {
  const defaults: ExpeditionPreferences = {
    viewMode: 'card',
    selectedCharacters: characterNames.slice(0, DEFAULT_SELECTION_LIMIT),
    knownCharacters: characterNames,
    collapsedServers: [],
    isRosterExpanded: true,
  };
  const raw = safeLocalStorage.getItem(storageKey(nickname));
  if (!raw) return defaults;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;
    const value = parsed as Partial<ExpeditionPreferences>;
    const savedNames = Array.isArray(value.selectedCharacters)
      ? value.selectedCharacters.filter((name): name is string => typeof name === 'string')
      : defaults.selectedCharacters;
    const knownNames = Array.isArray(value.knownCharacters)
      ? value.knownCharacters.filter((name): name is string => typeof name === 'string')
      : savedNames;
    const currentNameSet = new Set(characterNames);
    const savedCurrentNames = savedNames.filter((name) => currentNameSet.has(name));
    const availableSelectionSlots = Math.max(0, DEFAULT_SELECTION_LIMIT - savedCurrentNames.length);
    const newlyFoundNames = characterNames
      .filter((name) => !knownNames.includes(name))
      .slice(0, availableSelectionSlots);
    return {
      viewMode: VIEW_MODES.includes(value.viewMode as ExpeditionViewMode)
        ? value.viewMode as ExpeditionViewMode
        : defaults.viewMode,
      selectedCharacters: [...savedCurrentNames, ...newlyFoundNames],
      knownCharacters: characterNames,
      collapsedServers: Array.isArray(value.collapsedServers)
        ? value.collapsedServers.filter((server): server is string => typeof server === 'string')
        : [],
      isRosterExpanded: typeof value.isRosterExpanded === 'boolean'
        ? value.isRosterExpanded
        : defaults.isRosterExpanded,
    };
  } catch {
    return defaults;
  }
};

export const saveExpeditionPreferences = (nickname: string, preferences: ExpeditionPreferences): void => {
  safeLocalStorage.setItem(storageKey(nickname), JSON.stringify(preferences));
};
