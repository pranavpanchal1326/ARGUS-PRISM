import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_CONFIG = {
  success: { icon: '✓', color: 'var(--success)', bg: 'var(--success-bg)', border: 'color-mix(in srgb, var(--success) 25%, transparent)' },
  error:   { icon: '!', color: 'var(--error)',   bg: 'rgba(207,52,33,0.08)', border: 'rgba(207,52,33,0.25)' },
  warning: { icon: '⚠', color: 'var(--warning)', bg: 'rgba(255,193,7,0.08)', border: 'rgba(255,193,7,0.25)' },
  info:    { icon: 'ℹ', color: 'var(--accent)',  bg: 'var(--accent-subtle)', border: 'var(--accent-border)' },
};

export default function Toast({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', top: '16px', right: '16px', zIndex: 10000,
      display: 'flex', flexDirection: 'column', gap: '8px',
      pointerEvents: 'none', maxWidth: '420px', width: '100%',
    }}>
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => {
          const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{
                pointerEvents: 'auto',
                background: 'var(--bg-surface)',
                border: `1px solid ${cfg.border}`,
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(12px)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: cfg.bg, border: `1.5px solid ${cfg.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: cfg.color, fontSize: '11px', fontWeight: 700 }}>{cfg.icon}</span>
              </div>
              <span style={{
                flex: 1, fontFamily: 'var(--font-ui)', fontSize: '13px',
                fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4,
              }}>
                {toast.message}
              </span>
              <button
                onClick={() => onDismiss(toast.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-tertiary)', fontSize: '14px', padding: '2px',
                  lineHeight: 1, flexShrink: 0,
                }}
              >
                ✕
              </button>
              {/* Auto-dismiss progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 4, ease: 'linear' }}
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '2px', background: cfg.color, transformOrigin: 'left',
                  opacity: 0.5,
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
