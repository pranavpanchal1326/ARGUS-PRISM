import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { WarmthBadge, Button } from '../../components';

/* ── Stubs for motion variants (Phase 1C exports) ────────── */
const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 } };

/* ── Stub: getScoreLevel — Phase 2A export ───────────────── */
function getScoreLevel(score) {
  if (score >= 85) return { level: 'IMMINENT', heatVar: '--heat-4' };
  if (score >= 75) return { level: 'CRITICAL', heatVar: '--heat-3' };
  if (score >= 60) return { level: 'HOT',      heatVar: '--heat-2' };
  if (score >= 40) return { level: 'WARMING',  heatVar: '--heat-1' };
  return              { level: 'CLEAN',    heatVar: '--heat-0' };
}

/* ── Utility: CSS variable extractor ─────────────────────── */
function getCSSVar(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}
function getHeatColor(score) {
  if (score >= 85) return getCSSVar('--heat-4');
  if (score >= 75) return getCSSVar('--heat-3');
  if (score >= 60) return getCSSVar('--heat-2');
  if (score >= 40) return getCSSVar('--heat-1');
  return getCSSVar('--heat-0');
}
function getNodeRadius(score, isRecruiter) {
  if (isRecruiter) return 20;
  if (score >= 85) return 26;
  if (score >= 75) return 22;
  if (score >= 60) return 18;
  if (score >= 40) return 14;
  return 10;
}
function getLinkOpacity(value) {
  if (value > 1_000_000) return 0.9;
  if (value >   100_000) return 0.6;
  if (value >    10_000) return 0.4;
  return 0.2;
}
function getLinkWidth(value) { return value > 1_000_000 ? 2 : 1; }

/* ── fitToContent — defined outside component (no state deps) */
function fitToContent(svg, group, zoom, width, height) {
  try {
    const b = group.node().getBBox();
    if (!b.width || !b.height) return;
    const pad   = 48;
    const scale = Math.min((width - pad * 2) / b.width, (height - pad * 2) / b.height, 1.5);
    const tx    = width  / 2 - (b.x + b.width  / 2) * scale;
    const ty    = height / 2 - (b.y + b.height / 2) * scale;
    svg.transition().duration(600).ease(d3.easeCubicOut)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  } catch { /* SVG not yet visible */ }
}

/* ── Mock data ───────────────────────────────────────────── */
const MOCK_GRAPH_DATA = {
  nodes: [
    { id: 'UBI-2026-DEMO-001', name: 'Rajesh Kumar',         score: 84, isRecruiter: false, isFocus: true,  taintScore: 0,   primarySignal: 'Signal 4 — Dormant Reactivation',          isConfirmed: false },
    { id: 'UBI-RECV-002',      name: 'Priya Sharma',         score: 67, isRecruiter: false, isFocus: false, taintScore: 80,  primarySignal: 'Signal 1 — Test Credit',                    isConfirmed: false },
    { id: 'UBI-RECV-003',      name: 'Amit Singh',           score: 71, isRecruiter: false, isFocus: false, taintScore: 55,  primarySignal: 'Signal 2 — Device Fingerprint',             isConfirmed: false },
    { id: 'UBI-RECV-004',      name: 'Sunita Devi',          score: 45, isRecruiter: false, isFocus: false, taintScore: 30,  primarySignal: 'Signal 3 — Velocity Spike',                 isConfirmed: false },
    { id: 'UBI-COORD-001',     name: 'Coordinator Account',  score: 15, isRecruiter: true,  isFocus: false, taintScore: 0,   primarySignal: 'Recruiter — 23 downstream accounts',        isConfirmed: false },
    { id: 'UBI-CONF-001',      name: 'Confirmed Mule',       score: 92, isRecruiter: false, isFocus: false, taintScore: 100, primarySignal: 'Signal 4 + Signal 5 + Signal 6',            isConfirmed: true  },
  ],
  links: [
    { source: 'UBI-COORD-001',      target: 'UBI-2026-DEMO-001', value: 500,     channel: 'UPI',  timestamp: '2026-03-01T08:00:00Z' },
    { source: 'UBI-COORD-001',      target: 'UBI-RECV-002',      value: 300,     channel: 'UPI',  timestamp: '2026-03-01T08:05:00Z' },
    { source: 'UBI-COORD-001',      target: 'UBI-RECV-003',      value: 200,     channel: 'UPI',  timestamp: '2026-03-01T08:10:00Z' },
    { source: 'UBI-2026-DEMO-001',  target: 'UBI-RECV-004',      value: 850_000, channel: 'NEFT', timestamp: '2026-03-03T09:00:00Z' },
    { source: 'UBI-RECV-002',       target: 'UBI-CONF-001',      value: 1_200_000,channel:'RTGS', timestamp: '2026-03-03T09:15:00Z' },
    { source: 'UBI-RECV-003',       target: 'UBI-CONF-001',      value: 750_000, channel: 'NEFT', timestamp: '2026-03-03T09:20:00Z' },
  ],
};

