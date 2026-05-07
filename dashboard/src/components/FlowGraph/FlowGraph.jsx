import React, { useState, useEffect, useCallback, useRef } from 'react';
import FlowGraphCanvas from './FlowGraphCanvas';
import GraphControls from './GraphControls';
import NodeTooltip from './NodeTooltip';
import { fetchFlowGraph } from '../../api/client';
import './FlowGraph.css';

const FlowGraph = () => {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [statusMessage, setStatusMessage] = useState('');
  const [teletypeText, setTeletypeText] = useState('');
  
  const canvasRef = useRef(null);

  const loadGraph = useCallback(async (id) => {
    setIsLoading(true);
    try {
      const data = await fetchFlowGraph(id);
      setGraphData(data);
      const defaultStatus = `FLOWGRAPH · ${data.account_id} · ${data.nodes.length} NODES · ${data.edges.length} EDGES · PATTERNS: ${data.detected_patterns.join(' · ')}`;
      setStatusMessage(defaultStatus);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph('UBI-2026-DEMO-001');
  }, [loadGraph]);

  // Teletype Effect
  useEffect(() => {
    let index = 0;
    let currentText = '';
    setTeletypeText('');
    
    const interval = setInterval(() => {
      if (index < statusMessage.length) {
        const nextChar = statusMessage[index];
        if (nextChar !== undefined) {
          currentText += nextChar;
          setTeletypeText(currentText);
        }
        index++;
      } else {
        clearInterval(interval);
      }
    }, 25);
    
    return () => {
      clearInterval(interval);
    };
  }, [statusMessage]);

  const handleIdentifyRecruiter = () => {
    if (!graphData?.recruiter_node_id) return;
    canvasRef.current.flyToRecruiter(graphData.recruiter_node_id);
    const recruiterNode = graphData.nodes.find(n => n.id === graphData.recruiter_node_id);
    setSelectedNode(recruiterNode);
    setActiveFilter('RECRUITER');
    // Force a position for the tooltip when identifying recruiter
    setTooltipPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 100 });
    setStatusMessage(`RECRUITER NODE IDENTIFIED · ${recruiterNode.account_id} · CAMPAIGN COORDINATOR · COORDINATING TEST PAYMENTS`);
  };

  if (isLoading && !graphData) {
    return (
      <div className="flowgraph">
        <div className="loading-state" style={{ padding: '48px' }}>
          <div className="breathing-line" style={{ height: '1px', backgroundColor: 'var(--phosphor)', animation: 'phosphorBreathe 1s infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flowgraph">
      <header className="flowgraph__header">
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span className="font-ui ghost-text" style={{ fontSize: '10px' }}>FLOWGRAPH</span>
          <div className="flowgraph__account-id">{graphData?.account_id}</div>
        </div>

        <div className="flowgraph__patterns">
          {graphData?.detected_patterns.map(p => (
            <div key={p} className="pattern-badge">{p}</div>
          ))}
        </div>
      </header>

      <main className="flowgraph__canvas-area">
        {graphData && (
          <FlowGraphCanvas 
            ref={canvasRef}
            data={graphData}
            onNodeSelect={(node, pos) => {
              setSelectedNode(node);
              if (pos) setTooltipPos(pos);
            }}
            selectedNode={selectedNode}
            activeFilter={activeFilter}
            onZoomChange={setZoomLevel}
          />
        )}

        <GraphControls 
          zoomLevel={zoomLevel}
          onZoomIn={() => canvasRef.current.zoomIn()}
          onZoomOut={() => canvasRef.current.zoomOut()}
          onZoomFit={() => canvasRef.current.zoomFit()}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onIdentifyRecruiter={handleIdentifyRecruiter}
        />

        {selectedNode && (
          <NodeTooltip 
            node={selectedNode} 
            position={tooltipPos} 
            onClose={() => setSelectedNode(null)} 
          />
        )}
      </main>

      <footer className="flowgraph__status-bar">
        {teletypeText}
      </footer>
    </div>
  );
};

export default FlowGraph;
