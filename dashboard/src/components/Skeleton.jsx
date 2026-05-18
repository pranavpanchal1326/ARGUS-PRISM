import React from 'react';

const SHIMMER_STYLE = {
  background: 'linear-gradient(90deg, var(--bg-subtle) 25%, var(--bg-elevated) 50%, var(--bg-subtle) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.6s ease-in-out infinite',
  display: 'block',
};

/* Inject keyframes once */
if (typeof document !== 'undefined' && !document.getElementById('skeleton-kf')) {
  const s = document.createElement('style');
  s.id = 'skeleton-kf';
  s.textContent = '@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}';
  document.head.appendChild(s);
}

export default function Skeleton({ width='100%', height='16px', borderRadius='4px', variant='rect' }) {
  const style = {
    ...SHIMMER_STYLE,
    width:  variant === 'circle' ? height : width,
    height,
    borderRadius: variant === 'circle' ? '50%' : borderRadius,
    flexShrink: 0,
  };
  return <span style={style} />;
}

export function SkeletonScore() {
  return <Skeleton width="120px" height="64px" borderRadius="8px" />;
}

export function SkeletonAlertRow() {
  return <Skeleton width="100%" height="56px" borderRadius="8px" />;
}

export function SkeletonCard() {
  return <Skeleton width="100%" height="200px" borderRadius="12px" />;
}

export function SkeletonText({ lines = 3 }) {
  const widths = ['100%', '85%', '60%', '75%', '90%'];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={widths[i % widths.length]} height="14px" borderRadius="4px" />
      ))}
    </div>
  );
}
