/*
  DEPENDENCIES REQUIRED FOR PHASE 1C:

  npm install framer-motion
  npm install @react-spring/web
  npm install react-router-dom

  framer-motion:    ^11.0.0  — view transitions, variants, whileHover
  @react-spring/web: ^9.7.0  — number counters, SHAP bar fills
  react-router-dom:  ^6.22.0 — routing (used from Phase 4)

  These must be installed before any component in Phase 2 will run.
*/

// ─── Phase 6B: Tree-shaking exports ──────────────────────────
// Import from '../../design/motion' instead of 'framer-motion'
// to benefit from LazyMotion deferred loading.
import React from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence as AP } from 'framer-motion';
export { LazyMotion, domAnimation, m as motion, AP as AnimatePresence };

/** MotionProvider — wraps the app in LazyMotion for deferred animation bundle */
export function MotionProvider({ children }) {
  return React.createElement(LazyMotion, { features: domAnimation, strict: false }, children);
}


// Ink on paper. Soft start. Confident spread. Crisp end.
// No bounce. No elastic. No decorative movement.
// All components import from here. Never define locally.
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// SECTION 1: FRAMER MOTION SPRING PRESETS
// ─────────────────────────────────────────────────────────

/**
 * springSnappy — fast, decisive.
 * Used for: hover states, button taps, badge updates, small UI feedback.
 * Settles in ~180ms.
 */
export const springSnappy = {
  type: 'spring',
  stiffness: 400,
  damping: 40,
  mass: 1,
};

/**
 * springSmooth — balanced, confident.
 * Used for: card entrances, alert row stagger, view panel reveals,
 * SHAP bar fills, sidebar active state.
 * Settles in ~320ms.
 */
export const springSmooth = {
  type: 'spring',
  stiffness: 200,
  damping: 30,
  mass: 1,
};

/**
 * springGentle — unhurried, deliberate.
 * Used for: page section reveals on landing, large content blocks,
 * the 72-hour timeline reveal.
 * Settles in ~500ms.
 */
export const springGentle = {
  type: 'spring',
  stiffness: 100,
  damping: 25,
  mass: 1,
};

/**
 * springScore — tuned specifically for the WarmthScore number counter.
 * Slow enough to read. Fast enough to feel urgent. Never bounces.
 * Settles in ~600ms.
 */
export const springScore = {
  type: 'spring',
  stiffness: 120,
  damping: 20,
  mass: 1,
};

// ─────────────────────────────────────────────────────────
// SECTION 2: FRAMER MOTION VARIANT PRESETS
// ─────────────────────────────────────────────────────────

/**
 * fadeIn — simple opacity.
 * For: tooltips, overlays, content that appears without spatial movement.
 */
export const fadeIn = {
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  exit:       { opacity: 0 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

/**
 * slideUp — moves up 16px while fading in.
 * For: landing page section reveals on scroll.
 * The workhorse of the landing page.
 */
export const slideUp = {
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -8 },
  transition: springSmooth,
};

/**
 * slideUpDelayed — slideUp with per-item stagger delay.
 * For: lists, grids, engine cards, legal table rows.
 * Usage: <motion.div {...slideUpDelayed(index)}>
 * 0.06s per item creates a natural cascade.
 */
export const slideUpDelayed = (i = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -8 },
  transition: { ...springSmooth, delay: i * 0.06 },
});

/**
 * slideInLeft — enters from left 16px.
 * For: alert rows entering the queue.
 * Exit goes right to feel like dismissal.
 */
export const slideInLeft = {
  initial:    { opacity: 0, x: -16 },
  animate:    { opacity: 1, x: 0 },
  exit:       { opacity: 0, x: 16 },
  transition: springSmooth,
};

/**
 * alertRowVariant — alert rows specifically.
 * Includes height animation for smooth queue reflow.
 * For: AnimatePresence list in Alert Queue view.
 */
export const alertRowVariant = (i = 0) => ({
  initial:    { opacity: 0, x: -16, height: 0 },
  animate:    { opacity: 1, x: 0,   height: 'auto' },
  exit:       { opacity: 0, x: 16,  height: 0 },
  transition: { ...springSmooth, delay: i * 0.04 },
});

/**
 * scaleIn — scales from 0.92 to 1.0 while fading.
 * For: modals, popups, threshold action notifications.
 * Slight scale reads as "emerging" not "appearing".
 */
export const scaleIn = {
  initial:    { opacity: 0, scale: 0.92 },
  animate:    { opacity: 1, scale: 1 },
  exit:       { opacity: 0, scale: 0.96 },
  transition: springSnappy,
};

/**
 * stampIn — threshold crossing "seal stamp" effect.
 * Scales on X from 0 (left edge) to 1.
 * Like a stamp being pressed onto paper.
 * Used on: score threshold line labels (75, 85).
 */
