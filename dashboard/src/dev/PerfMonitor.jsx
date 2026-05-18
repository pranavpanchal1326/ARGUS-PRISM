import { useState, useEffect, useRef } from 'react';
import { pollingRegistry } from './pollingRegistry';

export default function PerfMonitor() {
  if (!import.meta.env.DEV) return null;

  const [fps,    setFps]    = useState(60);
  const [mem,    setMem]    = useState(null);
  const [polls,  setPolls]  = useState(0);
  const [lastRender, setLastRender] = useState('');

  const fpsRef      = useRef(60);
  const frameRef    = useRef(null);
  const lastTimeRef = useRef(performance.now());

  /* FPS */
  useEffect(() => {
    const measure = (time) => {
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;
      fpsRef.current = Math.round(1000 / delta);
      frameRef.current = requestAnimationFrame(measure);
    };
    frameRef.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  /* 1s tick — update display */
  useEffect(() => {
    const id = setInterval(() => {
      setFps(fpsRef.current);
      setPolls(pollingRegistry.count());
      setLastRender(new Date().toLocaleTimeString('en-GB'));
      if (performance.memory) {
        setMem((performance.memory.usedJSHeapSize / 1048576).toFixed(1));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const row = (label, value) => (
    <div key={label} style={{ display:'flex', justifyContent:'space-between', gap:'16px' }}>
      <span style={{ color:'var(--text-tertiary)' }}>{label}</span>
      <span style={{ color:'var(--text-primary)', fontWeight:500 }}>{value}</span>
    </div>
  );

  return (
    <div style={{
      position:'fixed', bottom:'16px', right:'16px', zIndex:9999,
      background:'var(--bg-elevated)', border:'1px solid var(--border-strong)',
      borderRadius:'8px', padding:'12px 16px', width:'180px',
      fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-secondary)',
      opacity:0.85, pointerEvents:'none',
      display:'flex', flexDirection:'column', gap:'4px',
    }}>
      <div style={{ fontWeight:600, color:'var(--text-tertiary)', marginBottom:'4px',
        letterSpacing:'0.08em', textTransform:'uppercase', fontSize:'9px' }}>
        PRISM PERF
      </div>
      {row('FPS',   fps)}
      {mem && row('Memory', `${mem} MB`)}
      {row('Polls',  polls)}
      {row('Render', lastRender)}
    </div>
  );
}
