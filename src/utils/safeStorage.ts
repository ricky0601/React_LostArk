type StorageArea = 'local' | 'session';

const resolveStorage = (area: StorageArea): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

const createSafeStorage = (area: StorageArea) => ({
  getItem(key: string): string | null {
    const storage = resolveStorage(area);
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    const storage = resolveStorage(area);
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch {
      // ignore storage failures
    }
  },
  removeItem(key: string): void {
    const storage = resolveStorage(area);
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  },
});

export const safeLocalStorage = createSafeStorage('local');
export const safeSessionStorage = createSafeStorage('session');
