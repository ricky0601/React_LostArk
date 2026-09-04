import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SiblingCharacter } from '../../types/lostark';
import {
  fetchArkGrid,
  fetchArkPassive,
  fetchEngravings,
  fetchEquipment,
  fetchGems,
  fetchProfile,
} from '../../utils/api';
import {
  createCharacterState,
  type EndpointState,
  type ExpeditionCharacterState,
  type ExpeditionViewMode,
} from './expeditionModel';
import {
  loadExpeditionPreferences,
  saveExpeditionPreferences,
  type ExpeditionPreferences,
} from './expeditionPreferences';

const REQUEST_CONCURRENCY = 3;
type DataKey = 'profile' | 'equipment' | 'arkPassive' | 'arkGrid' | 'gems' | 'engravings';
type EndpointPayload = {
  [K in DataKey]: ExpeditionCharacterState[K] extends EndpointState<infer T> ? T : never;
};
type DashboardRow = Pick<ExpeditionCharacterState, 'sibling' | 'expanded'> & {
  [K in DataKey]: EndpointState<EndpointPayload[K]>;
};
type Rows = Record<string, DashboardRow>;

class RequestLimiter {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = (): void => {
        this.active += 1;
        task().then(resolve, reject).finally(() => {
          this.active -= 1;
          this.waiting.shift()?.();
        });
      };
      if (this.active < this.limit) start();
      else this.waiting.push(start);
    });
  }
}

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export interface ExpeditionDashboardState {
  readonly rows: Rows;
  readonly selectedNames: ReadonlySet<string>;
  readonly viewMode: ExpeditionViewMode;
  readonly collapsedServers: ReadonlySet<string>;
  readonly isRosterExpanded: boolean;
  readonly partialFailureCount: number;
  readonly toggleCharacter: (name: string) => void;
  readonly toggleServer: (server: string) => void;
  readonly toggleServerCollapsed: (server: string) => void;
  readonly toggleRosterExpanded: () => void;
  readonly setViewMode: (mode: ExpeditionViewMode) => void;
  readonly toggleExpanded: (name: string) => void;
  readonly retryCharacter: (name: string) => void;
}

