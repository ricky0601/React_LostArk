import React, { createContext, useContext, useEffect, useState } from 'react';
import { safeLocalStorage } from '../utils/safeStorage';

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = safeLocalStorage.getItem('isDarkMode');
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    safeLocalStorage.setItem('isDarkMode', String(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = (): void => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
