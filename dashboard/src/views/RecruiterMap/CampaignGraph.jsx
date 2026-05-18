import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function getCSSVar(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}
function heatColor(score) {
  if (score >= 85) return 'var(--heat-4)';
  if (score >= 75) return 'var(--heat-3)';
  if (score >= 60) return 'var(--heat-2)';
  if (score >= 40) return 'var(--heat-1)';
  return 'var(--heat-0)';
}
function nodeRadius(score) {
  if (score >= 85) return 20;
  if (score >= 75) return 17;
  if (score >= 60) return 14;
  return 12;
}

export function CampaignGraph({ recruiter }) {
  const svgRef       = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { node, x, y }

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !recruiter) return;

    const width  = containerRef.current.clientWidth  || 800;
    const height = 480;
    const svg    = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    /* CSS vars — read inside effect */
    const accent      = getCSSVar('--accent');
    const bgBase      = getCSSVar('--bg-base');
    const borderStrong= getCSSVar('--border-strong');

    /* Deep-clone data — D3 mutates in place */
    const recruiterNode = {
      id: recruiter.id, type: 'RECRUITER', label: recruiter.holderName,
      subLabel: recruiter.accountId, classification: recruiter.classification,
      score: null, status: recruiter.status, isRecruiter: true,
    };
    const accountNodes = recruiter.accounts.map(a => ({
      id: a.id, type: 'MULE', label: a.name, subLabel: a.id,
      score: a.score, status: a.status, txnCount: a.txnCount, amount: a.amount,
      isRecruiter: false,
    }));
    const nodes = [recruiterNode, ...accountNodes];
    const links = accountNodes.map(a => ({ source: recruiter.id, target: a.id, txnCount: a.txnCount }));

    /* Simulation */
    const sim = d3.forceSimulation(nodes)
      .force('link',      d3.forceLink(links).id(d => d.id).distance(110).strength(0.8))
      .force('charge',    d3.forceManyBody().strength(-320))
      .force('center',    d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(36))
      .alphaDecay(0.03);

    /* Links */
    const link = svg.append('g').selectAll('line').data(links).enter().append('line')
      .style('stroke', borderStrong)
      .style('stroke-width', d => Math.max(1, Math.log(d.txnCount + 1)))
      .style('stroke-opacity', 0.5)
      .attr('stroke-dasharray', d => {
        const tgt = nodes.find(n => n.id === d.target);
        return tgt?.status === 'FROZEN' ? '4 3' : 'none';
      });

    /* Node groups */
    const nodeGroup = svg.append('g').selectAll('g').data(nodes).enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    /* Recruiter diamond */
    const diamondSymbol = d3.symbol().type(d3.symbolDiamond).size(900);
    nodeGroup.filter(d => d.isRecruiter).append('path')
      .attr('d', diamondSymbol)
      .style('fill', accent).style('stroke', bgBase).style('stroke-width', 2);

    /* Mule circles */
    nodeGroup.filter(d => !d.isRecruiter).append('circle')
      .attr('r', d => nodeRadius(d.score))
      .style('fill',         d => d.status === 'FROZEN' ? 'var(--bg-subtle)' : heatColor(d.score))
      .style('fill-opacity', d => d.status === 'FROZEN' ? 0.5 : 0.85)
      .style('stroke',       d => heatColor(d.score))
      .style('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.status === 'FROZEN' ? '3 2' : 'none')
      .style('stroke-opacity', d => d.status === 'FROZEN' ? 0.4 : 1);

    /* Mule labels */
    nodeGroup.filter(d => !d.isRecruiter).append('text')
      .text(d => d.subLabel.slice(-7))
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius(d.score) + 14)
      .style('font-family', 'var(--font-mono)').style('font-size', '8px')
      .style('fill', 'var(--text-tertiary)').style('pointer-events', 'none');

    /* Recruiter label */
    nodeGroup.filter(d => d.isRecruiter).append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle').attr('dy', -26)
      .style('font-family', 'var(--font-ui)').style('font-size', '11px')
      .style('font-weight', '600').style('fill', 'var(--accent)')
      .style('pointer-events', 'none');

    /* Entry animations */
    nodeGroup.attr('opacity', 0)
      .attr('transform', `translate(${width / 2}, ${height / 2})`)
      .transition().delay((_, i) => i * 35).duration(380)
      .ease(d3.easeBackOut.overshoot(0.6)).attr('opacity', 1);

    link.attr('opacity', 0).transition()
      .delay(nodes.length * 35 + 100).duration(300).attr('opacity', 1);

    /* Hover tooltip (mule nodes only) */
    nodeGroup.filter(d => !d.isRecruiter)
      .on('mouseover', (e, d) => {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltip({ node: d, x: e.clientX - rect.left, y: e.clientY - rect.top });
      })
      .on('mousemove', (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : prev);
      })
      .on('mouseout', () => setTooltip(null));

    /* Tick */
    sim.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeGroup.attr('transform', d => `translate(${d.x ?? width/2},${d.y ?? height/2})`);
    });

    return () => sim.stop();
  }, [recruiter]);

  const overflow = recruiter
    ? Math.max(0, recruiter.downtreamCount - recruiter.accounts.length)
    : 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '480px',
      background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-default)',
      overflow: 'hidden' }}>

      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* "+N more" label */}
      {overflow > 0 && (
        <div style={{ position: 'absolute', top: 12, right: 14,
          fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>
          +{overflow} more accounts
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 14 > (containerRef.current?.clientWidth ?? 800) - 180
            ? tooltip.x - 174 : tooltip.x + 14,
          top:  tooltip.y + 14 > 380 ? tooltip.y - 130 : tooltip.y + 14,
          background:   'var(--bg-elevated)', border: '1px solid var(--border-strong)',
          borderRadius: '8px', padding: '10px 14px',
          boxShadow:    '0 4px 16px rgba(0,0,0,0.08)',
          minWidth:     '160px', pointerEvents: 'none', zIndex: 100,
          fontFamily:   'var(--font-ui)',
        }}>
          <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>
            {tooltip.node.label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
            {tooltip.node.subLabel}
          </div>
          {[
            { k: 'Score',  v: tooltip.node.score,   c: heatColor(tooltip.node.score),   ff: 'var(--font-mono)' },
            { k: 'Status', v: tooltip.node.status,  c: tooltip.node.status === 'FROZEN' ? 'var(--heat-4)' : 'var(--heat-0)', ff: 'var(--font-ui)' },
            { k: 'Txns',   v: tooltip.node.txnCount, c: 'var(--text-secondary)', ff: 'var(--font-mono)' },
            { k: 'Amount', v: `₹${(tooltip.node.amount/1000).toFixed(0)}K`, c: 'var(--text-secondary)', ff: 'var(--font-mono)' },
          ].map(row => (
            <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{row.k}</span>
              <span style={{ fontFamily: row.ff, color: row.c, fontWeight: 500 }}>{row.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
