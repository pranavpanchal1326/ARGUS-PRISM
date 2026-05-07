import React, { useState, useEffect, useCallback } from 'react';
import XMLViewer from './XMLViewer';
import CBIPackageViewer from './CBIPackageViewer';
import RBIReportViewer from './RBIReportViewer';
import { fetchAutoSTRPackages } from '../../api/client';
import './AutoSTRPreview.css';

const AutoSTRPreview = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('FIU_XML');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [teletypeText, setTeletypeText] = useState('');
  const [isTabSwitching, setIsTabSwitching] = useState(false);

  const loadPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchAutoSTRPackages('CASE-UBI-2026-0847');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setIsTabSwitching(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTabSwitching(false);
    }, 90);
  };

  useEffect(() => {
    if (!statusMessage) {
      setTeletypeText('');
      return;
    }
    let index = 0;
    let currentText = '';
    setTeletypeText('');
    const interval = setInterval(() => {
      if (index < statusMessage.length) {
        const char = statusMessage[index];
        if (char !== undefined) {
          currentText += char;
          setTeletypeText(currentText);
        }
        index++;
      } else {
        clearInterval(interval);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [statusMessage]);

  const handleDownload = () => {
    setStatusMessage(`PDF PACKAGE READY FOR DOWNLOAD · CASE CBI-PRISM-2026-0847 · 14 PAGES · SHA-256 VERIFIED`);
  };

  if (isLoading && !data) {
    return (
      <div className="autostr-preview">
        <div className="loading-state" style={{ padding: '48px' }}>
          <div className="breathing-line" style={{ height: '1px', backgroundColor: 'var(--phosphor)', animation: 'phosphorBreathe 1s infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="autostr-preview">
      <header className="autostr-preview__header">
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span className="font-ui ghost-text" style={{ fontSize: '10px' }}>AUTOSTR PREVIEW</span>
          <div className="autostr-preview__case">
            CASE-UBI-2026-0847 · <span className="phosphor-text">PENDING MLRO APPROVAL</span>
          </div>
        </div>
        
        <div className="status-badge">
          <div className="status-badge__dot" />
          <span className="status-badge__text">AWAITING APPROVAL</span>
        </div>
      </header>

      <nav className="autostr-preview__tab-bar">
        {[
          { id: 'FIU_XML', label: 'FIU-IND XML' },
          { id: 'CBI_PACKAGE', label: 'CBI EVIDENCE PACKAGE' },
          { id: 'RBI_REPORT', label: 'RBI REGULATORY REPORT' }
        ].map(tab => (
          <button 
            key={tab.id}
            className={`autostr-tab ${activeTab === tab.id ? 'autostr-tab--active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className={`autostr-preview__content ${isTabSwitching ? 'tab-content--exiting' : 'tab-content--entering'}`}>
        <div className="classified-watermark">CLASSIFIED · CBI-PRISM</div>
        {activeTab === 'FIU_XML' && <XMLViewer xml={data.fiu_xml} />}
        {activeTab === 'CBI_PACKAGE' && <CBIPackageViewer data={data.cbi_package} />}
        {activeTab === 'RBI_REPORT' && <RBIReportViewer data={data.rbi_report} />}
      </main>

      <footer className="autostr-preview__action-bar">
        <div className="font-data ghost-text" style={{ fontSize: '9px' }}>
          {teletypeText || `FIU-IND XML GENERATED ${data.generated_at}`}
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="action-btn action-btn--disabled" title="MLRO WORKFLOW — PHASE 9A">
            APPROVE + SUBMIT TO FIU-IND
          </button>
          <button className="action-btn action-btn--primary" onClick={handleDownload}>
            DOWNLOAD CBI PACKAGE
          </button>
          <button className="action-btn action-btn--disabled">
            SCHEDULE RBI REPORT
          </button>
        </div>
      </footer>
    </div>
  );
};

export default AutoSTRPreview;
