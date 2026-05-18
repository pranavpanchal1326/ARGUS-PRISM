/**
 * useForceGraph — D3 force simulation extracted from the render tree.
 * Zero React state updates inside the tick function. D3 manipulates
 * DOM directly via d3.select for 60fps performance at 50+ nodes.
 *
 * IMPORTANT: Pass memoised nodes and edges arrays.
 * useForceGraph({ nodes: useMemo(() => data.nodes, [data]), ... })
 * Unmemoised arrays will restart the simulation on every render.
 */
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function nodeRadius(d) { return 8 + (d.score / 100) * 16; }

const RECRUITER_POINTS = (d, r) => [
  `${d.x},${d.y - r}`, `${d.x + r},${d.y}`, `${d.x},${d.y + r}`, `${d.x - r},${d.y}`
].join(' ');

export default function useForceGraph({ nodes, edges, width, height, onNodeClick }) {
  const svgRef        = useRef(null);
  const simulationRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !nodes?.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    /* Inner group — zoom/pan transforms this, not the svg itself */
    const g = svg.append('g');

    /* Zoom */
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4.0])
      .on('zoom', (e) => g.attr('transform', e.transform));

    svg.call(zoom);
    svg.on('dblclick.zoom', () => {
      svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
    });

    /* Deep-clone so D3 mutation doesn't pollute React state */
    const simNodes = nodes.map(n => ({ ...n }));
    const simEdges = edges.map(e => ({ ...e }));

    /* Edges */
    const edgeSel = g.append('g').selectAll('line').data(simEdges).enter()
      .append('line')
      .attr('class', 'graph-edge')
      .style('stroke', 'var(--border-strong)')
      .style('stroke-opacity', 0.5)
      .style('stroke-width', d => Math.max(1, Math.log((d.amount || 1) / 100000 + 1)));

    /* Nodes */
    const nodeSel = g.append('g').selectAll('g').data(simNodes).enter()
      .append('g')
      .attr('class', 'graph-node-group')
      .style('cursor', 'pointer')
      .on('click', (e, d) => onNodeClick && onNodeClick(d))
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulationRef.current?.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) simulationRef.current?.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    nodeSel.each(function(d) {
      const el = d3.select(this);
      const r = nodeRadius(d);
      if (d.type === 'RECRUITER') {
        el.append('polygon')
          .attr('class', 'graph-node')
          .style('fill', 'var(--accent)')
          .style('stroke', 'var(--bg-base)')
          .style('stroke-width', 2);
      } else {
        el.append('circle')
          .attr('class', 'graph-node')
          .attr('r', 0)
          .style('fill', d.tainted ? 'var(--heat-3)' : d.score > 75 ? 'var(--heat-2)' : 'var(--heat-0)')
          .style('fill-opacity', 0.85)
          .style('stroke', 'var(--bg-base)')
          .style('stroke-width', 1.5)
          .transition().duration(400).delay((_, i) => i * 40)
          .ease(d3.easeBackOut.overshoot(0.5))
          .attr('r', r);
      }
      el.append('text')
        .text(d.label || d.id)
        .attr('text-anchor', 'middle')
        .attr('dy', r + 14)
        .style('font-family', 'var(--font-mono)')
        .style('font-size', '9px')
        .style('fill', 'var(--text-tertiary)')
        .style('pointer-events', 'none');
    });

    /* Simulation — zero setState in tick */
    const simulation = d3.forceSimulation(simNodes)
      .force('link',      d3.forceLink(simEdges).id(n => n.id).distance(80).strength(0.8))
      .force('charge',    d3.forceManyBody().strength(-200).distanceMax(300))
      .force('center',    d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(n => nodeRadius(n) + 4))
      .alphaDecay(0.02)
      .velocityDecay(0.3)
      .alpha(0.8);

    simulation.on('tick', () => {
      /* Direct DOM — no React setState */
      edgeSel
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

      nodeSel.attr('transform', d => `translate(${d.x ?? width/2},${d.y ?? height/2})`);

      /* Update recruiter polygon points dynamically */
      nodeSel.each(function(d) {
        if (d.type === 'RECRUITER') {
          const r = nodeRadius(d);
          d3.select(this).select('polygon').attr('points', RECRUITER_POINTS(d, r));
        }
      });
    });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
      svg.on('.zoom', null);
    };
  }, [nodes, edges, width, height, onNodeClick]);

  return { svgRef, simulationRef };
}
