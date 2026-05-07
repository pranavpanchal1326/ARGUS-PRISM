import React, { useState, useEffect, useMemo } from 'react';
import FlowGraphCanvas from './FlowGraphCanvas';
import './FlowGraphView.css';

// --- MOCK DATA GENERATOR ---
const generateMockGraph = () => {
  const nodes = [
    { id: 'UBI-M-001', label: 'ACC_001', warmth_score: 88, risk_level: 'IMMINENT', node_type: 'MULE', is_confirmed_mule: true, is_recruiter: false, account_details: { branch: 'MUMBAI CENTRAL', account_type: 'SAVINGS', kyc_occupation: 'LABOURER', total_received: 1240500, total_sent: 1240000 }, taint_score: 92 },
    { id: 'UBI-M-002', label: 'ACC_002', warmth_score: 86, risk_level: 'IMMINENT', node_type: 'MULE', is_confirmed_mule: true, is_recruiter: false, account_details: { branch: 'THANE WEST', account_type: 'SAVINGS', kyc_occupation: 'UNEMPLOYED', total_received: 850000, total_sent: 845000 }, taint_score: 88 },
    { id: 'UBI-R-101', label: 'REC_101', warmth_score: 72, risk_level: 'HOT', node_type: 'RECRUITER', is_confirmed_mule: false, is_recruiter: true, account_details: { branch: 'BENGALURU', account_type: 'CURRENT', kyc_occupation: 'CONSULTANT', total_received: 5000000, total_sent: 4900000 }, taint_score: 45 },
    { id: 'UBI-H-201', label: 'ACC_201', warmth_score: 79, risk_level: 'CRITICAL', node_type: 'MULE', is_confirmed_mule: false, is_recruiter: false, account_details: { branch: 'DELHI', account_type: 'SAVINGS', kyc_occupation: 'STUDENT', total_received: 300000, total_sent: 290000 }, taint_score: 65 },
    { id: 'UBI-H-202', label: 'ACC_202', warmth_score: 82, risk_level: 'CRITICAL', node_type: 'MULE', is_confirmed_mule: false, is_recruiter: false, account_details: { branch: 'PUNE', account_type: 'SAVINGS', kyc_occupation: 'DRIVER', total_received: 450000, total_sent: 440000 }, taint_score: 72 },
    { id: 'UBI-H-203', label: 'ACC_203', warmth_score: 68, risk_level: 'HOT', node_type: 'INTERMEDIATE', is_confirmed_mule: false, is_recruiter: false, account_details: { branch: 'CHENNAI', account_type: 'SAVINGS', kyc_occupation: 'FARMER', total_received: 150000, total_sent: 145000 }, taint_score: 30 },
    { id: 'UBI-C-301', label: 'ACC_301', warmth_score: 22, risk_level: 'CLEAN', node_type: 'SOURCE', is_confirmed_mule: false, is_recruiter: false, account_details: { branch: 'MUMBAI', account_type: 'CURRENT', kyc_occupation: 'BUSINESS', total_received: 10000000, total_sent: 9900000 }, taint_score: 5 },
    { id: 'UBI-C-302', label: 'ACC_302', warmth_score: 18, risk_level: 'CLEAN', node_type: 'INTERMEDIATE', is_confirmed_mule: false, is_recruiter: false, account_details: { branch: 'MUMBAI', account_type: 'SAVINGS', kyc_occupation: 'SALARIED', total_received: 50000, total_sent: 45000 }, taint_score: 2 },
    { id: 'UBI-C-303', label: 'ACC_303', warmth_score: 31, risk_level: 'CLEAN', node_type: 'INTERMEDIATE', is_confirmed_mule: false, is_recruiter: false, account_details: { branch: 'HYDERABAD', account_type: 'SAVINGS', kyc_occupation: 'STUDENT', total_received: 20000, total_sent: 18000 }, taint_score: 12 },
    { id: 'UBI-C-304', label: 'ACC_304', warmth_score: 12, risk_level: 'CLEAN', node_type: 'DESTINATION', is_confirmed_mule: false, is_recruiter: false, account_details: { branch: 'KOLKATA', account_type: 'SAVINGS', kyc_occupation: 'RETIRED', total_received: 15000, total_sent: 5000 }, taint_score: 0 },
    { id: 'UBI-C-305', label: 'ACC_305', warmth_score: 25, risk_level: 'CLEAN', node_type: 'INTERMEDIATE', is_confirmed_mule: false, is_recruiter: false, account_details: { branch: 'JAIPUR', account_type: 'SAVINGS', kyc_occupation: 'CLERK', total_received: 80000, total_sent: 75000 }, taint_score: 8 },
    { id: 'UBI-C-306', label: 'ACC_306', warmth_score: 38, risk_level: 'WARMING', node_type: 'INTERMEDIATE', is_confirmed_mule: false, is_recruiter: false, account_details: { branch: 'SURAT', account_type: 'SAVINGS', kyc_occupation: 'TRADER', total_received: 120000, total_sent: 110000 }, taint_score: 15 }
  ];

  const edges = [
    { id: 'e1', source: 'UBI-R-101', target: 'UBI-M-001', amount: 150000, channel: 'UPI', timestamp: '2026-03-21T10:00:00Z', transaction_id: 'TXN001', is_suspicious: true },
    { id: 'e2', source: 'UBI-R-101', target: 'UBI-M-002', amount: 120000, channel: 'UPI', timestamp: '2026-03-21T11:00:00Z', transaction_id: 'TXN002', is_suspicious: true },
    { id: 'e3', source: 'UBI-R-101', target: 'UBI-H-201', amount: 80000, channel: 'IMPS', timestamp: '2026-03-21T12:00:00Z', transaction_id: 'TXN003', is_suspicious: true },
    { id: 'e4', source: 'UBI-R-101', target: 'UBI-H-202', amount: 95000, channel: 'UPI', timestamp: '2026-03-21T13:00:00Z', transaction_id: 'TXN004', is_suspicious: true },
    { id: 'e5', source: 'UBI-R-101', target: 'UBI-H-203', amount: 45000, channel: 'UPI', timestamp: '2026-03-21T14:00:00Z', transaction_id: 'TXN005', is_suspicious: false },
    { id: 'e6', source: 'UBI-R-101', target: 'UBI-C-306', amount: 12000, channel: 'NEFT', timestamp: '2026-03-21T15:00:00Z', transaction_id: 'TXN006', is_suspicious: false },
    { id: 'e7', source: 'UBI-C-301', target: 'UBI-R-101', amount: 2000000, channel: 'RTGS', timestamp: '2026-03-21T09:00:00Z', transaction_id: 'TXN007', is_suspicious: false },
    { id: 'e8', source: 'UBI-M-001', target: 'UBI-C-304', amount: 149000, channel: 'IMPS', timestamp: '2026-03-21T16:00:00Z', transaction_id: 'TXN008', is_suspicious: true },
    { id: 'e9', source: 'UBI-M-002', target: 'UBI-C-304', amount: 115000, channel: 'UPI', timestamp: '2026-03-21T17:00:00Z', transaction_id: 'TXN009', is_suspicious: true },
    { id: 'e10', source: 'UBI-C-302', target: 'UBI-C-303', amount: 5000, channel: 'UPI', timestamp: '2026-03-21T18:00:00Z', transaction_id: 'TXN010', is_suspicious: false },
    { id: 'e11', source: 'UBI-C-303', target: 'UBI-C-305', amount: 8000, channel: 'UPI', timestamp: '2026-03-21T19:00:00Z', transaction_id: 'TXN011', is_suspicious: false },
    { id: 'e12', source: 'UBI-C-305', target: 'UBI-C-306', amount: 12000, channel: 'NEFT', timestamp: '2026-03-21T20:00:00Z', transaction_id: 'TXN012', is_suspicious: false },
    { id: 'e13', source: 'UBI-H-201', target: 'UBI-C-304', amount: 75000, channel: 'IMPS', timestamp: '2026-03-22T08:00:00Z', transaction_id: 'TXN013', is_suspicious: false },
    { id: 'e14', source: 'UBI-H-202', target: 'UBI-C-304', amount: 90000, channel: 'UPI', timestamp: '2026-03-22T09:00:00Z', transaction_id: 'TXN014', is_suspicious: false },
    { id: 'e15', source: 'UBI-C-301', target: 'UBI-C-302', amount: 45000, channel: 'NEFT', timestamp: '2026-03-22T10:00:00Z', transaction_id: 'TXN015', is_suspicious: false },
    { id: 'e16', source: 'UBI-R-101', target: 'UBI-C-305', amount: 30000, channel: 'UPI', timestamp: '2026-03-22T11:00:00Z', transaction_id: 'TXN016', is_suspicious: false },
    { id: 'e17', source: 'UBI-M-001', target: 'UBI-M-002', amount: 50000, channel: 'UPI', timestamp: '2026-03-22T12:00:00Z', transaction_id: 'TXN017', is_suspicious: true },
    { id: 'e18', source: 'UBI-M-002', target: 'UBI-M-001', amount: 25000, channel: 'UPI', timestamp: '2026-03-22T13:00:00Z', transaction_id: 'TXN018', is_suspicious: true }
  ];

  return {
    account_id: 'UBI-2026-DEMO-GRAPH',
    graph: {
      nodes,
      edges,
      graph_metadata: {
        total_nodes: nodes.length,
        total_edges: edges.length,
        confirmed_mules: 2,
        recruiters_detected: 1,
        total_flow_value: 8655000,
        detection_timestamp: new Date().toISOString()
      }
    }
  };
};