export const stampIn = {
  initial:    { scaleX: 0, opacity: 0 },
  animate:    { scaleX: 1, opacity: 1 },
  exit:       { scaleX: 0, opacity: 0 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
};

/**
 * pulseRing — expanding ring on threshold crossing.
 * Used alongside stampIn. Creates urgency.
 */
export const pulseRing = {
  initial:    { scale: 0.5, opacity: 0.8 },
  animate:    { scale: 2.5, opacity: 0 },
  transition: { duration: 0.8, ease: 'easeOut' },
};

/**
 * viewTransitionVariants — horizontal page slide.
 * For: switching between dashboard views.
 * Direction: positive = slide from right, negative = from left.
 * Usage: pass direction as custom prop via useMotionValue.
 */
export const viewTransitionVariants = {
  enter:  (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
};

export const viewTransitionConfig = {
  duration: 0.28,
  ease: [0.4, 0, 0.2, 1],
};

/**
 * wordReveal — word-by-word hero headline reveal.
 * For: landing page H1 only.
 * Each word wraps in overflow:hidden container.
 * Usage: words.map((word, i) => <motion.span {...wordReveal(i)}>)
 */
export const wordReveal = (i = 0) => ({
  initial:    { y: '100%' },
  animate:    { y: 0 },
  transition: { ...springSmooth, delay: i * 0.08 },
});

/**
 * nodeEntrance — D3 graph node spring scale config.
 * Used as CSS animation config, not Framer Motion.
 * Reference values for D3 transition configuration.
 */
export const nodeEntrance = {
  delay:     (i) => i * 40,  // ms per node
  duration:  400,             // ms total
  ease:      'easeBackOut',   // d3 ease
  overshoot: 0.5,             // subtle back-out
};

// ─────────────────────────────────────────────────────────
// SECTION 3: REACT-SPRING CONFIGS
// Used specifically for animated number counters.
// Framer Motion does not handle number interpolation
// as cleanly as react-spring for counter use cases.
// ─────────────────────────────────────────────────────────

/**
 * scoreSpringConfig — the WarmthScore animated counter.
 * Mass 1, tension 120, friction 20.
 * Confident count-up with slight overshoot that settles exactly.
 * No visible bounce — just weight.
 */
export const scoreSpringConfig = {
  mass:     1,
  tension:  120,
  friction: 20,
};

/**
 * statCounterConfig — landing page hero stat numbers.
 * Duration-based (not spring) for predictable timing.
 * 1800ms with quartic ease-out feels premium.
 */
export const statCounterConfig = {
  duration: 1800,
  easing:   (t) => 1 - Math.pow(1 - t, 4), // quartic ease-out
};

/**
 * shapBarConfig — SHAP attribution bar fills.
 * Staggered fills from 0 to target width.
 * Each bar fills after previous by 80ms (controlled in component).
 */
export const shapBarConfig = {
  mass:     1,
  tension:  180,
  friction: 26,
};

// ─────────────────────────────────────────────────────────
// SECTION 4: CSS ANIMATION KEYFRAMES REFERENCE
// Documentation of CSS keyframe animations in animations.css.
// Lists every named animation so engineers know what exists.
// ─────────────────────────────────────────────────────────

export const CSS_ANIMATIONS = {
  // Recharts line draw-in — applied to .recharts-line-curve
  lineDrawIn:   'prism-line-draw 1.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',

  // Crisis ticker — infinite horizontal scroll
  ticker:       'prism-ticker 60s linear infinite',

  // Sidebar active indicator — slides in from left edge
  sidebarSlide: 'prism-sidebar-slide 0.2s ease-out forwards',

  // Live clock — no animation, reference only
  liveClock:    null,

  // Health dot pulse — green status dots in navbar pulse slowly
  healthPulse:  'prism-health-pulse 2s ease-in-out infinite',
};

// ─────────────────────────────────────────────────────────
// SECTION 5: HOVER MOTION CONFIGS
// whileHover and whileTap props for Framer Motion.
// Spread directly into motion component props.
// ─────────────────────────────────────────────────────────

/**
 * cardHover — the paper lift effect.
 * 2px up. Shadow appears in CSS (:hover via .card-hover class).
 * Used on: every card across the entire system.
 */
export const cardHover = {
  whileHover:  { y: -2 },
  whileTap:    { y: 0 },
  transition:  springSnappy,
};

/**
 * buttonHover — subtle scale on hover.
 * 1% up, 2% down on tap.
 * Used on: all Button components.
 */
export const buttonHover = {
  whileHover:  { scale: 1.01 },
  whileTap:    { scale: 0.98 },
  transition:  springSnappy,
};

/**
 * alertRowHover — translateX 2px right on hover.
 * Creates a "selecting" feel without scale distortion.
 * Used on: every row in Alert Queue table.
 */
export const alertRowHover = {
  whileHover:  { x: 2 },
  transition:  springSnappy,
};
