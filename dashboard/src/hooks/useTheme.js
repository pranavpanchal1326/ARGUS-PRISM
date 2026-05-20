import { useState, useEffect } from 'react';

/**
 * useTheme — PRISM theme management hook.
 *
 * Priority order for initial theme:
 *   1. User's saved preference in localStorage ('prism-theme')
 *   2. System preference via prefers-color-scheme
 *   3. Default: 'light'
 *
 * Side effects:
 *   - Sets data-theme on documentElement (html) as fallback selector
 *   - Persists preference to localStorage on every change
 *   - Tracks live system preference changes when no preference saved
 */
let globalTheme = (() => {
  const saved = localStorage.getItem('prism-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
})();

const listeners = new Set();

function setGlobalTheme(newTheme) {
  globalTheme = newTheme;
  localStorage.setItem('prism-theme', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
  listeners.forEach(l => l(newTheme));
}

export function useTheme() {
  const [theme, setTheme] = useState(globalTheme);

  useEffect(() => {
    listeners.add(setTheme);
    return () => {
      listeners.delete(setTheme);
    };
  }, []);

  // Sync with system preferences if no saved preference exists
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      const saved = localStorage.getItem('prism-theme');
      if (!saved) {
        setGlobalTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggle   = () => setGlobalTheme(globalTheme === 'light' ? 'dark' : 'light');
  const setLight = () => setGlobalTheme('light');
  const setDark  = () => setGlobalTheme('dark');

  return { theme, toggle, setLight, setDark, isDark: theme === 'dark' };
}

/*
  Both import styles are supported:
    import { useTheme } from './hooks/useTheme'   (named — used by Phase 1C+ components)
    import useTheme from './hooks/useTheme'        (default — used by 2C App skeleton)
*/
export default useTheme;