export const useExpeditionDashboard = (
  nickname: string,
  siblings: readonly SiblingCharacter[],
): ExpeditionDashboardState => {
  const characterNames = useMemo(() => [...siblings]
    .sort((left, right) => Number(right.ItemAvgLevel.replace(/,/g, '')) - Number(left.ItemAvgLevel.replace(/,/g, '')))
    .map((sibling) => sibling.CharacterName), [siblings]);
  const [preferences, setPreferences] = useState<ExpeditionPreferences>(() =>
    loadExpeditionPreferences(nickname, characterNames));
  const [rows, setRows] = useState<Rows>(() => Object.fromEntries(
    siblings.map((sibling) => [sibling.CharacterName, createCharacterState(sibling)]),
  ));
  const rowsRef = useRef(rows);
  const controllerRef = useRef(new AbortController());
  const limiterRef = useRef(new RequestLimiter(REQUEST_CONCURRENCY));
  const loadingKeysRef = useRef(new Map<string, symbol>());
  const selectedNamesRef = useRef(new Set(preferences.selectedCharacters));

  const updateRows = useCallback((updater: (current: Rows) => Rows): void => {
    setRows((current) => {
      const next = updater(current);
      rowsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    selectedNamesRef.current = new Set(preferences.selectedCharacters);
    saveExpeditionPreferences(nickname, preferences);
  }, [nickname, preferences]);

  useEffect(() => {
    controllerRef.current = new AbortController();
    limiterRef.current = new RequestLimiter(REQUEST_CONCURRENCY);
    loadingKeysRef.current.clear();
    return () => controllerRef.current.abort();
  }, []);

  const updateEndpoint = useCallback(<K extends DataKey>(
    name: string,
    key: K,
    state: EndpointState<EndpointPayload[K]>,
  ): void => {
    updateRows((current) => {
      const row = current[name];
      if (!row) return current;
      return { ...current, [name]: { ...row, [key]: state } };
    });
  }, [updateRows]);

  const loadEndpoint = useCallback(<K extends DataKey>(
    name: string,
    key: K,
    request: (signal: AbortSignal) => Promise<EndpointPayload[K]>,
    force = false,
  ): Promise<void> => {
    const loadingKey = `${name}:${key}`;
    const current = rowsRef.current[name]?.[key] as EndpointState<EndpointPayload[K]> | undefined;
    if (loadingKeysRef.current.has(loadingKey) || (!force && (current?.status === 'success' || current?.status === 'error'))) {
      return Promise.resolve();
    }

    const requestToken = Symbol(loadingKey);
    loadingKeysRef.current.set(loadingKey, requestToken);
    updateEndpoint(name, key, { status: 'loading', data: current?.data ?? null });
    const signal = controllerRef.current.signal;

    return limiterRef.current.run(async () => {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return request(signal);
    }).then((data) => {
      if (!signal.aborted) updateEndpoint(name, key, { status: 'success', data });
    }).catch((error: unknown) => {
      if (!isAbortError(error) && !signal.aborted) {
        updateEndpoint(name, key, { status: 'error', data: null });
      }
    }).finally(() => {
      if (loadingKeysRef.current.get(loadingKey) === requestToken) {
        loadingKeysRef.current.delete(loadingKey);
      }
    });
  }, [updateEndpoint]);

  const loadSummary = useCallback((name: string, force = false): void => {
    void loadEndpoint(name, 'profile', (signal) => fetchProfile(name, { signal }), force).finally(() => {
      if (controllerRef.current.signal.aborted || !selectedNamesRef.current.has(name)) return;
      void loadEndpoint(name, 'equipment', (signal) => fetchEquipment(name, { signal }), force);
      void loadEndpoint(name, 'arkPassive', (signal) => fetchArkPassive(name, { signal }), force);
      void loadEndpoint(name, 'arkGrid', (signal) => fetchArkGrid(name, { signal }), force);
      void loadEndpoint(name, 'gems', (signal) => fetchGems(name, { signal }), force);
    });
  }, [loadEndpoint]);

  const loadDetails = useCallback((name: string, force = false): void => {
    void loadEndpoint(name, 'engravings', (signal) => fetchEngravings(name, { signal }), force);
  }, [loadEndpoint]);

  const selectedNames = useMemo(() => new Set(preferences.selectedCharacters), [preferences.selectedCharacters]);

  useEffect(() => {
    preferences.selectedCharacters.forEach((name) => loadSummary(name));
  }, [loadSummary, preferences.selectedCharacters]);

  const updatePreferences = useCallback((
    updater: (current: ExpeditionPreferences) => ExpeditionPreferences,
  ): void => setPreferences((current) => {
    const next = updater(current);
    selectedNamesRef.current = new Set(next.selectedCharacters);
    return next;
  }), []);

  const toggleCharacter = useCallback((name: string): void => {
    updatePreferences((current) => {
      const selected = new Set(current.selectedCharacters);
      if (selected.has(name)) selected.delete(name);
      else selected.add(name);
      return { ...current, selectedCharacters: Array.from(selected) };
    });
  }, [updatePreferences]);

  const toggleServer = useCallback((server: string): void => {
    const serverNames = siblings.filter((sibling) => sibling.ServerName === server).map((sibling) => sibling.CharacterName);
    updatePreferences((current) => {
      const selected = new Set(current.selectedCharacters);
      const allSelected = serverNames.every((name) => selected.has(name));
      serverNames.forEach((name) => allSelected ? selected.delete(name) : selected.add(name));
      return { ...current, selectedCharacters: Array.from(selected) };
    });
  }, [siblings, updatePreferences]);

  const toggleServerCollapsed = useCallback((server: string): void => {
    updatePreferences((current) => {
      const collapsed = new Set(current.collapsedServers);
      if (collapsed.has(server)) collapsed.delete(server);
      else collapsed.add(server);
      return { ...current, collapsedServers: Array.from(collapsed) };
    });
  }, [updatePreferences]);

  const toggleRosterExpanded = useCallback((): void => {
    updatePreferences((current) => ({ ...current, isRosterExpanded: !current.isRosterExpanded }));
  }, [updatePreferences]);

  const setViewMode = useCallback((viewMode: ExpeditionViewMode): void => {
    updatePreferences((current) => ({ ...current, viewMode }));
  }, [updatePreferences]);

  const toggleExpanded = useCallback((name: string): void => {
    const willExpand = !rowsRef.current[name]?.expanded;
    updateRows((current) => ({
      ...current,
      [name]: { ...current[name], expanded: !current[name].expanded },
    }));
    if (willExpand) loadDetails(name);
  }, [loadDetails, updateRows]);

  const retryCharacter = useCallback((name: string): void => {
    loadSummary(name, true);
    if (rowsRef.current[name]?.expanded) loadDetails(name, true);
  }, [loadDetails, loadSummary]);

  const partialFailureCount = useMemo(() => Object.values(rows)
    .filter((row) => selectedNames.has(row.sibling.CharacterName))
    .filter((row) => [
      row.profile, row.equipment, row.arkPassive, row.arkGrid, row.gems, row.engravings,
    ].some((state) => state.status === 'error')).length, [rows, selectedNames]);

  return {
    rows,
    selectedNames,
    viewMode: preferences.viewMode,
    collapsedServers: new Set(preferences.collapsedServers),
    isRosterExpanded: preferences.isRosterExpanded,
    partialFailureCount,
    toggleCharacter,
    toggleServer,
    toggleServerCollapsed,
    toggleRosterExpanded,
    setViewMode,
    toggleExpanded,
    retryCharacter,
  };
};
