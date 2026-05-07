import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';

const RECRUITER_SIZES = {
  COORDINATOR:  { w: 56, h: 56 },
  ORCHESTRATOR: { w: 72, h: 72 },
  PLATFORM:     { w: 92, h: 92 },
};

const WARMING_SIZES = {
  WARMING:  { w: 18, h: 18 },
  HOT:      { w: 22, h: 22 },
  CRITICAL: { w: 26, h: 26 },
  IMMINENT: { w: 30, h: 30 },
};

const RecruiterMapCanvas = forwardRef(({ data, onNodeSelect, highlightMode, onZoomChange }, ref) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);
  const respirationRef = useRef(null);

  useImperativeHandle(ref, () => ({
    zoomIn: () => d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.4),
    zoomOut: () => d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1 / 1.4),
    zoomFit: () => {
      const bounds = d3.select(svgRef.current).select('g.main-group').node().getBBox();
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const scale = Math.min(width / (bounds.width + 120), height / (bounds.height + 120));
      const translate = [
        (width - scale * (bounds.x * 2 + bounds.width)) / 2,
        (height - scale * (bounds.y * 2 + bounds.height)) / 2
      ];
      d3.select(svgRef.current).transition().duration(500).call(
        zoomRef.current.transform, 
        d3.zoomIdentity.translate(...translate).scale(scale)
      );
    },
    highlightCluster: (recruiterId) => {
      const svg = d3.select(svgRef.current);
      const allNodes = svg.selectAll('g.node');
      const allEdges = svg.selectAll('line.edge');

      allNodes.transition().duration(300).style('opacity', d => (d.id === recruiterId || d.recruiter_id === recruiterId || d.secondary_recruiter_id === recruiterId) ? 1 : 0.1);
      allEdges.transition().duration(300).style('opacity', d => (d.source.id === recruiterId || d.target.id === recruiterId) ? 1 : 0.1);

      // Flash effect
      const clusterNodes = allNodes.filter(d => d.id === recruiterId || d.recruiter_id === recruiterId || d.secondary_recruiter_id === recruiterId);
      clusterNodes.transition().delay(300).duration(150).style('opacity', 0.3).transition().duration(150).style('opacity', 1);
    }
  }));

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const mainGroup = svg.append('g').attr('class', 'main-group');

    // Deep Enhancement: Background Radial Grid
    const gridGroup = mainGroup.append('g').attr('class', 'radial-grid');
    [r1, r2].forEach(r => {
      if (!r) return;
      for (let i = 1; i <= 3; i++) {
        gridGroup.append('circle')
          .attr('cx', r.x)
          .attr('cy', r.y)
          .attr('r', i * 60)
          .attr('fill', 'none')
          .attr('stroke', 'var(--instrument-ghost)')
          .attr('stroke-width', 0.5)
          .attr('stroke-dasharray', '2 4');
      }
    });

    const edgeGroup = mainGroup.append('g').attr('class', 'edges');
    const nodeGroup = mainGroup.append('g').attr('class', 'nodes');

    const allNodes = [...data.recruiters, ...data.warming_accounts];
    const edges = data.edges;

    // Pre-position recruiters
    const r1 = allNodes.find(n => n.id === 'r1');
    const r2 = allNodes.find(n => n.id === 'r2');
    if (r1) { r1.x = width * 0.3; r1.y = height * 0.5; }
    if (r2) { r2.x = width * 0.7; r2.y = height * 0.5; }

    // Simulation
    const simulation = d3.forceSimulation(allNodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(d => 80 + (d.target.warmth_score / 100) * 40).strength(0.8))
      .force('charge', d3.forceManyBody().strength(d => d.node_type === 'RECRUITER' ? -800 : -60))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.node_type === 'RECRUITER' ? 120 : 28))
      .force('radial', d3.forceRadial(
        d => d.node_type === 'RECRUITER' ? 0 : 90,
        d => {
          if (d.node_type === 'WARMING_TARGET') {
            const recruiter = allNodes.find(n => n.id === d.recruiter_id);
            return recruiter ? recruiter.x || width / 2 : width / 2;
          }
          return width / 2;
        },
        d => {
          if (d.node_type === 'WARMING_TARGET') {
            const recruiter = allNodes.find(n => n.id === d.recruiter_id);
            return recruiter ? recruiter.y || height / 2 : height / 2;
          }
          return height / 2;
        }
      ).strength(0.15))
      .alphaDecay(0.015)
      .velocityDecay(0.45);

    simulationRef.current = simulation;

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
        onZoomChange(event.transform.k.toFixed(1));
        nodeGroup.selectAll('text.node-label').style('visibility', event.transform.k > 1.2 ? 'visible' : 'hidden');
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    // Edges
    const edgeLines = edgeGroup.selectAll('line.edge')
      .data(edges)
      .enter()
      .append('line')
      .attr('class', 'edge')
      .attr('stroke', 'var(--instrument-dark)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 4')
      .style('opacity', 0.5);

    // Deep Enhancement: Flow Particles
    const particles = edgeGroup.selectAll('circle.particle')
      .data(edges)
      .enter()
      .append('circle')
      .attr('class', 'particle')
      .attr('r', 1.2)
      .attr('fill', 'var(--phosphor)')
      .style('opacity', 0.8)
      .style('pointer-events', 'none');

    // Node Groups
    const nodes = nodeGroup.selectAll('g.node')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeSelect(d, { x: event.pageX, y: event.pageY });
      });

    // Node Bodies
    nodes.each(function(d) {
      const el = d3.select(this);
      const isRecruiter = d.node_type === 'RECRUITER';
      const size = isRecruiter ? RECRUITER_SIZES[d.campaign_scale] : WARMING_SIZES[d.severity];

      if (isRecruiter && d.campaign_scale === 'ORCHESTRATOR') {
        el.append('rect')
          .attr('class', 'outer-rect')
          .attr('x', -size.w / 2 - 4)
          .attr('y', -size.h / 2 - 4)
          .attr('width', size.w + 8)
          .attr('height', size.h + 8)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(184,255,107,0.3)')
          .attr('stroke-width', 1);
      }

      el.append('rect')
        .attr('class', 'node-body')
        .attr('x', -size.w / 2)
        .attr('y', -size.h / 2)
        .attr('width', size.w)
        .attr('height', size.h)
        .attr('fill', d.severity === 'IMMINENT' ? 'var(--phosphor)' : 'var(--void)')
        .attr('stroke', isRecruiter ? 'var(--phosphor)' : (d.severity === 'CRITICAL' ? 'var(--phosphor)' : 'var(--instrument-dark)'))
        .attr('stroke-width', isRecruiter ? 1.5 : 1);

      if (d.is_shared) {
        el.append('rect')
          .attr('x', -size.w / 2 - 6)
          .attr('y', -size.h / 2 - 6)
          .attr('width', size.w + 12)
          .attr('height', size.h + 12)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(184,255,107,0.4)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3 3');
      }

      if (isRecruiter) {
        // Labels for Recruiter
        el.append('text')
          .attr('y', -(size.h / 2 + 16))
          .attr('text-anchor', 'middle')
          .style('font-family', 'Inter')
          .style('font-size', '8px')
          .style('letter-spacing', '0.12em')
          .style('fill', 'var(--phosphor)')
          .text(d.campaign_scale);

        el.append('text')
          .attr('y', -4)
          .attr('text-anchor', 'middle')
          .style('font-family', 'JetBrains Mono')
          .style('font-size', '9px')
          .style('fill', 'var(--phosphor)')
          .text(d.label);

        const countText = el.append('text')
          .attr('y', 14)
          .attr('text-anchor', 'middle')
          .style('font-family', 'Monument Extended')
          .style('font-size', '14px')
          .style('fill', 'var(--phosphor)')
          .text('× 0');

        // Animate count
        let count = 0;
        const target = d.warming_account_count;
        const interval = setInterval(() => {
          if (count >= target) {
            countText.text(`× ${target}`);
            clearInterval(interval);
          } else {
            countText.text(`× ${Math.floor(Math.random() * target)}`);
            count++;
          }
        }, 50);
      } else {
        // Label for Warming Account (Zoom dependent)
        el.append('text')
          .attr('class', 'node-label')
          .attr('y', size.h / 2 + 12)
          .attr('text-anchor', 'middle')
          .style('font-family', 'JetBrains Mono')
          .style('font-size', '8px')
          .style('fill', d.severity === 'IMMINENT' ? 'var(--void)' : 'var(--instrument-grey)')
          .style('visibility', 'hidden')
          .text(d.is_shared ? `${d.label} SHARED` : d.label);
      }
    });

    simulation.on('tick', () => {
      edgeLines
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      nodes.attr('transform', d => `translate(${d.x},${d.y})`);

      particles
        .attr('cx', d => {
          const t = (performance.now() / 2000 + d.index * 0.1) % 1;
          return d.source.x + (d.target.x - d.source.x) * t;
        })
        .attr('cy', d => {
          const t = (performance.now() / 2000 + d.index * 0.1) % 1;
          return d.source.y + (d.target.y - d.source.y) * t;
        });
    });

    // Respiration Loop
    let startTime = null;
    const respTick = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const t = (timestamp - startTime) / 1000;

      nodes.each(function(d) {
        const rect = d3.select(this).select('rect.node-body');
        const freq = d.respiration_hz || (d.severity === 'CRITICAL' ? 1.2 : 0.5);

        if (d.node_type === 'RECRUITER') {
          let op;
          if (d.campaign_scale === 'PLATFORM') {
            op = 0.7 + Math.sin(2 * Math.PI * 2.0 * t) * 0.2 + Math.sin(2 * Math.PI * 0.7 * t) * 0.1;
          } else {
            op = 0.7 + Math.sin(2 * Math.PI * freq * t) * 0.3;
          }
          rect.attr('stroke-opacity', op);
        } else {
          const fillOp = 0.05 + Math.sin(2 * Math.PI * freq * t) * 0.05;
          rect.attr('fill-opacity', d.severity === 'IMMINENT' ? 0.9 + Math.sin(2 * Math.PI * freq * t) * 0.1 : fillOp);
        }
      });

      respirationRef.current = requestAnimationFrame(respTick);
    };
    respirationRef.current = requestAnimationFrame(respTick);

    return () => {
      simulation.stop();
      cancelAnimationFrame(respirationRef.current);
    };
  }, [data]);

  return (
    <div ref={containerRef} className="recruiter-map__canvas-area">
      <svg ref={svgRef} onClick={() => onNodeSelect(null)} />
    </div>
  );
});

export default RecruiterMapCanvas;
