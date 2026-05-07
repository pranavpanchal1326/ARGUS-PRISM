import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

const FlowGraphCanvas = ({ 
  graphData, 
  onNodeSelect, 
  activeFilter, 
  onHover 
}) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !graphData) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    
    // Arrow marker definition
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 32) // Distance from node center
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 L 2.5 5 Z')
      .attr('fill', 'var(--instrument-grey)');

    svg.append('defs').append('marker')
      .attr('id', 'arrow-suspicious')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 32)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 L 2.5 5 Z')
      .attr('fill', 'var(--phosphor)');

    const g = svg.append('g').attr('class', 'graph-content');

    // Zoom setup
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    zoomRef.current = zoom;

    // Simulation setup
    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.edges)
        .id(d => d.id)
        .distance(160)
        .strength(0.8))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    simulationRef.current = simulation;

    // Edges
    const edge = g.append('g')
      .selectAll('.edge-container')
      .data(graphData.edges)
      .enter().append('g')
      .attr('class', 'edge-container');

    const edgeLine = edge.append('line')
      .attr('class', 'edge')
      .attr('stroke', d => {
        if (d.is_suspicious) return 'var(--phosphor)';
        if (d.amount > 100000) return 'var(--phosphor)';
        if (d.amount > 10000) return 'var(--instrument-grey)';
        return 'var(--instrument-dark)';
      })
      .attr('stroke-width', d => Math.max(1, Math.log(d.amount / 5000) * 1.5))
      .attr('stroke-opacity', d => d.amount > 100000 ? 0.9 : d.amount > 10000 ? 0.8 : 0.6)
      .attr('stroke-dasharray', d => d.is_suspicious ? '4 2' : '1000 0')
      .attr('marker-end', d => d.is_suspicious ? 'url(#arrow-suspicious)' : 'url(#arrow)');

    // Nodes
    const node = g.append('g')
      .selectAll('.node')
      .data(graphData.nodes)
      .enter().append('g')
      .attr('class', d => `node ${getBreatheClass(d.warmth_score, d.is_recruiter)}`)
      .on('click', (event, d) => {
        event.stopPropagation();
        
        // Update selection styling
        node.classed('selected', n => n.id === d.id);
        
        handleNodeClick(d, node, edgeLine);
        onNodeSelect(d);
      })
      .on('mouseover', (event, d) => {
        onHover(d, event);
        d3.select(event.currentTarget).style('animation-play-state', 'paused');
      })
      .on('mouseout', (event) => {
        onHover(null);
        d3.select(event.currentTarget).style('animation-play-state', 'running');
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node rectangles
    node.append('rect')
      .attr('width', d => d.is_recruiter ? 60 : 48)
      .attr('height', d => d.is_recruiter ? 60 : 48)
      .attr('x', d => d.is_recruiter ? -30 : -24)
      .attr('y', d => d.is_recruiter ? -30 : -24)
      .attr('fill', d => getNodeFill(d.warmth_score))
      .attr('stroke', d => getNodeStroke(d.warmth_score))
      .attr('stroke-width', d => d.warmth_score > 75 ? 2 : 1);

    // Recruiter outer ring
    node.filter(d => d.is_recruiter)
      .append('rect')
      .attr('width', 68)
      .attr('height', 68)
      .attr('x', -34)
      .attr('y', -34)
      .attr('fill', 'none')
      .attr('stroke', 'var(--phosphor)')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.4);

    // Node score text
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-family', 'Monument Extended')
      .attr('font-size', '14px')
      .attr('fill', d => d.warmth_score >= 85 ? 'var(--void)' : 'var(--phosphor)')
      .text(d => d.warmth_score);

    // Node labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => d.is_recruiter ? 45 : 38)
      .attr('font-family', 'Suisse Int\'l Mono')
      .attr('font-size', '9px')
      .attr('fill', 'var(--instrument-grey)')
      .text(d => d.id.substring(0, 12));

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => d.is_recruiter ? -42 : -34)
      .attr('font-family', 'Suisse Int\'l')
      .attr('font-size', '7px')
      .attr('fill', 'var(--instrument-grey)')
      .attr('text-transform', 'uppercase')
      .text(d => d.is_recruiter ? 'RECRUITER' : d.node_type);

    // Canvas click to deselect
    svg.on('click', () => {
      node.classed('selected', false);
      node.style('opacity', 1);
      edgeLine.style('opacity', (e) => e.amount > 100000 ? 0.9 : 0.6);
      onNodeSelect(null);
    });

    // Update positions
    simulation.on('tick', () => {
      edgeLine
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Scan-line reveal on mount
    runScanReveal(svg, g, node, edge, width, height);

    // Functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => simulation.stop();
  }, [graphData]);

  // Handle Filtering
  useEffect(() => {
    if (!svgRef.current) return;
    const node = d3.select(svgRef.current).selectAll('.node');
    
    if (activeFilter === 'ALL') {
      node.style('opacity', 1);
    } else if (activeFilter === 'MULES') {
      node.style('opacity', d => d.is_confirmed_mule ? 1 : 0.2);
    } else if (activeFilter === 'RECRUITERS') {
      node.style('opacity', d => d.is_recruiter ? 1 : 0.2);
    } else if (activeFilter === 'HIGH_RISK') {
      node.style('opacity', d => d.warmth_score > 60 ? 1 : 0.2);
    }
  }, [activeFilter]);

  const handleNodeClick = (selected, nodeSelection, edgeSelection) => {
    const connectedNodeIds = new Set();
    connectedNodeIds.add(selected.id);
    
    edgeSelection.each(d => {
      if (d.source.id === selected.id) connectedNodeIds.add(d.target.id);
      if (d.target.id === selected.id) connectedNodeIds.add(d.source.id);
    });

    nodeSelection.style('opacity', d => connectedNodeIds.has(d.id) ? 1 : 0.2);
    edgeSelection.style('opacity', d => 
      d.source.id === selected.id || d.target.id === selected.id ? 1 : 0.05
    );
  };

  const getBreatheClass = (score, isRecruiter) => {
    if (isRecruiter) return 'breathe-recruiter';
    if (score >= 85) return 'breathe-critical';
    if (score >= 75) return 'breathe-fast';
    if (score >= 40) return 'breathe-medium';
    return 'breathe-slow';
  };

  const getNodeFill = (score) => {
    if (score >= 85) return 'var(--phosphor)';
    if (score >= 75) return 'var(--instrument-ghost)';
    return 'var(--void)';
  };

  const getNodeStroke = (score) => {
    if (score >= 85) return 'none';
    if (score >= 60) return 'var(--phosphor)';
    if (score >= 40) return 'var(--instrument-grey)';
    return 'var(--instrument-dark)';
  };

  const runScanReveal = (svg, g, node, edge, width, height) => {
    g.style('opacity', 0);
    
    const scanLine = svg.append('rect')
      .attr('class', 'scan-line-rect')
      .attr('width', width)
      .attr('height', 1)
      .attr('fill', 'var(--phosphor)')
      .attr('y', 0);

    scanLine.transition()
      .duration(900)
      .ease(d3.easeLinear)
      .attr('y', height)
      .remove();

    g.transition()
      .delay(100)
      .duration(800)
      .style('opacity', 1);

    node.style('opacity', 0)
      .transition()
      .delay((d, i) => (d.y / height) * 800)
      .duration(60)
      .style('opacity', 1);
  };

  return (
    <div className="canvas-container" ref={containerRef}>
      <svg ref={svgRef} />
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => svgRef.current && d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.3)}>+</button>
        <button className="zoom-btn" onClick={() => svgRef.current && d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.7)}>-</button>
        <button className="zoom-btn fit" onClick={() => svgRef.current && d3.select(svgRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity)}>FIT</button>
      </div>
    </div>
  );
};

export default FlowGraphCanvas;
