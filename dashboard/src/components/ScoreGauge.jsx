import React from 'react';
import PropTypes from 'prop-types';
import { useSpring, animated } from '@react-spring/web';
import { scoreSpringConfig } from '../design/motion';
import { getScoreLevel } from './WarmthBadge';

/**
 * ARC GEOMETRY CONSTANTS
 *
 * SVG viewBox: 0 0 120 72
 * Centre:      cx=60, cy=70  (near bottom of viewBox)
 * Radius:      r=48
 *
 * The arc spans exactly 180° — a semicircle.
 *
 * CIRCUMFERENCE of this half-circle:
 *   Full circle circumference = 2π × 48 ≈ 301.59
 *   Half circle (180°)        = π × 48  ≈ 150.80
 *
 * strokeDasharray = CIRCUMFERENCE (sets dash length = full arc)
 * strokeDashoffset:
 *   offset = CIRCUMFERENCE - (score / 100 × CIRCUMFERENCE)
 *   score 0   → offset ≈ 150.8  → nothing shown (fully offset)
 *   score 50  → offset ≈ 75.4   → half the arc shown
 *   score 100 → offset = 0      → full arc shown
 */
const RADIUS       = 48;
const CIRCUMFERENCE = Math.PI * RADIUS; // ≈ 150.796

/**
 * describeArc — returns SVG path string for a 180° semicircle.
 *
 * Path commands:
 *   M startX cy  — move to left edge of the arc
 *   A r r 0 0 1 endX cy  — arc: rx, ry, x-rotation,
 *                           large-arc-flag=0, sweep-flag=1, end point
 *
 * sweep-flag=1 = clockwise direction (left → right)
 * large-arc-flag=0 = take the short path (correct for 180°)
 */
function describeArc(cx, cy, r) {
  const startX = cx - r; // 60 - 48 = 12
  const endX   = cx + r; // 60 + 48 = 108
  return `M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`;
}

/**
 * ScoreGauge — decorative semicircle arc gauge.
 *
 * Renders a thin track arc (full) and an animated fill arc
 * (proportional to score). Designed to sit behind AnimatedScore
 * in Account Timeline view using absolute positioning.
 *
 * The fill arc springs to its target position using the same
 * scoreSpringConfig as AnimatedScore — they stay in sync.
 *
 * Composition pattern in Account Timeline:
 * @example
 *   <div style={{ position: 'relative', display: 'inline-block' }}>
 *     <ScoreGauge score={84} />
 *     <AnimatedScore score={84} size="hero"
 *       style={{ position: 'absolute', top: '50%', left: '50%',
 *                transform: 'translate(-50%, -40%)' }} />
 *   </div>
 */
export function ScoreGauge({ score, size = 120, className = '' }) {
  const { heatVar } = getScoreLevel(score);

  const targetOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  /*
    Spring animates dashOffset from its current value to targetOffset.
    When score changes, the arc sweeps to new position with weight.
    Uses same scoreSpringConfig as AnimatedScore for synchrony.
  */
  const { dashOffset } = useSpring({
    dashOffset: targetOffset,
    config: scoreSpringConfig,
  });

  const arcPath = describeArc(60, 70, RADIUS);

  /*
    viewBox height is 72 — enough vertical space for the arc
    (centre y=70, radius=48, so top of arc is at y=22).
    We crop the viewBox to 72px tall to remove dead space below.
    Rendered height = size * 0.6 to maintain the cropped aspect ratio.
  */
  return (
    <svg
      width={size}
      height={Math.round(size * 0.6)}
      viewBox="0 0 120 72"
      className={`score-gauge ${className}`.trim()}
      aria-hidden="true" /* decorative — AnimatedScore provides the a11y label */
    >
      {/* Track — full half-circle, always at full width */}
      <path
        d={arcPath}
        fill="none"
        stroke="var(--bg-subtle)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Fill — animated arc, springs to score position */}
      <animated.path
        d={arcPath}
        fill="none"
        stroke={`var(${heatVar})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        style={{
          /*
            CSS handles stroke colour crossfade as score crosses thresholds.
            The dashOffset itself is handled by react-spring.
          */
          transition: `stroke var(--transition-base)`,
        }}
      />
    </svg>
  );
}

ScoreGauge.propTypes = {
  /** WarmthScore value 0–100 */
  score:     PropTypes.number.isRequired,
  /** SVG rendered width in px — height is auto-calculated at 60% */
  size:      PropTypes.number,
  /** Additional CSS classes for layout overrides */
  className: PropTypes.string,
};