/* ── NodeTooltip ─────────────────────────────────────────── */
function NodeTooltip({ node, position, visible }) {
  if (!visible || !node) return null;
  const isRight  = position.x > window.innerWidth  * 0.6;
  const isBottom = position.y > window.innerHeight * 0.7;
  const heatIdx  = node.score >= 85 ? 4 : node.score >= 75 ? 3 : node.score >= 60 ? 2 : node.score >= 40 ? 1 : 0;

  return (
    <motion.div {...fadeIn} transition={{ duration: 0.1 }} style={{
      position: 'fixed',
      left:   isRight  ? 'auto' : position.x + 16,
      right:  isRight  ? window.innerWidth  - position.x + 16 : 'auto',
      top:    isBottom ? 'auto' : position.y + 16,
      bottom: isBottom ? window.innerHeight - position.y + 16 : 'auto',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
      padding: '12px 16px', minWidth: '220px', maxWidth: '280px',
      zIndex: 1000, pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {node.name}
        </span>
        {node.isRecruiter
          ? <span style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)',
              background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
              borderRadius: '4px', padding: '2px 8px' }}>COORDINATOR</span>
          : <WarmthBadge score={node.score} showDot={false} />
        }
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
        {node.id}
      </div>

      {!node.isRecruiter && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 0', borderTop: '1px solid var(--border-default)' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            WarmthScore
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700,
            color: `var(--heat-${heatIdx})` }}>
            {Math.round(node.score)}
          </span>
        </div>
      )}

      {node.primarySignal && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)',
          paddingTop: '8px', borderTop: '1px solid var(--border-default)' }}>
          {node.primarySignal}
        </div>
      )}

      {node.taintScore > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between',
          paddingTop: '8px', borderTop: '1px solid var(--border-default)' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px',
            textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Taint Score</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px',
            fontWeight: 500, color: 'var(--warning)' }}>{node.taintScore}</span>
        </div>
      )}

      {node.isConfirmed && (
        <div style={{ marginTop: '8px', padding: '4px 8px', background: 'var(--danger-bg)',
          borderRadius: '4px', fontFamily: 'var(--font-ui)', fontSize: '10px',
          fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ⚠ Confirmed Mule Account
        </div>
      )}
    </motion.div>
  );
}

/* ── GraphLegend ─────────────────────────────────────────── */
function GraphLegend() {
  const items = [
    { label: 'Clean (0–40)',     heatVar: '--heat-0', shape: 'circle'  },
    { label: 'Warming (40–60)', heatVar: '--heat-1', shape: 'circle'  },
    { label: 'Hot (60–75)',     heatVar: '--heat-2', shape: 'circle'  },
    { label: 'Critical (75–85)',heatVar: '--heat-3', shape: 'circle'  },
    { label: 'Imminent (85+)',  heatVar: '--heat-4', shape: 'circle'  },
    { label: 'Coordinator',     heatVar: '--accent', shape: 'diamond' },
  ];
  return (
    <div style={{ position: 'absolute', bottom: '16px', left: '16px',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)', padding: '12px 16px', zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
        marginBottom: '8px' }}>
        Risk Level
      </div>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '8px', height: '8px', flexShrink: 0,
            borderRadius: item.shape === 'circle' ? '50%' : '2px',
            background: `var(${item.heatVar})`,
            transform: item.shape === 'diamond' ? 'rotate(45deg)' : 'none' }} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── FlowGraphView ───────────────────────────────────────── */
