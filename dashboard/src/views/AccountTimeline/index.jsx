import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { useWarmthScore, useWarmthTimeline } from '../../api/hooks';
import { SkeletonScore, SkeletonText } from '../../components/Skeleton';
import { useWindowSize } from '../../hooks/useWindowSize';

/* ── Data ─────────────────────────────────────────────── */
const DEMO_ACCOUNT = {
  account_id: 'UBI-2026-DEMO-001', name: 'Rajesh Kumar',
  ifsc: 'UBIN0123456', branch: 'Andheri East, Mumbai',
  kyc_status: 'PENDING_REVERIFICATION', fri_score: 'LOW',
  current_warmth_score: 84, risk_level: 'CRITICAL',
};

const TIMELINE_DATA = [
  { hour:  0, score: 21, label: 'Account created',    signal: null },
  { hour:  6, score: 24, label: null,                  signal: null },
  { hour: 12, score: 29, label: 'FRI check: LOW',     signal: null },
  { hour: 18, score: 35, label: null,                  signal: null },
  { hour: 24, score: 41, label: 'Signal 1 fires',     signal: 'test_credit' },
  { hour: 30, score: 47, label: null,                  signal: null },
  { hour: 36, score: 58, label: 'Signal 2 fires',     signal: 'device_fp' },
  { hour: 42, score: 63, label: null,                  signal: null },
  { hour: 48, score: 69, label: 'Signal 3 fires',     signal: 'velocity' },
  { hour: 54, score: 73, label: null,                  signal: null },
  { hour: 60, score: 77, label: 'KYC restricted ⚠',  signal: 'threshold_75', threshold_crossed: 75 },
  { hour: 66, score: 80, label: null,                  signal: null },
  { hour: 71, score: 84, label: 'AutoSTR initiated',  signal: 'threshold_85', threshold_crossed: 85 },
];

const SHAP_DATA = [
  { signal: 'Signal 4 — Dormant Reactivation', impact: 31.2 },
  { signal: 'Signal 2 — Device Fingerprint',   impact: 22.0 },
  { signal: 'Signal 5 — FRI Contradiction',    impact: 18.3 },
  { signal: 'Signal 1 — Test Credit Pattern',  impact: 11.5 },
  { signal: 'Signal 3 — Velocity Derivative',  impact:  9.2 },
  { signal: 'Signal 6 — SIM Swap Velocity',    impact:  6.1 },
];

const LEGAL_ACTIONS = [
  { label: 'KYC Re-verification triggered', hour: 60, basis: 'RBI KYC Master Direction 2016 — S.38', status: 'ACTIVE' },
  { label: 'AutoSTR initiated',             hour: 71, basis: 'PMLA Section 12',                      status: 'ACTIVE' },
  { label: 'CBI Evidence Package queued',   hour: 71, basis: 'SC Suo Moto Writ 03/2025',             status: 'PENDING' },
];

/* ── Helpers ──────────────────────────────────────────── */
function getHeatColor(score) {
  if (score >= 85) return 'var(--heat-4)';
  if (score >= 75) return 'var(--heat-3)';
  if (score >= 60) return 'var(--heat-2)';
  if (score >= 40) return 'var(--heat-1)';
  return 'var(--heat-0)';
}
function getRiskLabel(score) {
  if (score >= 85) return 'IMMINENT';
  if (score >= 75) return 'CRITICAL';
  if (score >= 60) return 'HOT';
  if (score >= 40) return 'WARMING';
  return 'CLEAN';
}
const CARD = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '24px' };
const LABEL = { fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' };

/* ── CSS ──────────────────────────────────────────────── */
const STYLES = `
  @keyframes drawLine { to { stroke-dashoffset: 0; } }
  @keyframes stampPulse {
    0%   { box-shadow: 0 0 0 0 rgba(207,52,33,0.4); }
    70%  { box-shadow: 0 0 0 8px rgba(207,52,33,0); }
    100% { box-shadow: 0 0 0 0 rgba(207,52,33,0); }
  }
  .score-chart .recharts-area-curve,
  .score-chart .recharts-area-area {
    stroke-dasharray: 3000;
    stroke-dashoffset: 3000;
    animation: drawLine 1.6s cubic-bezier(0.4,0,0.2,1) forwards;
    animation-delay: 0.3s;
  }
  .stamp-pulse { animation: stampPulse 2s infinite; }
  .at-action-btn { transition: background 0.15s ease; }
`;

/* ── Sub-components ───────────────────────────────────── */
function WarmthBadge({ score }) {
  const c = getHeatColor(score);
  const l = getRiskLabel(score);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 12px', borderRadius: '4px',
      background: `color-mix(in srgb, ${c} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${c} 25%, transparent)`,
      color: c, fontFamily: 'var(--font-ui)', fontSize: '10px',
      fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c }} />
      {l}
    </span>
  );
}

