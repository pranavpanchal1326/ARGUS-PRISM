import React from 'react';

export default class ApiErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }

  static getDerivedStateFromError(error) { return { hasError: true, error }; }

  componentDidCatch(error, info) { /* silent — no console output */ }

  render() {
    if (!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message || 'An unexpected error occurred.';
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        height:'100%', minHeight:'320px', padding:'48px', gap:'20px',
        background:'var(--bg-surface)', borderRadius:'16px',
        border:'1px solid var(--border-default)',
      }}>
        <div style={{ fontSize:'40px', color:'var(--warning)' }}>⚠</div>
        <h2 style={{
          fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:700,
          fontVariationSettings:"'opsz' 28,'WONK' 0", color:'var(--text-primary)',
          margin:0, textAlign:'center',
        }}>
          Something went wrong
        </h2>
        <p style={{
          fontFamily:'var(--font-ui)', fontSize:'13px', color:'var(--text-secondary)',
          margin:0, textAlign:'center', maxWidth:'360px', lineHeight:1.6,
        }}>
          {msg}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            fontFamily:'var(--font-ui)', fontSize:'13px', fontWeight:600,
            color:'var(--bg-base)', background:'var(--accent)',
            border:'none', borderRadius:'8px', padding:'10px 24px', cursor:'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }
}
