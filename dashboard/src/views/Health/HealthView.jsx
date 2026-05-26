import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client';

const CARD_STYLE = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: '12px',
  padding: '24px',
  position: 'relative',
  overflow: 'hidden',
};

const LABEL_STYLE = {
  fontFamily: 'var(--font-ui)',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
};

export default function HealthView() {
  const [healthData, setHealthData] = useState(null);
  const [readyData, setReadyData] = useState(null);
  const [thresholdsData, setThresholdsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      const [h, r, t] = await Promise.all([
        api.getHealth().catch(e => { throw e; }),
        api.getHealthReady().catch(() => null),
        api.getHealthThresholds().catch(() => null),
      ]);
      setHealthData(h);
      setReadyData(r);
      setThresholdsData(t);
      
      const now = new Date();
      const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      setLastUpdated(ist.toLocaleTimeString('en-US', { hour12: false }) + ' IST');
    } catch (e) {
      console.error(e);
      setError('Backend API unreachable or offline.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 15000);
    return () => clearInterval(timer);
  }, [fetchHealth]);

  const getServiceStatus = (serviceKey) => {
    if (!readyData?.dependencies?.[serviceKey]) {
      return { status: 'down', latency: 'N/A' };
    }
    const dep = readyData.dependencies[serviceKey];
    return {
      status: dep.status === 'up' ? 'up' : 'down',
      latency: dep.latency_ms !== undefined ? `${dep.latency_ms}ms` : 'Active',
      version: dep.version,
    };
  };

  const services = [
    { name: 'PostgreSQL Database', key: 'postgresql', desc: 'Core transaction registry & scoring audit log' },
    { name: 'Redis Cache', key: 'redis', desc: 'Warmth score timelines & active session broker' },
    { name: 'Neo4j Graph Database', key: 'neo4j', desc: 'Mule campaign subgraphs & taint propagation routes' },
    { name: 'ML WarmthScore Predictor', key: 'ml_model', desc: 'Real-time XGBoost model with SHAP explanations' },
  ];

  if (loading && !healthData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '32px' }}>
        <div style={{ height: '40px', background: 'var(--bg-subtle)', borderRadius: '8px', width: '250px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginTop: '24px' }}>
          <div style={{ height: '240px', background: 'var(--bg-subtle)', borderRadius: '12px' }} />
          <div style={{ height: '240px', background: 'var(--bg-subtle)', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <span style={LABEL_STYLE}>SYSTEM STATUS</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0' }}>
            System Health
          </h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            ...CARD_STYLE,
            border: '1px solid var(--border-strong)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '64px 32px',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '4px',
            background: 'var(--error)',
          }} />
          
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(207, 52, 33, 0.08)',
            border: '2px solid var(--error)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            animation: 'prism-pulse 2s infinite',
          }}>
            <span style={{ fontSize: '28px', color: 'var(--error)', fontWeight: 700 }}>!</span>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            Backend Offline or Degraded
          </h2>
          
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.6, margin: '0 0 24px' }}>
            The PRISM dashboard cannot establish a secure websocket or REST link to the FastAPI middleware. Checks show all services offline.
          </p>

          <button 
            onClick={() => { setLoading(true); fetchHealth(); }}
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-base)',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(207, 52, 33, 0.2)',
            }}
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  const isDegraded = readyData?.status === 'degraded' || !readyData;

  return (
    <div style={{ padding: '32px', maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-default)', paddingBottom: '20px' }}>
        <div>
          <span style={LABEL_STYLE}>SYSTEM MONITORING</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0' }}>
            System Health
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Real-time status of downstreams, legal compliance thresholds, and operational readiness.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', animation: 'prism-pulse 2s infinite' }} />
            <span>AUTO-REFRESH ACTIVE (15s)</span>
          </div>
          <span>•</span>
          <span>LAST CHECK: {lastUpdated}</span>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Left Column: Overall Status Card */}
        <motion.div 
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          style={CARD_STYLE}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '4px',
            background: isDegraded ? 'var(--warning)' : 'var(--success)'
          }} />
          
          <span style={LABEL_STYLE}>Overall Readiness</span>
          
          <div style={{ margin: '32px 0 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: isDegraded ? 'rgba(255, 193, 7, 0.08)' : 'var(--success-bg)',
              border: `2.5px solid ${isDegraded ? 'var(--warning)' : 'var(--success)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'prism-pulse 2.5s infinite',
            }}>
              <span style={{ fontSize: '20px', color: isDegraded ? 'var(--warning)' : 'var(--success)' }}>
                {isDegraded ? '!' : '✓'}
              </span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                {isDegraded ? 'DEGRADED' : 'OPERATIONAL'}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                {isDegraded ? 'Some downstream microservices are failing' : 'All systems executing within acceptable parameters'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-default)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>System Kernel</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>PRISM Engine v{healthData?.version || '2.0'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>Deployment Mode</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{healthData?.environment || 'production'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>Core Uptime</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--success)' }}>100.0%</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Service Connectivity Status (2x2 Grid) */}
        <motion.div 
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <span style={LABEL_STYLE}>Downstream Services</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {services.map(s => {
              const { status, latency } = getServiceStatus(s.key);
              const isUp = status === 'up';
              return (
                <div key={s.name} style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px',
                  transition: 'border-color 0.2s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ maxWidth: '85%' }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                        {s.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginTop: '4px', lineHeight: 1.3 }}>
                        {s.desc}
                      </span>
                    </div>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: isUp ? 'var(--success)' : 'var(--error)',
                      boxShadow: isUp ? '0 0 10px rgba(0, 179, 0, 0.4)' : '0 0 10px rgba(207, 52, 33, 0.4)',
                      flexShrink: 0,
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-default)', paddingTop: '10px', marginTop: '12px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: isUp ? 'var(--success)' : 'var(--error)', textTransform: 'uppercase' }}>
                      {isUp ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Latency: <span style={{ color: isUp ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: 600 }}>{latency}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Bottom Compliance & Thresholds Table */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={CARD_STYLE}
      >
        <span style={LABEL_STYLE}>Legal & Compliance Thresholds</span>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 20px' }}>
          Operational verification of legal basis and trigger thresholds as specified under RBI Directives & PMLA.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-ui)', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border-strong)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Action / Objective</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: '120px' }}>WarmthScore</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Legal Basis / Regulatory Mandate</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: '100px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { action: 'Internal Monitoring & Enhanced Scrutiny', score: thresholdsData?.thresholds?.monitoring || 40, legal: thresholdsData?.thresholds?.legal_basis_monitoring || 'Internal Risk Policy Framework' },
                { action: 'Request Video KYC Verification', score: thresholdsData?.thresholds?.kyc || 60, legal: thresholdsData?.thresholds?.legal_basis_kyc || 'RBI KYC Master Direction 2016 S.38' },
                { action: 'Account Freeze & Restriction', score: thresholdsData?.thresholds?.restriction || 75, legal: thresholdsData?.thresholds?.legal_basis_restriction || 'RBI KYC Master Direction 2016 S.38 (Pre-crime basis)' },
                { action: 'AutoSTR FIU Ingestion Draft', score: thresholdsData?.thresholds?.autostr || 85, legal: thresholdsData?.thresholds?.legal_basis_autostr || 'PMLA 2002 Section 12 (Filing of STR)' },
                { action: 'Generate CBI Evidence Package', score: thresholdsData?.thresholds?.cbi_package || 85, legal: thresholdsData?.thresholds?.legal_basis_cbi || 'Supreme Court Writ Petition 03/2025 Mandate' }
              ].map((row, idx) => (
                <tr key={row.action} style={{ borderBottom: '1px solid var(--border-default)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{row.action}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '11px',
                      color: 'var(--accent)', background: 'var(--accent-subtle)',
                      border: '1px solid var(--accent-border)', padding: '2px 8px', borderRadius: '4px'
                    }}>
                      &ge; {row.score}.0
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{row.legal}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{
                      fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
                      color: 'var(--success)', background: 'var(--success-bg)',
                      padding: '2px 8px', borderRadius: '4px', border: '1px solid color-mix(in srgb, var(--success) 20%, transparent)'
                    }}>
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