function AnimatedScore({ score }) {
  const { n } = useSpring({ from: { n: 0 }, n: score, config: { mass: 1, tension: 120, friction: 20 } });
  const c = getHeatColor(score);
  return (
    <animated.span style={{ fontFamily: 'var(--font-display)', fontVariationSettings: "'opsz' 72,'WONK' 0",
      fontSize: '72px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: c }}>
      {n.to(v => Math.round(v))}
    </animated.span>
  );
}

function ShapBar({ signal, impact, maxImpact, index }) {
  const pct = `${(impact / maxImpact) * 100}%`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{signal}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>+{impact}</span>
      </div>
      <div style={{ width: '100%', height: '4px', background: 'var(--border-default)', borderRadius: '999px', overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', background: 'var(--accent)', borderRadius: '999px' }}
          initial={{ width: '0%' }}
          animate={{ width: pct }}
          transition={{ duration: 0.7, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

function CustomDot(props) {
  const { cx, cy, payload } = props;
  if (!payload.signal) return null;
  return (
    <motion.circle cx={cx} cy={cy} r={5}
      fill="var(--accent)" stroke="var(--bg-elevated)" strokeWidth={2}
      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.8 + (payload.hour / 71) * 0.4, type: 'spring', stiffness: 400, damping: 30 }}
    />
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ ...CARD, padding: '10px 14px', boxShadow: '0 4px 16px color-mix(in srgb, var(--text-primary) 8%, transparent)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', margin: '0 0 4px' }}>Hour {d.hour}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', margin: 0 }}>{d.score}</p>
      {d.label && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{d.label}</p>}
    </div>
  );
}

function ThresholdStamp({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2 + index * 0.15, type: 'spring', stiffness: 300, damping: 30 }}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
        background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
        borderRadius: '8px', marginTop: '8px' }}
    >
      <div className="stamp-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
          Score crossed {item.threshold_crossed}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>
          Hour {item.hour} — {item.label}
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-secondary)' }}>
        {item.threshold_crossed === 75 ? 'RBI KYC S.38' : 'PMLA S.12'}
      </span>
    </motion.div>
  );
}

function LegalActionRow({ item, index, isLast }) {
  const dotColor = item.status === 'ACTIVE' ? 'var(--success)' : 'var(--warning)';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.6 + index * 0.1, type: 'spring', stiffness: 300, damping: 35 }}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border-default)' }}
    >
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-tertiary)' }}>{item.basis}</div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)',
        padding: '2px 8px', background: 'var(--bg-subtle)', borderRadius: '4px' }}>
        H+{item.hour}
      </span>
    </motion.div>
  );
}

function ActionButton({ children, variant = 'default', onClick }) {
  const [hov, setHov] = useState(false);
  const s = variant === 'accent'
    ? { bg: hov ? 'var(--accent-hover)' : 'var(--accent)', color: 'var(--bg-base)', border: 'none', fw: 600 }
    : variant === 'warning'
    ? { bg: hov ? 'var(--warning-bg)' : 'transparent', color: 'var(--warning)', border: '1px solid var(--warning)', fw: 500 }
    : { bg: hov ? 'var(--bg-subtle)' : 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)', fw: 500 };
  return (
    <motion.button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: s.fw,
        padding: variant === 'accent' ? '8px 18px' : '8px 16px', borderRadius: '8px',
        cursor: 'pointer', background: s.bg, color: s.color, border: s.border, transition: 'background 0.15s ease' }}>
      {children}
    </motion.button>
  );
}

