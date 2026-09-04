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
  MAX_SELECTION_LIMIT,
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
// 'skipped'는 중복 요청 단축·취소를 뜻하며, 후속 요청 발사 여부 판단에 쓰인다.
type EndpointOutcome = 'success' | 'error' | 'skipped';

class RequestLimiter {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = (): void => {
        this.active += 1;
        let taskPromise: Promise<T>;
        try {
          taskPromise = task();
        } catch (error) {
          this.active -= 1;
          this.waiting.shift()?.();
          reject(error);
          return;
        }
        taskPromise.then(resolve, reject).finally(() => {
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
  const controllerRef = useRef<AbortController | null>(null);
  const limiterRef = useRef(new RequestLimiter(REQUEST_CONCURRENCY));
  const getController = useCallback((): AbortController => {
    if (!controllerRef.current) controllerRef.current = new AbortController();
    return controllerRef.current;
  }, []);
  const loadingKeysRef = useRef(new Map<string, symbol>());
  const selectedNamesRef = useRef(new Set(preferences.selectedCharacters));
  const prevSelectedRef = useRef(new Set<string>());
  // 새로 선택된 이름만 로드하기 위한 이전 선택 집합. 마운트(controller 재설정) 시 비운다.

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
    prevSelectedRef.current = new Set();
    return () => controllerRef.current?.abort();
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
  ): Promise<EndpointOutcome> => {
    const loadingKey = `${name}:${key}`;
    const current = rowsRef.current[name]?.[key] as EndpointState<EndpointPayload[K]> | undefined;
    if (loadingKeysRef.current.has(loadingKey)) return Promise.resolve('skipped');
    if (!force && current && (current.status === 'success' || current.status === 'error')) {
      return Promise.resolve(current.status);
    }

    const requestToken = Symbol(loadingKey);
    loadingKeysRef.current.set(loadingKey, requestToken);
    updateEndpoint(name, key, { status: 'loading', data: current?.data ?? null });
    const signal = getController().signal;

    return limiterRef.current.run(async () => {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return request(signal);
    }).then((data): EndpointOutcome => {
      if (signal.aborted) return 'skipped';
      updateEndpoint(name, key, { status: 'success', data });
      return 'success';
    }).catch((error: unknown): EndpointOutcome => {
      if (isAbortError(error) || signal.aborted) return 'skipped';
      updateEndpoint(name, key, { status: 'error', data: null });
      return 'error';
    }).finally(() => {
      if (loadingKeysRef.current.get(loadingKey) === requestToken) {
        loadingKeysRef.current.delete(loadingKey);
      }
    });
  }, [getController, updateEndpoint]);

  const loadSummary = useCallback((name: string, force = false): void => {
    void loadEndpoint(name, 'profile', (signal) => fetchProfile(name, { signal }), force).then((outcome) => {
      // profile 실패(429/5xx) 시 하위 4개까지 발사하면 레이트리밋 상황에서 요청량이 5배로 증폭된다.
      if (outcome === 'error') {
        // 종속 요청을 발사하지 않으므로 idle로 남지 않게 명시적 종결 상태로 전이한다.
        // abort/중복에 해당하는 skipped는 제외하고, 이미 확보한 성공 데이터는 덮지 않는다.
        (['equipment', 'arkPassive', 'arkGrid', 'gems'] as const).forEach((key) => {
          if (rowsRef.current[name]?.[key]?.status === 'idle') {
            updateEndpoint(name, key, { status: 'error', data: null });
          }
        });
        return;
      }
      if (outcome !== 'success') return;
      if (getController().signal.aborted || !selectedNamesRef.current.has(name)) return;
      void loadEndpoint(name, 'equipment', (signal) => fetchEquipment(name, { signal }), force);
      void loadEndpoint(name, 'arkPassive', (signal) => fetchArkPassive(name, { signal }), force);
      void loadEndpoint(name, 'arkGrid', (signal) => fetchArkGrid(name, { signal }), force);
      void loadEndpoint(name, 'gems', (signal) => fetchGems(name, { signal }), force);
    });
  }, [getController, loadEndpoint, updateEndpoint]);

