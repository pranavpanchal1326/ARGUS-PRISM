import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';

/* Backward compat: derive label from threshold number if explicit label not given */
const THRESHOLD_LABELS = {
  75: 'KYC RE-VERIFICATION — RBI KYC MD S.38',
  85: 'AUTOSTR INITIATED — PMLA S.12 + SC WRIT 03/2025',
};

function ThresholdStamp({
  triggered,
  threshold,
  label,
  sublabel,
  position  = 'bottom',
  className = '',
}) {
  const resolvedLabel = label ?? THRESHOLD_LABELS[threshold] ?? '';

  if (!resolvedLabel && !triggered) return null;

  return (
    <AnimatePresence>
      {triggered && (
        <motion.div
          key="stamp"
          className={`threshold-stamp ${className}`.trim()}
          style={{
            position:       'relative',
            display:        'inline-flex',
            flexDirection:  position === 'top' ? 'column-reverse' : 'column',
            alignItems:     'flex-start',
            pointerEvents:  'none',
          }}
        >
          {/* Stamp line + pulse ring row */}
          <div style={{ position: 'relative', width: '100%', height: '1px', display: 'flex', alignItems: 'center' }}>
            {/* Expanding line — scaleX 0→1, transforms from left */}
            <motion.div
              style={{
                height:          '1px',
                background:      'var(--accent)',
                width:           '100%',
                transformOrigin: 'left center',
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            />
            {/* Pulse ring — radiates outward from left end, plays once */}
            <motion.div
              style={{
                position:     'absolute',
                left:         0,
                top:          '50%',
                translateY:   '-50%',
                width:        '10px',
                height:       '10px',
                borderRadius: '50%',
                background:   'var(--accent)',
              }}
              initial={{ scale: 0.5, opacity: 0.9 }}
              animate={{ scale: 3.0, opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>

          {/* Label — appears after line finishes (delay 0.3s) */}
          {resolvedLabel && (
            <motion.div
              style={{ marginTop: position === 'bottom' ? '4px' : 0, marginBottom: position === 'top' ? '4px' : 0 }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.2 }}
            >
              <span
                style={{
                  display:       'inline-block',
                  fontFamily:    'var(--font-ui)',
                  fontSize:      '10px',
                  fontWeight:    600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color:         'var(--accent)',
                  background:    'var(--accent-subtle)',
                  border:        '1px solid var(--accent-border)',
                  padding:       '2px 8px',
                  borderRadius:  'var(--radius-sm)',
                }}
              >
                {resolvedLabel}
              </span>
              {sublabel && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   '9px',
                    color:      'var(--text-tertiary)',
                    marginTop:  '2px',
                  }}
                >
                  {sublabel}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

ThresholdStamp.propTypes = {
  triggered:  PropTypes.bool.isRequired,
  threshold:  PropTypes.oneOf([75, 85]),
  label:      PropTypes.string,
  sublabel:   PropTypes.string,
  position:   PropTypes.oneOf(['top', 'bottom']),
  className:  PropTypes.string,
};

export default ThresholdStamp;
