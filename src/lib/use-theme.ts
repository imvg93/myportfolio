'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try {
    window.localStorage.setItem('portfolio-theme', theme);
  } catch {
    // Keep the in-memory theme working if browser storage is unavailable.
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    let initialTheme: Theme = 'light';
    try {
      const savedTheme = window.localStorage.getItem('portfolio-theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        initialTheme = savedTheme;
      }
    } catch {
      // Use the default light mode when browser storage is unavailable.
    }
    applyTheme(initialTheme);
    setTheme(initialTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  return { theme, toggleTheme };
}
