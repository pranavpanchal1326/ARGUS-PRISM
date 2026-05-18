import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { slideUpDelayed } from '../design/motion';

/**
 * NOTIFICATION_CONFIG — defined outside the component (constant, not state).
 *
 * Placing this outside prevents object recreation on every render.
 * config object is referenced by type key — O(1) lookup.
 */
const NOTIFICATION_CONFIG = {
  KYC_TRIGGERED: {
    icon:        '📋',
    title:       'KYC Re-verification Triggered',
    subtitle:    'RBI KYC Master Direction 2016 — Section 38',
    description: 'Account operations monitoring enhanced. ' +
                 'Video KYC notification sent to customer.',
    colourVar:   '--warning',
  },
  RESTRICTION_APPLIED: {
    icon:        '🔒',
    title:       'Outbound UPI Restricted',
    subtitle:    'RBI KYC Master Direction 2016 — Section 38',
    description: 'Outbound transfers suspended pending KYC ' +
                 're-verification. No court order required.',
    colourVar:   '--heat-3',
  },
  AUTOSTR_INITIATED: {
    icon:        '⚡',
    title:       'AutoSTR + CBI Package Initiated',
    subtitle:    'PMLA Section 12 + Supreme Court Writ 03/2025',
    description: 'FIU-IND XML generating. CBI Evidence Package ' +
                 'building. MLRO review required within 24 hours.',
    colourVar:   '--accent',
  },
};

/**
 * LegalActionNotification — threshold-crossing legal action card.
 *
 * Displays when WarmthScore crosses a regulatory threshold.
 * Each notification cites the exact law, section, and action taken.
 * Multiple notifications stack vertically using slideUpDelayed(index).
 *
 * Colour coding:
 *   KYC_TRIGGERED       → amber warning (monitoring enhanced)
 *   RESTRICTION_APPLIED → deep orange (account restricted)
 *   AUTOSTR_INITIATED   → vermilion accent (STR filing initiated)
 *
 * Parent wraps in AnimatePresence for exit animation.
 *
 * @example
 *   <AnimatePresence>
 *     {score >= 60 && (
 *       <LegalActionNotification type="KYC_TRIGGERED" timestamp="14:32" index={0} />
 *     )}
 *     {score >= 75 && (
 *       <LegalActionNotification type="RESTRICTION_APPLIED" timestamp="14:47" index={1} />
 *     )}
 *     {score >= 85 && (
 *       <LegalActionNotification type="AUTOSTR_INITIATED" timestamp="15:02" index={2} />
 *     )}
 *   </AnimatePresence>
 */
export function LegalActionNotification({
  type,
  timestamp,
  index     = 0,
  className = '',
}) {
  const config = NOTIFICATION_CONFIG[type];

  if (!config) {
    console.warn(
      `LegalActionNotification: unknown type "${type}". ` +
      `Valid: KYC_TRIGGERED, RESTRICTION_APPLIED, AUTOSTR_INITIATED`
    );
    return null;
  }

  const colour = `var(${config.colourVar})`;

  const containerStyle = {
    display:       'flex',
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           'var(--space-3)',
    padding:       'var(--space-4)',
    /*
      8% colour tint background — noticeable but not overwhelming.
      color-mix works across both light and dark mode automatically.
    */
    background:    `color-mix(in srgb, ${colour} 8%, var(--bg-surface))`,
    borderLeft:    `3px solid ${colour}`,
    /*
      Left-radius: 0 — flush with pin stripe / left edge.
      Right-radius: radius-lg — rounded right corners only.
      Matches the ThresholdStamp aesthetic: stamped, not floated.
    */
    borderRadius:  '0 var(--radius-lg) var(--radius-lg) 0',
    position:      'relative',
  };

  const contentStyle = {
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
    flex:          1,
    minWidth:      0,
  };

  return (
    <motion.div
      className={`legal-notification legal-notification--${
        type.toLowerCase().replace(/_/g, '-')
      } ${className}`.trim()}
      style={containerStyle}
      role="alert"
      aria-live="assertive"
      aria-label={`Legal action: ${config.title}`}
      /*
        slideUpDelayed(index) from motion.js:
          initial: { opacity: 0, y: 16 }
          animate: { opacity: 1, y: 0 }
          exit:    { opacity: 0, y: -8 }
          delay:   index * 0.06
        Stacks notifications with a natural cascade.
      */
      {...slideUpDelayed(index)}
    >
      {/* Type icon */}
      <span
        style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}
        aria-hidden="true"
      >
        {config.icon}
      </span>

      {/* Content */}
      <div style={contentStyle}>
        {/* Legal basis — shown first (smaller, coloured) */}
        <span
          className="type-label-sm"
          style={{ color: colour }}
        >
          {config.subtitle}
        </span>

        {/* Action title */}
        <span
          className="type-heading-md"
          style={{ color: 'var(--text-primary)' }}
        >
          {config.title}
        </span>

        {/* Description */}
        <span
          className="type-body-md"
          style={{
            color:     'var(--text-secondary)',
            marginTop: 'var(--space-1)',
          }}
        >
          {config.description}
        </span>
      </div>

      {/* Timestamp — top right, renders only when provided */}
      {timestamp ? (
        <span
          className="type-mono-xs"
          style={{
            color:      'var(--text-tertiary)',
            flexShrink: 0,
            alignSelf:  'flex-start',
          }}
        >
          {timestamp}
        </span>
      ) : null}
    </motion.div>
  );
}

LegalActionNotification.propTypes = {
  /** Notification type key — determines icon, title, and legal citation */
  type:      PropTypes.oneOf([
               'KYC_TRIGGERED',
               'RESTRICTION_APPLIED',
               'AUTOSTR_INITIATED',
             ]).isRequired,
  /** Pre-formatted timestamp string e.g. "14:32" */
  timestamp: PropTypes.string,
  /** Stagger index for cascaded entry animation */
  index:     PropTypes.number,
  /** Additional CSS classes for layout overrides */
  className: PropTypes.string,
};
