import { safeLocalStorage, safeSessionStorage } from './safeStorage';

const throwingStorage: Storage = {
  length: 0,
  clear: () => {
    throw new Error('storage unavailable');
  },
  getItem: () => {
    throw new Error('storage unavailable');
  },
  key: () => {
    throw new Error('storage unavailable');
  },
  removeItem: () => {
    throw new Error('storage unavailable');
  },
  setItem: () => {
    throw new Error('storage unavailable');
  },
};

describe('safeStorage', () => {
  it('wraps available localStorage and sessionStorage', () => {
    safeLocalStorage.setItem('safe-local', '1');
    safeSessionStorage.setItem('safe-session', '2');
    expect(safeLocalStorage.getItem('safe-local')).toBe('1');
    expect(safeSessionStorage.getItem('safe-session')).toBe('2');
    safeLocalStorage.removeItem('safe-local');
    safeSessionStorage.removeItem('safe-session');
    expect(safeLocalStorage.getItem('safe-local')).toBeNull();
    expect(safeSessionStorage.getItem('safe-session')).toBeNull();
  });

  it('returns null/no-op when browser storage throws', () => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: throwingStorage,
    });

    try {
      expect(safeLocalStorage.getItem('blocked')).toBeNull();
      expect(() => safeLocalStorage.setItem('blocked', '1')).not.toThrow();
      expect(() => safeLocalStorage.removeItem('blocked')).not.toThrow();
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });
});
