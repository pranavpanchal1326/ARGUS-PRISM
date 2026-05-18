import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlerts, acknowledgeAlert } from '../../api/hooks';
import { SkeletonAlertRow } from '../../components/Skeleton';
import ApiErrorBoundary from '../../api/ApiErrorBoundary';
import { useWindowSize } from '../../hooks/useWindowSize';

const SEV_COLOR = { CRITICAL:'var(--heat-4)', HIGH:'var(--heat-3)', MEDIUM:'var(--heat-2)', LOW:'var(--heat-0)' };
const TYPE_LABEL = { WARMTH_THRESHOLD:'WarmthScore ↑', FLOWGRAPH_TRIGGER:'Flow Graph', TAINT_HIT:'Taint Hit', RECRUITER_DETECTED:'Recruiter' };

function AlertRow({ alert, onAcknowledge, isRemoving }) {
  const [ack, setAck] = useState(false);
  const { width } = useWindowSize();
  const isMobile = width < 768;
  function handle(e) {
    e.stopPropagation();
    setAck(true);
    onAcknowledge(alert.alert_id);
  }
  const col = SEV_COLOR[alert.severity] || 'var(--text-tertiary)';
  return (
    <motion.div
      layout
      initial={{ opacity:0, y:8 }} animate={{ opacity: isRemoving ? 0 : 1, y: isRemoving ? -8 : 0 }}
      exit={{ opacity:0, x:-20, height:0, marginBottom:0 }}
      transition={{ type:'spring', stiffness:300, damping:30 }}
      style={{ display:'flex', alignItems: isMobile ? 'flex-start' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap:isMobile?'8px':'16px', padding: isMobile ? '12px 16px' : '14px 20px',
        background:'var(--bg-surface)', border:'1px solid var(--border-default)', borderLeft:`3px solid ${col}`,
        borderRadius:'10px', marginBottom:'8px', cursor:'default' }}>
      <div style={{ flexShrink:0 }}>
        <div style={{ fontFamily:'var(--font-ui)', fontSize:'9px', fontWeight:700, letterSpacing:'0.1em',
          textTransform:'uppercase', color:col }}>{alert.severity}</div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-tertiary)', marginTop:'2px' }}>
          {TYPE_LABEL[alert.alert_type] || alert.alert_type}
        </div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'var(--font-ui)', fontSize:'13px', fontWeight:500, color:'var(--text-primary)',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{alert.account_name}</div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-tertiary)' }}>{alert.account_id}</div>
        <div style={{ fontFamily:'var(--font-ui)', fontSize:'11px', color:'var(--text-secondary)', marginTop:'2px' }}>{alert.top_signal}</div>
      </div>
      {alert.score > 0 && (
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:700,
            fontVariationSettings:"'opsz' 28,'WONK' 0", color:col }}>{alert.score}</div>
          <div style={{ fontFamily:'var(--font-ui)', fontSize:'9px', color:'var(--text-tertiary)' }}>score</div>
        </div>
      )}
      {alert.taint_hit && (
        <span style={{ fontFamily:'var(--font-ui)', fontSize:'9px', fontWeight:700, letterSpacing:'0.08em',
          textTransform:'uppercase', color:'var(--accent)', background:'var(--accent-subtle)',
          border:'1px solid var(--accent-border)', borderRadius:'4px', padding:'2px 8px', flexShrink:0 }}>
          TAINT
        </span>
      )}
      <button onClick={handle} disabled={ack}
        style={{ fontFamily:'var(--font-ui)', fontSize:'11px', fontWeight:500,
          color: ack ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          background:'var(--bg-subtle)', border:'1px solid var(--border-default)', borderRadius:'6px',
          padding:'5px 12px', cursor: ack ? 'default' : 'pointer', flexShrink:0,
          opacity: ack ? 0.5 : 1 }}>
        {ack ? 'Ack\u2019d' : 'Acknowledge'}

      </button>
    </motion.div>
  );
}

function AlertQueueContent() {
  const { data: alerts, error, loading } = useAlerts({ acknowledged: false });
  const [localAlerts, setLocalAlerts] = useState(null);
  const [removing, setRemoving] = useState(new Set());

  const displayed = localAlerts ?? alerts ?? [];

  if (loading) return (
    <div style={{ padding:'32px', display:'flex', flexDirection:'column', gap:'8px' }}>
      {Array.from({length:5}, (_,i) => <SkeletonAlertRow key={i} />)}
    </div>
  );

  if (error && !alerts?.length) return (
    <div style={{ padding:'32px' }}>
      <ApiErrorBoundary><span>{error.message}</span></ApiErrorBoundary>
    </div>
  );

  async function handleAcknowledge(alertId) {
    const prev = localAlerts ?? alerts ?? [];
    setLocalAlerts(prev.filter(a => a.alert_id !== alertId));
    setRemoving(s => new Set([...s, alertId]));
    const res = await acknowledgeAlert(alertId);
    if (res.error) {
      setLocalAlerts(prev);
      setRemoving(s => { const n=new Set(s); n.delete(alertId); return n; });
    }
  }

  return (
    <div style={{ padding:'32px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:700,
            fontVariationSettings:"'opsz' 28,'WONK' 0", color:'var(--text-primary)', margin:0 }}>
            Alert Queue
          </h1>
          <p style={{ fontFamily:'var(--font-ui)', fontSize:'12px', color:'var(--text-tertiary)', margin:'4px 0 0' }}>
            {displayed.length} active alert{displayed.length !== 1 ? 's' : ''} — unacknowledged
          </p>
        </div>
      </div>
      <AnimatePresence mode="popLayout">
        {displayed.map(a => (
          <AlertRow key={a.alert_id} alert={a}
            onAcknowledge={handleAcknowledge}
            isRemoving={removing.has(a.alert_id)} />
        ))}
      </AnimatePresence>
      {displayed.length === 0 && (
        <div style={{ textAlign:'center', padding:'64px 0', fontFamily:'var(--font-ui)',
          fontSize:'14px', color:'var(--text-tertiary)' }}>
          All alerts acknowledged ✓
        </div>
      )}
    </div>
  );
}

export default function AlertQueueView() {
  return <ApiErrorBoundary><AlertQueueContent /></ApiErrorBoundary>;
}
