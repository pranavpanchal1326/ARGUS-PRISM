import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SunIcon — radial burst with centre circle and 8 ray lines.
 *
 * All elements are stroke-based (no fill) so currentColor
 * works correctly across all background surfaces.
 * Rays are computed mathematically at 45° intervals.
 */
function SunIcon() {
  const cx = 9, cy = 9;
  const innerR = 6.5;  /* inner ray start radius */
  const outerR = 8.5;  /* outer ray end radius   */

  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 * Math.PI) / 180;
    const x1 = cx + innerR * Math.cos(angle);
    const y1 = cy + innerR * Math.sin(angle);
    const x2 = cx + outerR * Math.cos(angle);
    const y2 = cy + outerR * Math.sin(angle);
    return (
      <line
        key={i}
        x1={x1} y1={y1}
        x2={x2} y2={y2}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" />
      {rays}
    </svg>
  );
}

/**
 * MoonIcon — crescent via two-arc path.
 *
 * Path traces the outer edge of a full moon, then cuts back
 * across with a smaller arc — the overlap creates the crescent.
 * No clipPath needed: the SVG path describes the shape directly.
 */
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        /*
          M 14.5 10   — start at the crescent's right horn
          A 7 7 0 1 1 8 2.5   — outer arc: full moon curve (7px radius)
          A 5.5 5.5 0 0 0 14.5 10 — inner arc: shadow circle (5.5px radius)
          Z — close path
          The gap between the two arcs is the visible crescent.
        */
        d="M14.5 10A7 7 0 1 1 8 2.5A5.5 5.5 0 0 0 14.5 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * ThemeToggle — animated light/dark mode switcher.
 *
 * The icon swap uses AnimatePresence with rotate + opacity.
 * The key prop changes between 'sun' and 'moon' on toggle —
 * this is what triggers AnimatePresence exit/enter.
 * Without different keys, AnimatePresence cannot detect the change.
 *
 * @example
 *   const { theme, toggle } = useTheme();
 *   <ThemeToggle theme={theme} toggle={toggle} />
 */
export function ThemeToggle({ theme, toggle, className = '' }) {
  const isDark = theme === 'dark';

  const buttonStyle = {
    background:      'transparent',
    border:          'none',
    cursor:          'pointer',
    padding:         '8px',
    borderRadius:    'var(--radius-md)',
    color:           'var(--text-secondary)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    transition:      'background 0.15s ease, color 0.15s ease',
    position:        'relative',
    width:           '36px',
    height:          '36px',
    overflow:        'hidden',
  };

  const iconVariants = {
    initial:  { rotate: -90, opacity: 0 },
    animate:  { rotate: 0,   opacity: 1 },
    exit:     { rotate:  90, opacity: 0 },
  };

  const iconTransition = { duration: 0.2, ease: 'easeOut' };

  return (
    <button
      className={`theme-toggle ${className}`.trim()}
      style={buttonStyle}
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-subtle)';
        e.currentTarget.style.color      = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color      = 'var(--text-secondary)';
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          /*
            key="moon" — AnimatePresence sees 'sun' exit and 'moon' enter.
            The rotate animation gives the icon a rotating-into-place feel,
            like a dial being turned to select the mode.
          */
          <motion.span
            key="moon"
            style={{ display: 'flex', position: 'absolute' }}
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={iconTransition}
          >
            <MoonIcon />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            style={{ display: 'flex', position: 'absolute' }}
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={iconTransition}
          >
            <SunIcon />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

ThemeToggle.propTypes = {
  /** Current theme value: 'light' or 'dark' */
  theme:     PropTypes.oneOf(['light', 'dark']).isRequired,
  /** Toggle function — switches between light and dark */
  toggle:    PropTypes.func.isRequired,
  /** Additional CSS classes */
  className: PropTypes.string,
};