/* ── Main export ──────────────────────────────────────── */
export default function AccountTimeline({
  accountId           = 'UBI-2026-DEMO-001',
  account             = DEMO_ACCOUNT,
  legalActions        = LEGAL_ACTIONS,
  onGenerateEvidence  = () => {},
  onMarkFalsePositive = () => {},
  onRequestKYC        = () => {},
}) {
  const { data: scoreData,    loading: scoreLoading }    = useWarmthScore(accountId);
  const { data: timelineData, loading: timelineLoading } = useWarmthTimeline(accountId);
  const { width } = useWindowSize();
  const isMobile = width < 768;

  const score    = scoreData?.warmth_score    ?? account.current_warmth_score;
  const shap     = scoreData?.shap_top3
    ? scoreData.shap_top3.map(s => ({ signal: s.signal, impact: s.impact }))
    : SHAP_DATA;
  const timeline = timelineData ?? TIMELINE_DATA;

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const maxImpact      = shap[0]?.impact || 1;
  const heatColor      = getHeatColor(score);
  const thresholdPts   = timeline.filter(d => d.threshold_crossed);

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '400px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* ── LEFT PANEL ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '32px' }}>

          {/* Identity card */}
          <div style={CARD}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600,
              color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{account.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.02em' }}>{account.account_id}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>IFSC: {account.ifsc}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-secondary)' }}>{account.branch}</span>
            </div>
            <div style={{ height: '1px', background: 'var(--border-default)' }} />
            <div>
              <div style={{ ...LABEL, marginBottom: '4px' }}>FRI Score</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500, color: 'var(--success)' }}>LOW — Clean SIM</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontStyle: 'italic', color: 'var(--accent)', marginTop: '2px' }}>Signal 5 contradiction active</div>
            </div>
            <WarmthBadge score={account.current_warmth_score} />
          </div>

          {/* Score card */}
          <div style={{ ...CARD, textAlign: 'center' }}>
            {scoreLoading ? <SkeletonScore /> : <AnimatedScore score={score} />}
            <div style={{ ...LABEL, marginTop: '8px' }}>WarmthScore</div>
          </div>

          {/* SHAP card */}
          <div style={CARD}>
            <div style={{ ...LABEL, marginBottom: '16px' }}>Signal Attribution</div>
            {scoreLoading
              ? <SkeletonText lines={6} />
              : shap.map((item, i) => (
                  <ShapBar key={item.signal} signal={item.signal} impact={item.impact} maxImpact={maxImpact} index={i} />
                ))
            }
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Chart card */}
          <div style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>WarmthScore Timeline</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-tertiary)' }}>Last 72 hours</span>
            </div>
            <div className="score-chart">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tickFormatter={h => `${h}h`}
                    tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: 'var(--text-tertiary)' }}
                    axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 40, 60, 75, 85, 100]}
                    tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: 'var(--text-tertiary)' }}
                    axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={60} stroke="var(--heat-2)" strokeDasharray="4 4"
                    label={{ value: 'HOT', position: 'right', fill: 'var(--heat-2)', fontFamily: 'DM Sans', fontSize: 9, fontWeight: 600 }} />
                  <ReferenceLine y={75} stroke="var(--heat-3)" strokeDasharray="4 4"
                    label={{ value: 'KYC RESTRICT', position: 'right', fill: 'var(--heat-3)', fontFamily: 'DM Sans', fontSize: 9, fontWeight: 600 }} />
                  <ReferenceLine y={85} stroke="var(--heat-4)" strokeDasharray="4 4"
                    label={{ value: 'AUTOSTR', position: 'right', fill: 'var(--heat-4)', fontFamily: 'DM Sans', fontSize: 9, fontWeight: 600 }} />
                  <Area type="monotone" dataKey="score"
                    stroke="var(--accent)" strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                    dot={<CustomDot />}
                    activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--bg-elevated)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Threshold stamps */}
            {thresholdPts.map((item, i) => <ThresholdStamp key={item.hour} item={item} index={i} />)}
          </div>

          {/* Legal actions card */}
          <div style={CARD}>
            <div style={{ ...LABEL, marginBottom: '16px' }}>Legal Actions Triggered</div>
            {legalActions.map((item, i) => (
              <LegalActionRow key={item.label} item={item} index={i} isLast={i === legalActions.length - 1} />
            ))}
          </div>

          {/* MLRO action bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '4px' }}>
            <ActionButton variant="default"  onClick={onMarkFalsePositive}>Mark False Positive</ActionButton>
            <ActionButton variant="warning"  onClick={onRequestKYC}>Request Video KYC</ActionButton>
            <ActionButton variant="accent"   onClick={onGenerateEvidence}>Generate Evidence Package →</ActionButton>
          </div>

        </div>
      </div>
    </div>
  );
}