// --- SUB-COMPONENTS ---

const GraphHeader = ({ metadata, accountId, activeFilter, onFilterChange }) => {
  return (
    <div className="graph-header">
      <div className="header-left">
        <span className="header-title">TRANSACTION NETWORK</span>
        <span className="header-subtitle">ACCOUNT ID: {accountId}</span>
      </div>

      <div className="header-stats">
        <div className="stat-block">
          <span className="stat-label">NODES</span>
          <span className="stat-value">{metadata.total_nodes}</span>
        </div>
        <div className="stat-block">
          <span className="stat-label">EDGES</span>
          <span className="stat-value">{metadata.total_edges}</span>
        </div>
        <div className="stat-block">
          <span className="stat-label">MULES CONFIRMED</span>
          <span className="stat-value" style={{ color: 'var(--phosphor)' }}>{metadata.confirmed_mules}</span>
        </div>
        <div className="stat-block">
          <span className="stat-label">FLOW VALUE</span>
          <span className="stat-value">₹{(metadata.total_flow_value / 100000).toFixed(1)}L</span>
        </div>
      </div>

      <div className="header-filters">
        {['ALL', 'MULES', 'RECRUITERS', 'HIGH_RISK'].map(f => (
          <button 
            key={f}
            className={`filter-btn ${activeFilter === f ? 'active' : ''}`}
            onClick={() => onFilterChange(f)}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  );
};

const NodeDetailPanel = ({ selectedNode, edges, onViewTimeline }) => {
  if (!selectedNode) {
    return (
      <div className="detail-panel">
        <div className="panel-placeholder">SELECT A NODE TO VIEW DETAILS</div>
      </div>
    );
  }

  const connectedEdges = edges.filter(e => 
    e.source.id === selectedNode.id || e.target.id === selectedNode.id ||
    e.source === selectedNode.id || e.target === selectedNode.id
  ).slice(0, 8);

  const getBadgeClass = (d) => {
    if (d.is_recruiter) return 'recruiter';
    if (d.is_confirmed_mule) return 'mule';
    if (d.warmth_score > 60) return 'high-risk';
    return 'clean';
  };

  const exportNode = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedNode));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `node_${selectedNode.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'var(--void)';
    if (score >= 60) return 'var(--phosphor)';
    return 'var(--instrument-white)';
  };

  const isInverted = selectedNode.warmth_score >= 85;

  return (
    <div className="detail-panel">
      <div className="panel-header">
        <div className={`type-badge ${getBadgeClass(selectedNode)}`}>
          {selectedNode.is_recruiter ? 'RECRUITER NODE' : 
           selectedNode.is_confirmed_mule ? 'CONFIRMED MULE' : 
           selectedNode.node_type + ' NODE'}
        </div>
        <div className="panel-id">{selectedNode.id}</div>
      </div>

      <div className="panel-score-block" style={{ background: isInverted ? 'var(--phosphor)' : 'transparent' }}>
        <div className="panel-score-val" style={{ color: getScoreColor(selectedNode.warmth_score) }}>
          {selectedNode.warmth_score}
        </div>
        <div className="panel-risk-label" style={{ color: isInverted ? 'var(--void)' : 'var(--instrument-grey)' }}>
          {selectedNode.risk_level} RISK PROFILE
        </div>
      </div>

      <div className="panel-details-grid">
        <div className="detail-item">
          <span className="detail-label">ACCOUNT TYPE</span>
          <span className="detail-value">{selectedNode.account_details.account_type}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">BRANCH</span>
          <span className="detail-value">{selectedNode.account_details.branch}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">OCCUPATION</span>
          <span className="detail-value">{selectedNode.account_details.kyc_occupation}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">TAINT SCORE</span>
          <span className="detail-value">{selectedNode.taint_score || 'N/A'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">RECEIVED</span>
          <span className="detail-value">₹{(selectedNode.account_details.total_received / 1000).toFixed(0)}K</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">SENT</span>
          <span className="detail-value">₹{(selectedNode.account_details.total_sent / 1000).toFixed(0)}K</span>
        </div>
      </div>

      <div className="panel-list-section">
        <div className="panel-list-title">CONNECTED TRANSACTIONS</div>
        {connectedEdges.map(e => (
          <div key={e.id} className={`txn-row ${e.is_suspicious ? 'suspicious' : ''}`}>
            <span>{e.source.id === selectedNode.id || e.source === selectedNode.id ? '↗' : '↘'}</span>
            <span>₹{e.amount.toLocaleString()}</span>
            <span>{e.channel}</span>
            <span>{new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        {edges.length > 8 && <div className="txn-row" style={{ marginTop: 8, opacity: 0.5 }}>AND {edges.length - 8} MORE...</div>}
      </div>

      <div className="panel-actions">
        <button className="action-btn" onClick={exportNode}>EXPORT NODE DATA</button>
        <button className="action-btn" onClick={() => onViewTimeline(selectedNode.id)}>VIEW ACCOUNT TIMELINE</button>
      </div>
    </div>
  );
};

const Tooltip = ({ node, position }) => {
  if (!node) return null;

  const getScoreColor = (score) => {
    if (score >= 60) return 'var(--phosphor)';
    return 'var(--instrument-white)';
  };

  return (
    <div className="graph-tooltip" style={{ left: position.x + 15, top: position.y + 15 }}>
      <div className="tooltip-id">{node.id}</div>
      <div className="tooltip-sep" />
      <div className="tooltip-score" style={{ color: getScoreColor(node.warmth_score) }}>{node.warmth_score}</div>
      <div className="tooltip-risk">{node.risk_level} RISK</div>
      <div className="tooltip-sep" />
      <div className="tooltip-detail">OCC: {node.account_details.kyc_occupation}</div>
      <div className="tooltip-detail">RECV: ₹{node.account_details.total_received.toLocaleString()}</div>
      <div className="tooltip-detail">SENT: ₹{node.account_details.total_sent.toLocaleString()}</div>
      {node.taint_score && <div className="tooltip-detail">TAINT: {node.taint_score}</div>}
      {node.is_recruiter && (
        <div className="tooltip-badge badge-recruiter">⬛ RECRUITER NODE</div>
      )}
      {node.is_confirmed_mule && (
        <div className="tooltip-badge badge-mule">⬛ CONFIRMED MULE</div>
      )}
    </div>
  );
};

// --- MAIN VIEW ---

const FlowGraphView = ({ accountId = 'UBI-2026-DEMO-GRAPH', onViewTimeline = (id) => console.log('Timeline for:', id) }) => {
  const [data, setData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [hoverNode, setHoverNode] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Simulate API fetch
    const mockResponse = generateMockGraph();
    setData(mockResponse);
  }, []);

  const handleHover = (node, event) => {
    setHoverNode(node);
    if (event) {
      setMousePos({ x: event.pageX, y: event.pageY });
    }
  };

  if (!data) return <div className="flow-graph-container"><div className="panel-placeholder">LOADING GRAPH DATA...</div></div>;

  return (
    <div className="flow-graph-container">
      <GraphHeader 
        metadata={data.graph.graph_metadata}
        accountId={data.account_id}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <div className="graph-body">
        <FlowGraphCanvas 
          graphData={data.graph}
          activeFilter={activeFilter}
          onNodeSelect={setSelectedNode}
          onHover={handleHover}
        />

        <NodeDetailPanel 
          selectedNode={selectedNode}
          edges={data.graph.edges}
          onViewTimeline={onViewTimeline}
        />
      </div>

      <Tooltip node={hoverNode} position={mousePos} />
    </div>
  );
};

export default FlowGraphView;
