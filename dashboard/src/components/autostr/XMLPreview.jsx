import React, { useState, useEffect } from 'react';
import styles from './XMLPreview.module.css';

const XMLPreview = ({ pkg, warmthScore, caseId, accountId }) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const isXML = pkg.id === 'FIU_STR';
  const isCBI = pkg.id === 'CBI_PACKAGE';
  const isRBI = pkg.id === 'RBI_REPORT';

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleLines(prev => {
          if (prev < 15) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, 100);
      return () => clearInterval(interval);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const renderXML = () => (
    <div className={styles.xmlLines}>
      <div className={styles.line}><span className={styles.tag}>{'<?xml'}</span> <span className={styles.attr}>version</span>=<span className={styles.val}>"1.0"</span> <span className={styles.attr}>encoding</span>=<span className={styles.val}>"UTF-8"</span><span className={styles.tag}>{'?>'}</span></div>
      <div className={styles.line}><span className={styles.tag}>{'<FIUReport'}</span> <span className={styles.attr}>version</span>=<span className={styles.val}>"2.0"</span></div>
      <div className={styles.line} style={{ paddingLeft: '12px' }}><span className={styles.attr}>xmlns</span>=<span className={styles.val}>"urn:fiu-ind:str:2.0"</span><span className={styles.tag}>{'>'}</span></div>
      <div className={styles.line} style={{ paddingLeft: '12px' }}><span className={styles.tag}>{'<Header>'}</span></div>
      <div className={styles.line} style={{ paddingLeft: '24px' }}><span className={styles.tag}>{'<ReportType>'}</span>STR<span className={styles.tag}>{'</ReportType>'}</span></div>
      <div className={styles.line} style={{ paddingLeft: '24px' }}><span className={styles.tag}>{'<ReportingEntity>'}</span>UNION_BANK_OF_INDIA<span className={styles.tag}>{'</ReportingEntity>'}</span></div>
      <div className={styles.line} style={{ paddingLeft: '24px' }}><span className={styles.tag}>{'<ReportReference>'}</span>{caseId}<span className={styles.tag}>{'</ReportReference>'}</span></div>
      <div className={styles.line} style={{ paddingLeft: '12px' }}><span className={styles.tag}>{'</Header>'}</span></div>
      <div className={styles.line} style={{ paddingLeft: '12px' }}><span className={styles.tag}>{'<SAPTRN>'}</span></div>
      <div className={styles.line} style={{ paddingLeft: '24px' }}><span className={styles.tag}>{'<AccountID>'}</span>{accountId}<span className={styles.tag}>{'</AccountID>'}</span></div>
      <div className={styles.line} style={{ paddingLeft: '24px' }}><span className={styles.tag}>{'<SuspicionScore>'}</span>{warmthScore}<span className={styles.tag}>{'</SuspicionScore>'}</span></div>
      <div className={styles.line} style={{ paddingLeft: '24px' }}><span className={styles.tag}>{'<DetectionEngine>'}</span>PRISM-V2<span className={styles.tag}>{'</DetectionEngine>'}</span></div>
      <div className={styles.line} style={{ paddingLeft: '12px' }}><span className={styles.tag}>{'</SAPTRN>'}</span></div>
      <div className={styles.line}><span className={styles.tag}>{'</FIUReport>'}</span></div>
      <div className={styles.line} style={{ color: 'var(--instrument-ghost)' }}>...</div>
    </div>
  );

  const renderCBI = () => (
    <div className={styles.textLines}>
      <div className={styles.line}>01 · COVER SHEET & CASE SUMMARY ····· P.1</div>
      <div className={styles.line}>02 · WARMTHSCORE SIGNAL BREAKDOWN ····· P.2</div>
      <div className={styles.line}>03 · COMPLETE TRANSACTION LINEAGE ····· P.3</div>
      <div className={styles.line}>04 · DEVICE TIMELINE & IMEI LOG ····· P.4</div>
      <div className={styles.line}>05 · FLOWGRAPH NETWORK EXPORT ····· P.5</div>
      <div className={styles.line}>06 · CONNECTED ACCOUNT DETAIL ····· P.6</div>
      <div className={styles.line}>07 · SC WRIT 03/2025 STATEMENT ····· P.7</div>
    </div>
  );

  const renderRBI = () => (
    <div className={styles.textLines}>
      <div className={styles.line}>FRAUD_EVENT_TYPE ····· MULE_NETWORK</div>
      <div className={styles.line}>WARMTHSCORE_AT_DETECTION ····· {warmthScore}</div>
      <div className={styles.line}>ACCOUNTS_IN_NETWORK ····· 14</div>
      <div className={styles.line}>ESTIMATED_EXPOSURE ····· ₹2,48,000</div>
      <div className={styles.line}>DETECTION_CHANNEL ····· PRISM-V2</div>
      <div className={styles.line}>REPORTING_BANK ····· UNION_BANK</div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.scanline} />
      <div className={styles.content}>
        {isXML && renderXML()}
        {isCBI && renderCBI()}
        {isRBI && renderRBI()}
      </div>
      <div className={styles.footer}>
        {isXML ? 'ADDITIONAL NODES NOT SHOWN · FULL FILE: 847 KB' : 'SECTION MAPPING COMPLETE · PDF PREPARED'}
      </div>
    </div>
  );
};

export default XMLPreview;
