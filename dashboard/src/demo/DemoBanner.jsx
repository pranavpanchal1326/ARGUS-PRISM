import React, { useEffect, useRef, useState } from 'react';
import { useDemoContext } from './DemoContext';

const STEP_LABELS = ['Warming Phase', 'Legal Restriction', 'Network Detection', 'Evidence Packages'];

export default function DemoBanner() {
  const { isDemoMode, isAutoPlaying, autoPlayStep, startAutoPlay, stopAutoPlay, resetDemo, exitDemoMode, goToStep } = useDemoContext();
  const [progKey, setProgKey] = useState(0);

  useEffect(() => { setProgKey(k => k + 1); }, [autoPlayStep]);

  if (!isDemoMode) return null;

  const btnStyle = (active) => ({
    fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600,
    color: 'var(--bg-base)', background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
    border: 'none', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer',
    transition: 'background 0.15s ease', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '36px', zIndex: 9999,
      background: 'var(--accent)', color: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', gap: '8px', userSelect: 'none' }}>

      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', display: 'inline-block',
          animation: 'demo-pulse 2s ease-in-out infinite' }} />
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600,
          letterSpacing: '0.06em', color: 'var(--bg-base)' }}>
          DEMO MODE ACTIVE
        </span>
      </div>

      {/* Centre — step pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {STEP_LABELS.map((label, i) => (
          <button key={i} onClick={() => goToStep(i)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              padding: '2px 10px', borderRadius: '99px', cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.4)',
              background: autoPlayStep === i ? 'rgba(255,255,255,0.95)' : 'transparent',
              color: autoPlayStep === i ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
              fontWeight: autoPlayStep === i ? 700 : 400,
              transition: 'all 0.2s ease',
            }}>
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {/* Right — controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        {isAutoPlaying
          ? <button onClick={stopAutoPlay}  style={btnStyle(false)}>■ Stop</button>
          : <button onClick={startAutoPlay} style={btnStyle(false)}>▶ Auto-Play</button>
        }
        <button onClick={resetDemo}   style={btnStyle(false)}>↺ Reset</button>
        <button onClick={exitDemoMode} style={{ ...btnStyle(false), opacity: 0.7 }}>✕ Exit</button>
      </div>

      {/* Bottom progress bar — resets per step via key */}
      <div key={progKey} style={{
        position: 'absolute', bottom: 0, left: 0, height: '2px',
        background: 'rgba(255,255,255,0.6)',
        animation: isAutoPlaying ? 'demo-progress 60s linear forwards' : 'none',
        width: isAutoPlaying ? undefined : '0%',
      }} />

      <style>{`
        @keyframes demo-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes demo-progress { from{width:0%} to{width:100%} }
      `}</style>
    </div>
  );
}
