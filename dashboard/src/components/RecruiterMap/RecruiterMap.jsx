import React, { useState, useEffect, useCallback, useRef } from 'react';
import RecruiterMapCanvas from './RecruiterMapCanvas';
import CampaignScaleBadge from './CampaignScaleBadge';
import GraphControls from '../FlowGraph/GraphControls';
import NodeTooltip from '../FlowGraph/NodeTooltip';
import { fetchRecruiterMap } from '../../api/client';
import './RecruiterMap.css';

const RecruiterMap = () => {
  const [mapData, setMapData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [statusMessage, setStatusMessage] = useState('');
  const [teletypeText, setTeletypeText] = useState('');

  const canvasRef = useRef(null);

  const loadMap = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchRecruiterMap();
      setMapData(data);
      const defaultStatus = `RECRUITER MAP · ${data.summary.total_recruiters} COORDINATORS ACTIVE · ${data.summary.total_warming_accounts} WARMING ACCOUNTS · CAMPAIGN STARTED 47H AGO`;
      setStatusMessage(defaultStatus);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  // Teletype Effect
  useEffect(() => {
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

  const handleIdentifyScale = (scale) => {
    const recruiter = mapData.recruiters.find(r => r.campaign_scale === scale);
    if (!recruiter) return;
    
    canvasRef.current.highlightCluster(recruiter.id);
    setSelectedNode(recruiter);
    setActiveFilter(scale);
    setStatusMessage(`${scale} NETWORK ISOLATED · ${recruiter.warming_account_count} ACCOUNTS IDENTIFIED · CAMPAIGN COORDINATOR ${recruiter.account_id} · RESTRICT OUTBOUND ABOVE ₹5,000 IMMEDIATELY`);
  };

  if (isLoading && !mapData) {
    return (
      <div className="recruiter-map">
        <div className="loading-state" style={{ padding: '48px' }}>
          <div className="breathing-line" style={{ height: '1px', backgroundColor: 'var(--phosphor)', animation: 'phosphorBreathe 1s infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="recruiter-map">
      <header className="recruiter-map__header">
        <span className="font-ui ghost-text" style={{ fontSize: '10px' }}>RECRUITER MAP</span>
        
        <div className="scale-filters">
          {['ALL', 'COORDINATOR', 'ORCHESTRATOR'].map(scale => (
            <button 
              key={scale}
              className={`scale-filter-btn ${activeFilter === scale ? 'scale-filter-btn--active' : ''}`}
              onClick={() => {
                if (scale === 'ALL') {
                  setActiveFilter('ALL');
                  setStatusMessage(`RECRUITER MAP · 2 COORDINATORS ACTIVE · 31 WARMING ACCOUNTS`);
                } else {
                  handleIdentifyScale(scale);
                }
              }}
            >
              {scale}
            </button>
          ))}
        </div>
      </header>

      <main className="recruiter-map__canvas-area">
        {mapData && (
          <>
            <RecruiterMapCanvas 
              ref={canvasRef}
              data={mapData}
              onNodeSelect={(node, pos) => {
                setSelectedNode(node);
                if (pos) setTooltipPos(pos);
              }}
              highlightMode={activeFilter}
              onZoomChange={setZoomLevel}
            />
            <CampaignScaleBadge summary={mapData.summary} />
            
            <div style={{ position: 'absolute', bottom: '60px', left: '24px', z-index: 50 }}>
              <GraphControls 
                zoomLevel={zoomLevel}
                onZoomIn={() => canvasRef.current.zoomIn()}
                onZoomOut={() => canvasRef.current.zoomOut()}
                onZoomFit={() => canvasRef.current.zoomFit()}
                activeFilter={activeFilter}
                onFilterChange={(f) => {
                  if (f === 'ALL') setActiveFilter('ALL');
                  else handleIdentifyScale(f);
                }}
                onIdentifyRecruiter={() => handleIdentifyScale('ORCHESTRATOR')}
              />
            </div>
          </>
        )}

        {selectedNode && (
          <NodeTooltip 
            node={selectedNode} 
            position={tooltipPos} 
            onClose={() => setSelectedNode(null)} 
          />
        )}
      </main>

      <footer className="recruiter-map__status-bar">
        {teletypeText}
      </footer>
    </div>
  );
};

export default RecruiterMap;
