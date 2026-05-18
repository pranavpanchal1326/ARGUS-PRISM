import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RecruiterClassBadge } from './RecruiterClassBadge';

export function FreezeConfirmModal({ recruiter, isFreezing, onConfirm, onDismiss }) {
  if (!recruiter) return null;
  const count = recruiter.downtreamCount;
  const lakhs = `₹${(recruiter.totalAmountTransacted / 100000).toFixed(2)}L`;

  return (
    <AnimatePresence>
      {recruiter && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(26, 20, 16, 0.5)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Modal box */}
          <motion.div
            key="modal"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{    scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 201,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: 'calc(100% - 48px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <RecruiterClassBadge classification={recruiter.classification} size="lg" />
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  Confirm Action
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '15px', color: 'var(--text-primary)',
                margin: 0, lineHeight: 1.5 }}>
                This will freeze all <strong>{count}</strong> accounts connected to{' '}
                <strong>{recruiter.holderName}</strong> simultaneously.
              </p>
            </div>

            {/* Summary row */}
            <div style={{ display: 'flex', gap: '0', borderRadius: '8px',
              border: '1px solid var(--border-default)', overflow: 'hidden' }}>
              {[
                { top: String(count), bottom: 'accounts will be frozen' },
                { top: lakhs,         bottom: 'total transacted' },
              ].map((item, i) => (
                <div key={i} style={{
                  flex: 1, padding: '12px 16px', textAlign: 'center',
                  borderRight: i === 0 ? '1px solid var(--border-default)' : 'none',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 500,
                    color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{item.top}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px',
                    color: 'var(--text-tertiary)', marginTop: '4px' }}>{item.bottom}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button disabled={isFreezing} onClick={onDismiss}
                style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500,
                  color: 'var(--text-secondary)', background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)', borderRadius: '8px',
                  padding: '9px 20px', cursor: isFreezing ? 'not-allowed' : 'pointer',
                  opacity: isFreezing ? 0.5 : 1 }}>
                Cancel
              </button>
              <button disabled={isFreezing} onClick={onConfirm}
                style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600,
                  color: 'var(--bg-base)', background: 'var(--accent)',
                  border: 'none', borderRadius: '8px',
                  padding: '9px 20px', cursor: isFreezing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  opacity: isFreezing ? 0.7 : 1, transition: 'background 0.15s ease' }}>
                {isFreezing
                  ? <><span style={{ display: 'inline-block', animation: 'spin 0.7s linear infinite' }}>⟳</span> Freezing...</>
                  : `Freeze ${count} Accounts`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