export function FlowGraphView({ nodes = MOCK_GRAPH_DATA.nodes, links = MOCK_GRAPH_DATA.links, onNodeSelect, className = '' }) {
  const svgRef       = useRef(null);
  const zoomRef      = useRef(null);
  const simRef       = useRef(null);
  const containerRef = useRef(null);

  const [showLabels, setShowLabels] = useState(true);
  const [tooltip,    setTooltip]    = useState({ node: null, position: { x: 0, y: 0 }, visible: false });
  const [selectedId, setSelectedId] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  /* Deep clone — D3 mutates nodes/links in-place */
  const graphData = useMemo(() => ({
    nodes: JSON.parse(JSON.stringify(nodes)),
    links: JSON.parse(JSON.stringify(links)),
  }), [nodes, links]);

  /* Track container size */
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Main D3 render ──────────────────────────────────── */
  useEffect(() => {
    if (!svgRef.current) return;
    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);

    /* Clear previous render */
    svg.selectAll('*').remove();

    /* Read CSS vars NOW — inside effect, document available */
    const c = {
      heat0:        getCSSVar('--heat-0'),
      heat1:        getCSSVar('--heat-1'),
      heat2:        getCSSVar('--heat-2'),
      heat3:        getCSSVar('--heat-3'),
      heat4:        getCSSVar('--heat-4'),
      accent:       getCSSVar('--accent'),
      bgBase:       getCSSVar('--bg-base'),
      borderStrong: getCSSVar('--border-strong'),
      textTertiary: getCSSVar('--text-tertiary'),
    };

    svg.attr('width', width).attr('height', height).style('background', c.bgBase);

    /* Arrowhead marker */
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead').attr('viewBox', '0 -5 10 10')
      .attr('refX', 20).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', c.borderStrong).attr('opacity', 0.6);

    /* Zoom */
    const zoom = d3.zoom().scaleExtent([0.3, 4])
      .on('zoom', e => mainGroup.attr('transform', e.transform));
    zoomRef.current = zoom;
    svg.call(zoom);

    const mainGroup = svg.append('g').attr('class', 'main-group');

    /* Force simulation */
    const sim = d3.forceSimulation(graphData.nodes)
      .force('link',    d3.forceLink(graphData.links).id(d => d.id)
        .distance(d => {
          const src = graphData.nodes.find(n => n.id === (d.source.id || d.source));
          return src?.isRecruiter ? 180 : 120;
        }).strength(0.6))
      .force('charge',  d3.forceManyBody().strength(d => d.isRecruiter ? -600 : -400))
      .force('center',  d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => getNodeRadius(d.score, d.isRecruiter) + 8).strength(0.8));
    simRef.current = sim;

    /* Links */
    const linkEls = mainGroup.append('g').attr('class', 'links')
      .selectAll('line').data(graphData.links).enter().append('line')
        .attr('stroke', c.borderStrong)
        .attr('stroke-width',   d => getLinkWidth(d.value))
        .attr('stroke-opacity', d => getLinkOpacity(d.value))
        .attr('marker-end', 'url(#arrowhead)');

    /* Node groups */
    const nodeGroups = mainGroup.append('g').attr('class', 'nodes')
      .selectAll('g').data(graphData.nodes).enter().append('g')
        .attr('class', d => `node-group node--${d.id.replace(/[^a-zA-Z0-9]/g, '-')}`)
        .attr('cursor', 'pointer')
        .call(d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
        );

    /* Selection rings (rendered first = below shapes) */
    nodeGroups.append('circle')
      .attr('class', 'selection-ring')
      .attr('r',           d => getNodeRadius(d.score, d.isRecruiter) + 6)
      .attr('fill',        'none')
      .attr('stroke',      c.accent)
      .attr('stroke-width', 2.5)
      .attr('opacity',     0)
      .attr('stroke-dasharray', '4 3');

    /* Shapes */
    graphData.nodes.forEach((nd, i) => {
      const safeClass = nd.id.replace(/[^a-zA-Z0-9]/g, '-');
      const g     = mainGroup.select(`.node--${safeClass}`);
      const r     = getNodeRadius(nd.score, nd.isRecruiter);
      const fill  = nd.isRecruiter ? c.accent : getHeatColor(nd.score);
      const strokeColor = nd.isConfirmed ? c.accent : (d3.color(fill)?.darker(0.3).toString() || fill);

      if (nd.isRecruiter) {
        const side = r * 1.4;
        g.append('rect')
          .attr('width', side).attr('height', side)
          .attr('x', -side / 2).attr('y', -side / 2).attr('rx', 3)
          .attr('fill', fill).attr('stroke', strokeColor).attr('stroke-width', 2)
          .attr('transform', 'rotate(45) scale(0)')
          .transition().delay(i * 40).duration(400).ease(d3.easeBackOut.overshoot(0.5))
          .attr('transform', 'rotate(45) scale(1)');
      } else {
        g.append('circle')
          .attr('r', r).attr('fill', fill)
          .attr('stroke', strokeColor).attr('stroke-width', nd.isConfirmed ? 3 : 1.5)
          .attr('transform', 'scale(0)')
          .transition().delay(i * 40).duration(400).ease(d3.easeBackOut.overshoot(0.5))
          .attr('transform', 'scale(1)');
      }
    });

    /* Labels */
    nodeGroups.append('text')
      .attr('class', 'node-label').attr('text-anchor', 'middle')
      .attr('dy', d => getNodeRadius(d.score, d.isRecruiter) + 14)
      .attr('fill', c.textTertiary)
      .attr('font-family', 'IBM Plex Mono, monospace').attr('font-size', '9px')
      .attr('pointer-events', 'none').text(d => d.id)
      .attr('opacity', showLabels ? 1 : 0);

    /* Mouse events */
    nodeGroups
      .on('mouseenter', (e, d) => {
        setTooltip({ node: d, position: { x: e.clientX, y: e.clientY }, visible: true });
        linkEls.attr('stroke-opacity', l =>
          l.source.id === d.id || l.target.id === d.id
            ? Math.min(getLinkOpacity(l.value) + 0.3, 1)
            : getLinkOpacity(l.value) * 0.3);
      })
      .on('mousemove', e => setTooltip(p => ({ ...p, position: { x: e.clientX, y: e.clientY } })))
      .on('mouseleave', () => {
        setTooltip(p => ({ ...p, visible: false }));
        linkEls.attr('stroke-opacity', l => getLinkOpacity(l.value));
      })
      .on('click', (e, d) => {
        e.stopPropagation();
        setSelectedId(prev => prev === d.id ? null : d.id);
        onNodeSelect?.(d);
        mainGroup.selectAll('.selection-ring').attr('opacity', n => n.id === d.id ? 1 : 0);
      });

    svg.on('click', () => {
      setSelectedId(null);
      mainGroup.selectAll('.selection-ring').attr('opacity', 0);
    });

    /* Tick */
    sim.on('tick', () => {
      linkEls.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
             .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    /* Auto fit after simulation settles */
    sim.on('end', () => fitToContent(svg, mainGroup, zoom, width, height));

    return () => sim.stop();
  }, [graphData, dimensions]); /* eslint-disable-line */

  /* Label toggle — isolated effect, no full re-render */
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('.node-label')
      .transition().duration(200).attr('opacity', showLabels ? 1 : 0);
  }, [showLabels]);

  const handleResetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg   = d3.select(svgRef.current);
    const group = svg.select('.main-group');
    fitToContent(svg, group, zoomRef.current, dimensions.width, dimensions.height);
  }, [dimensions]);

  const handleExport = useCallback(() => {
    if (!svgRef.current) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgRef.current)], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `prism-flowgraph-${Date.now()}.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className={`flowgraph-view ${className}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100%',
        background: 'var(--bg-base)', position: 'relative', overflow: 'hidden' }}>

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '56px', padding: '0 32px', background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700,
            color: 'var(--text-primary)', fontVariationSettings: "'opsz' 24, 'WONK' 0" }}>
            Flow Graph
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Transaction network — live
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => setShowLabels(v => !v)}>
            Labels {showLabels ? 'ON' : 'OFF'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleResetView}>Reset View</Button>
          <Button variant="ghost"     size="sm" onClick={handleExport}>Export →</Button>
        </div>
      </div>

      {/* D3 canvas */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        <GraphLegend />
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip.visible && tooltip.node && (
          <NodeTooltip node={tooltip.node} position={tooltip.position} visible={tooltip.visible} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default FlowGraphView;
