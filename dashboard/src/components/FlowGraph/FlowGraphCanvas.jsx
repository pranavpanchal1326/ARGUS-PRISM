import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';

const NODE_SIZES = {
  EXTERNAL:  { w: 16, h: 16 },
  CLEAN:     { w: 24, h: 24 },
  WARMING:   { w: 28, h: 28 },
  HOT:       { w: 32, h: 32 },
  CRITICAL:  { w: 38, h: 38 },
  IMMINENT:  { w: 44, h: 44 },
  SELECTED:  { w: 44, h: 44 },
  TAINTED:   { w: 28, h: 28 },
  RECRUITER: { w: 52, h: 52 },
};

const RESPIRATION = {
  CLEAN:     0.3,
  WARMING:   0.5,
  HOT:       0.8,
  CRITICAL:  1.2,
  IMMINENT:  1.5,
  TAINTED:   0.4,
  RECRUITER: 'IRREGULAR',
  EXTERNAL:  0,
};

const FlowGraphCanvas = forwardRef(({ 
  data, 
  onNodeSelect, 
  selectedNode, 
  activeFilter, 
  onZoomChange 
}, ref) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);
  const respirationRef = useRef(null);

  // Expose zoom functions to parent
  useImperativeHandle(ref, () => ({
    zoomIn: () => d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.4),
    zoomOut: () => d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1 / 1.4),
    zoomFit: () => {
      const bounds = d3.select(svgRef.current).select('g.main-group').node().getBBox();
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const scale = Math.min(width / (bounds.width + 100), height / (bounds.height + 100));
      const translate = [
        (width - scale * (bounds.x * 2 + bounds.width)) / 2,
        (height - scale * (bounds.y * 2 + bounds.height)) / 2
      ];
      d3.select(svgRef.current).transition().duration(500).call(
        zoomRef.current.transform, 
        d3.zoomIdentity.translate(...translate).scale(scale)
      );
    },
    flyToRecruiter: (recruiterId) => {
      const recruiter = data.nodes.find(n => n.id === recruiterId);
      if (!recruiter) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const scale = 1.5;
      const translate = [width / 2 - scale * recruiter.x, height / 2 - scale * recruiter.y];
      d3.select(svgRef.current).transition().duration(800).call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(...translate).scale(scale)
      );
    }
  }));

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Definitions
    const defs = svg.append('defs');
    const addMarker = (id, color) => {
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 9)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', color);
    };
    addMarker('arrow-dark', '#3A3A30');
    addMarker('arrow-phosphor', '#B8FF6B');
    addMarker('arrow-grey', '#7A7868');

    const mainGroup = svg.append('g').attr('class', 'main-group');
    const edgeGroup = mainGroup.append('g').attr('class', 'edges');
    const nodeGroup = mainGroup.append('g').attr('class', 'nodes');

    // Force Simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id(d => d.id).distance(d => d.edge_type === 'TEST_CREDIT' ? 180 : 120).strength(0.4))
      .force('charge', d3.forceManyBody().strength(d => d.node_type === 'RECRUITER' ? -400 : -150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => {
        const size = NODE_SIZES[d.node_type] || NODE_SIZES[d.severity];
        return Math.max(size.w, size.h) / 2 + 30;
      }));
    
    simulationRef.current = simulation;

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
        onZoomChange(event.transform.k.toFixed(1));
        
        // Toggle edge labels at zoom > 1.5
        edgeGroup.selectAll('text.edge-label').style('visibility', event.transform.k > 1.5 ? 'visible' : 'hidden');
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    // Edges
    const edges = edgeGroup.selectAll('g.edge')
      .data(data.edges)
      .enter()
      .append('g')
      .attr('class', 'edge')
      .attr('data-edge-type', d => d.edge_type);

    edges.append('line')
      .attr('stroke', d => d.edge_type === 'ILLICIT_CREDIT' ? '#B8FF6B' : d.edge_type === 'TEST_CREDIT' ? '#3A3A30' : '#7A7868')
      .attr('stroke-width', d => Math.max(1, Math.min(5, 1 + (Math.log(Math.max(1, d.amount)) / Math.log(1000000)) * 4)))
      .attr('stroke-dasharray', d => d.edge_type === 'TAINT_LINK' ? '6 4' : 'none')
      .attr('marker-end', d => d.edge_type === 'ILLICIT_CREDIT' ? 'url(#arrow-phosphor)' : d.edge_type === 'TEST_CREDIT' ? 'url(#arrow-dark)' : 'url(#arrow-grey)');

    edges.append('text')
      .attr('class', 'edge-label')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .style('font-family', 'JetBrains Mono')
      .style('font-size', '8px')
      .style('fill', 'var(--instrument-grey)')
      .style('visibility', 'hidden')
      .text(d => d.amount > 0 ? `₹${new Intl.NumberFormat('en-IN').format(d.amount)}` : '');

    // Nodes
    const nodes = nodeGroup.selectAll('g.node')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-node-id', d => d.id)
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
        })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeSelect(d, { x: event.pageX, y: event.pageY });
      })
      .on('dblclick', (event, d) => {
        d.fx = null;
        d.fy = null;
        simulation.alphaTarget(0.3).restart();
      });

    nodes.append('rect')
      .attr('class', 'node-body')
      .attr('x', d => -(NODE_SIZES[d.node_type]?.w || 24) / 2)
      .attr('y', d => -(NODE_SIZES[d.node_type]?.h || 24) / 2)
      .attr('width', d => NODE_SIZES[d.node_type]?.w || 24)
      .attr('height', d => NODE_SIZES[d.node_type]?.h || 24)
      .attr('fill', d => (d.node_type === 'SELECTED' || d.severity === 'IMMINENT') ? 'var(--phosphor)' : 'var(--void)')
      .attr('stroke', d => (d.node_type === 'SELECTED' || d.severity === 'IMMINENT') ? 'var(--phosphor)' : (d.node_type === 'RECRUITER' ? 'var(--phosphor)' : 'var(--instrument-dark)'))
      .attr('stroke-width', d => d.node_type === 'SELECTED' ? 2 : 1)
      .attr('stroke-dasharray', d => d.node_type === 'TAINTED' ? '4 2' : 'none');

    // Inner frozen rect
    nodes.filter(d => d.is_frozen)
      .append('rect')
      .attr('x', d => -(NODE_SIZES[d.node_type]?.w || 24) / 2 + 2)
      .attr('y', d => -(NODE_SIZES[d.node_type]?.h || 24) / 2 + 2)
      .attr('width', d => (NODE_SIZES[d.node_type]?.w || 24) - 4)
      .attr('height', d => (NODE_SIZES[d.node_type]?.h || 24) - 4)
      .attr('fill', 'none')
      .attr('stroke', 'var(--instrument-dark)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 2');

    // Node labels
    nodes.append('text')
      .attr('y', d => (NODE_SIZES[d.node_type]?.h || 24) / 2 + 12)
      .attr('text-anchor', 'middle')
      .style('font-family', 'JetBrains Mono')
      .style('font-size', '9px')
      .style('fill', d => (d.node_type === 'SELECTED' || d.severity === 'IMMINENT') ? 'var(--void)' : 'var(--instrument-grey)')
      .text(d => d.label);

    // Recruiter specific label
    nodes.filter(d => d.node_type === 'RECRUITER')
      .append('text')
      .attr('y', -38)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Inter')
      .style('font-size', '8px')
      .style('font-weight', '600')
      .style('letter-spacing', '0.12em')
      .style('fill', 'var(--phosphor)')
      .text('RECRUITER');

    // Simulation update
    simulation.on('tick', () => {
      edges.selectAll('line')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      edges.selectAll('text.edge-label')
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Respiration Loop
    let startTime = null;
    const respTick = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const t = (timestamp - startTime) / 1000;

      nodes.each(function(d) {
        const rect = d3.select(this).select('rect.node-body');
        const type = d.node_type === 'RECRUITER' ? 'RECRUITER' : d.severity;
        const freq = RESPIRATION[type] || 0.3;

        if (type === 'RECRUITER') {
          const strokeOp = 0.6 + Math.sin(2 * Math.PI * 2.0 * t) * 0.2 + Math.sin(2 * Math.PI * 0.7 * t) * 0.1;
          rect.attr('stroke-opacity', strokeOp);
        } else if (d.node_type === 'SELECTED' || d.severity === 'IMMINENT') {
          const op = 0.85 + Math.sin(2 * Math.PI * freq * t) * 0.15;
          rect.attr('opacity', op);
        } else {
          const fillOp = 0.05 + Math.sin(2 * Math.PI * freq * t) * 0.05;
          rect.attr('fill-opacity', d.node_type === 'CLEAN' ? 0.02 : fillOp);
        }
      });

      respirationRef.current = requestAnimationFrame(respTick);
    };
    respirationRef.current = requestAnimationFrame(respTick);

    // Initial alpha pop
    simulation.alpha(1).restart();

    return () => {
      simulation.stop();
      cancelAnimationFrame(respirationRef.current);
    };
  }, [data]);

  // Handle Filtering
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const edges = svg.selectAll('g.edge');
    
    if (activeFilter === 'ALL') {
      edges.style('opacity', 1).style('filter', 'none');
    } else {
      edges.each(function(d) {
        const match = d.edge_type === (activeFilter === 'RECRUITER' ? 'TEST_CREDIT' : activeFilter);
        d3.select(this).style('opacity', match ? 1 : 0.15);
      });
    }
  }, [activeFilter]);

  return (
    <div ref={containerRef} className="flowgraph__canvas-area">
      <svg ref={svgRef} onClick={() => onNodeSelect(null)} />
    </div>
  );
});

export default FlowGraphCanvas;
