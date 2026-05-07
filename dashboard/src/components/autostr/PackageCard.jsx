import React from 'react';
import XMLPreview from './XMLPreview';
import styles from './PackageCard.module.css';

const PackageCard = ({ pkg, warmthScore, caseId, accountId }) => {
  const isComplete = pkg.status === 'COMPLETE';
  const isGenerating = pkg.status === 'GENERATING';
  
  // 20 segments for the progress bar
  const segments = Array.from({ length: 20 }, (_, i) => i);
  const filledSegments = Math.floor(pkg.progress / 5); // 100 / 20 = 5% per segment

  return (
    <div className={`${styles.card} ${isComplete ? styles.complete : ''}`}>
      <header className={styles.header}>
        <div className={styles.index}>{pkg.index.toString().padStart(2, '0')}</div>
        <div className={styles.titleArea}>
          <div className={styles.name}>{pkg.name}</div>
          <div className={`${styles.status} ${isGenerating ? styles.pulse : ''}`}>
            {pkg.status}
            {isGenerating && <span className={styles.dots}>...</span>}
          </div>
        </div>
      </header>

      <div className={styles.divider} />

      <div className={styles.metaSection}>
        <div className={styles.metaRow}>
          <span className={styles.label}>RECIPIENT</span>
          <span className={styles.monoValue}>{pkg.recipient}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.label}>FORMAT</span>
          <span className={styles.monoValue} style={{ fontSize: '11px' }}>{pkg.format}</span>
        </div>
        <div className={styles.metaRow} style={{ marginTop: '8px' }}>
          <span className={styles.label}>LEGAL MANDATE</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className={styles.mandateLabel}>{pkg.legalMandate}</span>
            <span className={styles.mandateDetail}>{pkg.mandateDetail}</span>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.progressSection}>
        <div className={styles.label}>GENERATION PROGRESS</div>
        <div className={styles.bar}>
          {segments.map(i => (
            <div 
              key={i} 
              className={`${styles.segment} ${i < filledSegments ? styles.filled : ''}`} 
            />
          ))}
          <span className={styles.percent}>
            {Math.floor(pkg.progress)}
            {isGenerating && <span className={styles.jitter}>.{Math.floor(Math.random() * 9)}</span>}
            %
          </span>
        </div>
        
        <div className={styles.comparison}>
          <div className={styles.compareRow}>
            <span>PREVIOUS</span>
            <span className={styles.greyText}>{pkg.previousTime}</span>
          </div>
          <div className={styles.compareRow}>
            <span>PRISM</span>
            <span className={styles.phosphorText}>{pkg.prismTime}</span>
          </div>
        </div>
      </div>

      {isComplete && (
        <>
          <div className={styles.divider} />
          <div className={styles.previewArea}>
            <XMLPreview 
              pkg={pkg} 
              warmthScore={warmthScore} 
              caseId={caseId} 
              accountId={accountId} 
            />
          </div>
          <button className={styles.downloadBtn}>
            {pkg.downloadLabel} · {pkg.fileSize}
          </button>
        </>
      )}
    </div>
  );
};

export default PackageCard;
