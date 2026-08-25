import { safeLocalStorage } from '../../utils/safeStorage';

export const QUICK_MENU_ORDER_STORAGE_KEY = 'homeQuickMenuOrder';

export interface QuickMenuState {
  readonly order: string[];
  readonly visibleIds: string[];
}

const reconcileIds = (defaultIds: readonly string[], candidates: unknown): string[] => {
  const knownIds = new Set(defaultIds);
  const seenIds = new Set<string>();
  const reconciledIds: string[] = [];

  if (Array.isArray(candidates)) {
    candidates.forEach((id) => {
      if (typeof id === 'string' && knownIds.has(id) && !seenIds.has(id)) {
        seenIds.add(id);
        reconciledIds.push(id);
      }
    });
  }

  defaultIds.forEach((id) => {
    if (!seenIds.has(id)) reconciledIds.push(id);
  });

  return reconciledIds;
};

export const reconcileQuickMenuState = (
  defaultIds: readonly string[],
  defaultVisibleIds: readonly string[],
  storedValue: string | null,
): QuickMenuState => {
  let storedState: unknown;

  try {
    storedState = storedValue === null ? null : JSON.parse(storedValue);
  } catch {
    storedState = null;
  }

  if (Array.isArray(storedState)) {
    const order = reconcileIds(defaultIds, storedState);
    const storedVisibleIds = new Set(
      storedState.filter((id): id is string => typeof id === 'string' && defaultIds.includes(id)),
    );
    return { order, visibleIds: order.filter((id) => storedVisibleIds.has(id)) };
  }

  if (!storedState || typeof storedState !== 'object') {
    return {
      order: [...defaultIds],
      visibleIds: defaultIds.filter((id) => defaultVisibleIds.includes(id)),
    };
  }

  const candidate = storedState as { order?: unknown; visibleIds?: unknown };
  if (!Array.isArray(candidate.order) || !Array.isArray(candidate.visibleIds)) {
    return {
      order: [...defaultIds],
      visibleIds: defaultIds.filter((id) => defaultVisibleIds.includes(id)),
    };
  }

  const order = reconcileIds(defaultIds, candidate.order);
  const visibleSet = new Set(
    candidate.visibleIds.filter((id): id is string => typeof id === 'string' && defaultIds.includes(id)),
  );

  return { order, visibleIds: order.filter((id) => visibleSet.has(id)) };
};

export const readQuickMenuState = (
  defaultIds: readonly string[],
  defaultVisibleIds: readonly string[],
): QuickMenuState => reconcileQuickMenuState(
  defaultIds,
  defaultVisibleIds,
  safeLocalStorage.getItem(QUICK_MENU_ORDER_STORAGE_KEY),
);

export const saveQuickMenuState = (state: QuickMenuState): void => {
  safeLocalStorage.setItem(QUICK_MENU_ORDER_STORAGE_KEY, JSON.stringify(state));
};

export const resetQuickMenuState = (): void => {
  safeLocalStorage.removeItem(QUICK_MENU_ORDER_STORAGE_KEY);
};

export const reorderQuickMenuItem = (
  ids: readonly string[],
  movingId: string,
  targetId: string,
): string[] => {
  const fromIndex = ids.indexOf(movingId);
  const toIndex = ids.indexOf(targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [...ids];

  const reorderedIds = [...ids];
  const [movedId] = reorderedIds.splice(fromIndex, 1);
  reorderedIds.splice(toIndex, 0, movedId);
  return reorderedIds;
};
