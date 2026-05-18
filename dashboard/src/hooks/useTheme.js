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
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('prism-theme');
    if (saved === 'light' || saved === 'dark') return saved;

    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current !== theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('prism-theme', theme);
  }, [theme]);

  /*
    Listen for system preference changes.
    If user has no saved preference, follow the system.
    If user has a saved preference, ignore system changes.
  */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      const saved = localStorage.getItem('prism-theme');
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggle   = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const setLight = () => setTheme('light');
  const setDark  = () => setTheme('dark');

  return { theme, toggle, setLight, setDark, isDark: theme === 'dark' };
}

/*
  Both import styles are supported:
    import { useTheme } from './hooks/useTheme'   (named — used by Phase 1C+ components)
    import useTheme from './hooks/useTheme'        (default — used by 2C App skeleton)
*/
export default useTheme;
