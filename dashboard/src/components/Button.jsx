import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { springSnappy } from '../design/motion';

const VARIANT_STYLES = {
  primary: {
    background:    'var(--accent)',
    color:         'var(--text-inverse)',
    border:        '1px solid transparent',
    '--hover-bg':  'var(--accent-hover)',
    '--hover-col': 'var(--text-inverse)',
  },
  secondary: {
    background:    'transparent',
    color:         'var(--text-primary)',
    border:        '1px solid var(--border-strong)',
    '--hover-bg':  'var(--bg-subtle)',
    '--hover-col': 'var(--text-primary)',
  },
  ghost: {
    background:    'transparent',
    color:         'var(--text-secondary)',
    border:        '1px solid transparent',
    '--hover-bg':  'var(--bg-subtle)',
    '--hover-col': 'var(--text-primary)',
  },
  danger: {
    background:    'transparent',
    color:         'var(--danger)',
    border:        '1px solid var(--accent-border)',
    '--hover-bg':  'var(--danger-bg)',
    '--hover-col': 'var(--danger)',
  },
};

const SIZE_STYLES = {
  sm: { padding: '6px 14px',  fontSize: '12px' },
  md: { padding: '10px 22px', fontSize: '13px' },
  lg: { padding: '14px 28px', fontSize: '14px' },
};

export function Button({
  children,
  variant    = 'primary',
  size       = 'md',
  loading    = false,
  disabled   = false,
  fullWidth  = false,
  leftIcon,
  rightIcon,
  onClick,
  type       = 'button',
  className  = '',
  ...rest
}) {
  const isDisabled = disabled || loading;
  const vs = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary;
  const ss = SIZE_STYLES[size]       ?? SIZE_STYLES.md;

  const baseStyle = {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: fullWidth ? 'center' : undefined,
    gap:            '8px',
    borderRadius:   'var(--radius-md)',
    fontFamily:     'var(--font-ui)',
    fontWeight:     600,
    lineHeight:     1,
    whiteSpace:     'nowrap',
    userSelect:     'none',
    cursor:         isDisabled ? 'not-allowed' : 'pointer',
    opacity:        isDisabled ? 0.4 : 1,
    pointerEvents:  isDisabled ? 'none' : 'auto',
    width:          fullWidth ? '100%' : 'auto',
    transition:     'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
    ...Object.fromEntries(Object.entries(vs).filter(([k]) => !k.startsWith('--'))),
    ...ss,
  };

  return (
    <motion.button
      className={`prism-btn prism-btn--${variant} prism-btn--${size} ${className}`.trim()}
      style={baseStyle}
      type={type}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      {...(!isDisabled ? {
        whileHover: { scale: 1.01 },
        whileTap:   { scale: 0.97 },
        transition: springSnappy,
      } : {})}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = vs['--hover-bg'];
          e.currentTarget.style.color      = vs['--hover-col'];
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = vs.background;
          e.currentTarget.style.color      = vs.color;
        }
      }}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {leftIcon && (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span>{loading ? 'Processing…' : children}</span>
      {rightIcon && (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </motion.button>
  );
}

Button.propTypes = {
  children:  PropTypes.node.isRequired,
  variant:   PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger']),
  size:      PropTypes.oneOf(['sm', 'md', 'lg']),
  loading:   PropTypes.bool,
  disabled:  PropTypes.bool,
  fullWidth: PropTypes.bool,
  leftIcon:  PropTypes.node,
  rightIcon: PropTypes.node,
  onClick:   PropTypes.func,
  type:      PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
};

export default Button;