  const loadDetails = useCallback((name: string, force = false): void => {
    void loadEndpoint(name, 'engravings', (signal) => fetchEngravings(name, { signal }), force);
  }, [loadEndpoint]);

  // siblings가 마운트 이후에 바뀌어도(닉네임은 같고 목록만 갱신) 행이 누락되지 않게 병합한다.
  // 현재는 Expedition이 로딩 게이트 + key 리마운트로 커버하지만, 이 effect가 암묵 계약을 명시적으로 만든다.
  useEffect(() => {
    const current = rowsRef.current;
    const added = siblings.filter((sibling) => current[sibling.CharacterName] === undefined);
    const stale = siblings.filter((sibling) => {
      const row = current[sibling.CharacterName];
      return row !== undefined && (
        row.sibling.ServerName !== sibling.ServerName
        || row.sibling.CharacterLevel !== sibling.CharacterLevel
        || row.sibling.CharacterClassName !== sibling.CharacterClassName
        || row.sibling.ItemAvgLevel !== sibling.ItemAvgLevel
        || row.sibling.ItemMaxLevel !== sibling.ItemMaxLevel
      );
    });
    if (added.length === 0 && stale.length === 0) return;
    const next: Rows = { ...current };
    added.forEach((sibling) => { next[sibling.CharacterName] = createCharacterState(sibling); });
    stale.forEach((sibling) => {
      const row = next[sibling.CharacterName];
      if (row) next[sibling.CharacterName] = { ...row, sibling };
    });
    rowsRef.current = next;
    setRows(next);
    added.forEach((sibling) => {
      if (selectedNamesRef.current.has(sibling.CharacterName)) loadSummary(sibling.CharacterName);
    });
  }, [siblings, loadSummary]);

  const selectedNames = useMemo(() => new Set(preferences.selectedCharacters), [preferences.selectedCharacters]);

  const isRowErrored = useCallback((name: string): boolean => {
    const row = rowsRef.current[name];
    return row !== undefined && [
      row.profile, row.equipment, row.arkPassive, row.arkGrid, row.gems,
    ].some((state) => state.status === 'error');
  }, []);

  // 새로 선택된 이름만 로드한다. 에러 행을 해제 후 다시 선택하면 force로 재시도한다.
  // rows 변경으로는 재발사하지 않는다(에러 갱신이 rows를 바꿔 무한 재시도 루프가 되기 때문).
  useEffect(() => {
    const previous = prevSelectedRef.current;
    const current = new Set(preferences.selectedCharacters);
    current.forEach((name) => {
      if (!previous.has(name)) loadSummary(name, isRowErrored(name));
    });
    prevSelectedRef.current = current;
  }, [loadSummary, isRowErrored, preferences.selectedCharacters]);

  const updatePreferences = useCallback((
    updater: (current: ExpeditionPreferences) => ExpeditionPreferences,
  ): void => setPreferences((current) => {
    const next = updater(current);
    selectedNamesRef.current = new Set(next.selectedCharacters);
    return next;
  }), []);

  const toggleCharacter = useCallback((name: string): void => {
    // 상한 초과 시 추가를 무시한다. toggleServer의 남은 슬롯 방식과 대칭된다.
    if (!selectedNamesRef.current.has(name) && selectedNamesRef.current.size >= MAX_SELECTION_LIMIT) return;
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
      if (allSelected) {
        serverNames.forEach((name) => selected.delete(name));
        return { ...current, selectedCharacters: Array.from(selected) };
      }
      // 상한 초과 시 이미 선택된 캐릭터를 밀어내지 않고 남은 슬롯만 채운다.
      // serverNames는 아이템 레벨 내림차순이라 잘려도 상위 캐릭터가 먼저 들어간다.
      const availableSlots = MAX_SELECTION_LIMIT - selected.size;
      serverNames.filter((name) => !selected.has(name)).slice(0, availableSlots).forEach((name) => selected.add(name));
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
