import React, { useState } from 'react';
import { useAutoSTRGeneration } from './useAutoSTRGeneration';
import PackageCard from './PackageCard';
import GenerationFeed from './GenerationFeed';
import styles from './AutoSTRPanel.module.css';

const AutoSTRPanel = ({ caseId = 'CASE-UBI-2026-0847', accountId = 'UBI-2026-DEMO-001', warmthScore = 87.4 }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const {
    packages,
    allComplete,
    generationStartedAt,
    triggerGeneration,
    feedMessages
  } = useAutoSTRGeneration({
    caseId,
    accountId,
    warmthScore,
    autoTrigger: true // Start generating on mount
  });

  const formattedStartTime = generationStartedAt ? new Date(generationStartedAt).toLocaleTimeString('en-GB', { hour12: false }) : '--:--:--';

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.uiText}>AUTOSTR v2 · EVIDENCE GENERATION</span>
          <span className={styles.monoText}>{caseId}</span>
        </div>
        <div className={styles.divider} />
      </header>

      <div className={styles.metadataArea}>
        <div className={styles.metaRow}>
          <div className={styles.metaCell}>
            <span className={styles.label}>CASE</span>
            <span className={styles.monoValue}>{caseId}</span>
          </div>
          <div className={styles.metaCell}>
            <span className={styles.label}>ACCOUNT</span>
            <span className={styles.monoValue}>{accountId}</span>
          </div>
          <div className={styles.metaCell}>
            <span className={styles.label}>INITIATED</span>
            <span className={styles.monoValue}>{formattedStartTime} IST</span>
          </div>
        </div>
        <div className={styles.scoreCell}>
          <span className={styles.label}>WARMTHSCORE</span>
          <span className={styles.scoreValue}>{warmthScore}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <main className={styles.packageGrid}>
        {Object.values(packages).map(pkg => (
          <PackageCard 
            key={pkg.id} 
            pkg={pkg} 
            warmthScore={warmthScore}
            caseId={caseId}
            accountId={accountId}
          />
        ))}
      </main>

      <div className={styles.divider} />

      <GenerationFeed messages={feedMessages} allComplete={allComplete} />

      {allComplete && (
        <section className={styles.completionSection}>
          <div className={styles.scanline} />
          
          <div className={styles.timingSummary}>
            <div className={styles.timingCell}>
              <span className={styles.timingLabel}>FIRST SIGNAL</span>
              <span className={styles.timingValue}>HOUR 0</span>
            </div>
            <div className={styles.timingCell}>
              <span className={styles.timingLabel}>ACCOUNT RESTRICTED</span>
              <span className={styles.timingValue}>HOUR 60</span>
            </div>
            <div className={styles.timingCell}>
              <span className={styles.timingLabel}>FRAUD DETECTED</span>
              <span className={styles.timingValue}>HOUR 72</span>
            </div>
            <div className={styles.timingCell} style={{ borderRight: 'none' }}>
              <span className={styles.timingLabel}>PACKAGES READY</span>
              <span className={styles.timingValue} style={{ color: 'var(--phosphor)' }}>H72 + 47M</span>
            </div>
          </div>

          <button 
            className={styles.submitBtn}
            onClick={() => setIsSubmitted(true)}
          >
            SUBMIT ALL TO AUTHORITIES
          </button>
          
          <div className={styles.footerNote}>
            THIS ACTION SUBMITS ALL THREE PACKAGES TO THEIR RESPECTIVE AUTHORITIES SIMULTANEOUSLY. REQUIRES MLRO APPROVAL.
          </div>
        </section>
      )}
    </div>
  );
};

export default AutoSTRPanel;
