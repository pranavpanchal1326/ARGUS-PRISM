import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRecruiterData }     from './useRecruiterData';
import { RecruiterCard }        from './RecruiterCard';
import { RecruiterClassBadge }  from './RecruiterClassBadge';
import { CampaignStats }        from './CampaignStats';
import { CampaignGraph }        from './CampaignGraph';
import { FreezeConfirmModal }   from './FreezeConfirmModal';

/* Sort order: PLATFORM_SCALE → ORCHESTRATOR → COORDINATOR */
const SORT_ORDER = { PLATFORM_SCALE: 0, ORCHESTRATOR: 1, COORDINATOR: 2 };

const STATUS_DOT = {
  ACTIVE:        'var(--heat-0)',
  FROZEN:        'var(--text-disabled)',
  INVESTIGATING: 'var(--heat-1)',
};

const SHIMMER_CSS = `
  @keyframes shimmer {
    from { background-position: -200% 0; }
    to   { background-position:  200% 0; }
  }
  .skeleton-shimmer {
    background: linear-gradient(90deg, var(--bg-subtle) 25%, var(--bg-surface) 50%, var(--bg-subtle) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 12px;
  }
`;

function SkeletonCard() {
  return <div className="skeleton-shimmer" style={{ height: '160px', marginBottom: '10px' }} />;
}

export default function RecruiterMapView() {
  const {
    recruiters, selectedId, selectedRecruiter,
    loading, error, freezingId,
    setSelectedId, freezeCampaign,
  } = useRecruiterData();

  const [modalRecruiter, setModalRecruiter] = useState(null);

  /* Inject shimmer CSS once */
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = SHIMMER_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const sorted = [...recruiters].sort((a, b) =>
    (SORT_ORDER[a.classification] ?? 9) - (SORT_ORDER[b.classification] ?? 9)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)' }}>

      {/* Page header */}
      <div style={{ padding: '0 0 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700,
            fontVariationSettings: "'opsz' 24, 'WONK' 0", color: 'var(--text-primary)', margin: 0 }}>
            Recruiter Map
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Coordinator accounts orchestrating mule campaigns. One source. Many targets.
          </p>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)',
          whiteSpace: 'nowrap', paddingTop: '4px' }}>
          {recruiters.length} Recruiter Network{recruiters.length !== 1 ? 's' : ''} Detected
        </span>
      </div>

      {/* Body: left + right */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '0' }}>

        {/* LEFT PANEL */}
        <div style={{
          width: '360px', minWidth: '360px',
          borderRight: '1px solid var(--border-default)',
          overflowY: 'auto',
          padding: '0 12px 16px 0',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
            marginBottom: '12px' }}>
            Sorted by Scale ↓
          </div>

          {error && recruiters.length === 0 && (
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--heat-1)',
              padding: '8px 12px', background: 'var(--warning-bg)', borderRadius: '8px',
              marginBottom: '12px' }}>
              Failed to load recruiter data. Using demo data.
            </div>
          )}

          {loading
            ? [0,1,2].map(i => <SkeletonCard key={i} />)
            : sorted.map((rec, i) => (
                <div key={rec.id} style={{ marginBottom: '10px' }}>
                  <RecruiterCard
                    recruiter={rec}
                    isSelected={rec.id === selectedId}
                    isFreezing={freezingId === rec.id}
                    onSelect={() => setSelectedId(rec.id)}
                    onFreezeClick={r => setModalRecruiter(r)}
                    index={i}
                  />
                </div>
              ))
          }
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px 24px' }}>
          {!selectedRecruiter ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '60%', gap: '12px' }}>
              <span style={{ fontSize: '48px', color: 'var(--text-tertiary)' }}>◈</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '14px',
                color: 'var(--text-tertiary)', textAlign: 'center' }}>
                Select a recruiter network
              </span>
            </div>
          ) : (
            <>
              {/* Right panel sub-header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <RecruiterClassBadge classification={selectedRecruiter.classification} size="lg" />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600,
                      fontVariationSettings: "'opsz' 20, 'WONK' 0", color: 'var(--text-primary)' }}>
                      {selectedRecruiter.holderName}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {selectedRecruiter.accountId}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%',
                    background: STATUS_DOT[selectedRecruiter.status] || 'var(--text-tertiary)' }} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                    {selectedRecruiter.status}
                  </span>
                </div>
              </div>

              <CampaignStats recruiter={selectedRecruiter} />
              <CampaignGraph key={selectedId} recruiter={selectedRecruiter} />
            </>
          )}
        </div>
      </div>

      {/* Freeze modal */}
      <AnimatePresence>
        {modalRecruiter && (
          <FreezeConfirmModal
            key="freeze-modal"
            recruiter={modalRecruiter}
            isFreezing={freezingId === modalRecruiter.id}
            onConfirm={() => {
              freezeCampaign(modalRecruiter.id);
              setModalRecruiter(null);
            }}
            onDismiss={() => setModalRecruiter(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
