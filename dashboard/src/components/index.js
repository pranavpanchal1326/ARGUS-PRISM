/**
 * PRISM Component Library — Barrel Export
 *
 * All imports via: import { X } from '../components'
 * Named exports only in the barrel — avoids duplicate-name
 * syntax errors from re-exporting both default and named.
 *
 * Components with default exports can also be imported
 * directly: import WarmthBadge from '../components/WarmthBadge'
 */

/* ── Phase 2A: Score & Status ─────────────────────────── */
export { WarmthBadge, getScoreLevel }  from './WarmthBadge';
export { AnimatedScore }               from './AnimatedScore';
export { KPICard }                     from './KPICard';
export { ScoreGauge }                  from './ScoreGauge';

/* ── Phase 2B: Alert & Action ─────────────────────────── */
export { AlertRow, alertRowExit }      from './AlertRow';
export { default as ThresholdStamp }   from './ThresholdStamp';

export { Button }                      from './Button';
export { LegalActionNotification }     from './LegalActionNotification';

/* ── Phase 2C: Theme System ───────────────────────────── */
export { ThemeToggle }                 from './ThemeToggle';
export { default as GrainFilter }      from './GrainFilter';
