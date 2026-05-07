import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const RecruiterCanvas = ({ 
  campaign, 
  onNodeSelect, 
  selectedNodeId, 
  isFrozen 
}) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !campaign) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current);
    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Helpers
    const hexagonPoints = (cx, cy, r) => {
      return Array.from({length: 6}, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i - 30);
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
    };

    // 1. Draw Ring Boundaries (Hexagons)
    const ringRadii = [180, 300, 420];
    const ringLabels = ["CRITICAL ZONE", "ACTIVE ZONE", "SURVEILLANCE ZONE"];

    ringRadii.forEach((r, i) => {
      g.append('polygon')
        .attr('points', hexagonPoints(centerX, centerY, r))
        .attr('class', 'ring-line');
      
      g.append('text')
        .attr('x', centerX + r + 10)
        .attr('y', centerY)
        .attr('class', 'ring-label')
        .text(ringLabels[i]);
    });

    // 2. Prepare Nodes Data (Radial Placement)
    const recruiter = campaign.recruiter;
    const warmingAccounts = campaign.warming_accounts;

    const ring1 = warmingAccounts.filter(a => a.warmth_score >= 75);
    const ring2 = warmingAccounts.filter(a => a.warmth_score >= 40 && a.warmth_score < 75);
    const ring3 = warmingAccounts.filter(a => a.warmth_score < 40);

    const placeNodes = (nodes, radius) => {
      return nodes.map((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
        return {
          ...node,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });
    };

    const nodesWithPos = [
      ...placeNodes(ring1, ringRadii[0]),
      ...placeNodes(ring2, ringRadii[1]),
      ...placeNodes(ring3, ringRadii[2])
    ];

    // 3. Draw Edges
    const edges = g.append('g').attr('class', 'edges-layer')
      .selectAll('.edge-line')
      .data(nodesWithPos)
      .enter().append('line')
      .attr('class', d => `edge-line ${isFrozen ? 'frozen' : ''}`)
      .attr('x1', centerX)
      .attr('y1', centerY)
      .attr('x2', centerX) // Start at center for draw animation
      .attr('y2', centerY);

    // Edge animation
    edges.transition()
      .delay(400)
      .duration(300)
      .attr('x2', d => d.x)
      .attr('y2', d => d.y);

    // Payment dots for mules
    const muleAccounts = nodesWithPos.filter(a => a.warmth_score >= 85);
    const paymentDots = g.append('g').attr('class', 'dots-layer')
      .selectAll('.payment-dot-container')
      .data(muleAccounts)
      .enter().append('g');

    paymentDots.append('rect')
      .attr('class', 'payment-dot')
      .attr('width', 4)
      .attr('height', 2)
      .attr('fill', 'var(--phosphor)')
      .style('offset-path', d => `path('M ${centerX} ${centerY} L ${d.x} ${d.y}')`);

    // 4. Draw Recruiter (Center)
    const recruiterG = g.append('g')
      .attr('class', 'recruiter-node')
      .style('opacity', 0);

    recruiterG.append('polygon')
      .attr('points', hexagonPoints(centerX, centerY, 64))
      .attr('class', 'recruiter-glow');

    recruiterG.append('polygon')
      .attr('points', hexagonPoints(centerX, centerY, 52))
      .attr('class', 'recruiter-outer-ring');

    recruiterG.append('polygon')
      .attr('points', hexagonPoints(centerX, centerY, 40))
      .attr('class', 'recruiter-inner');

    recruiterG.append('text')
      .attr('x', centerX)
      .attr('y', centerY - 15)
      .attr('class', 'recruiter-label')
      .text('RECRUITER');

    recruiterG.append('text')
      .attr('x', centerX)
      .attr('y', centerY + 10)
      .attr('class', 'recruiter-score')
      .text(recruiter.warmth_score);

    recruiterG.append('text')
      .attr('x', centerX)
      .attr('y', centerY + 25)
      .attr('class', 'recruiter-count')
      .text(`×${recruiter.accounts_recruited}`);

    recruiterG.append('text')
      .attr('x', centerX)
      .attr('y', centerY + 80)
      .attr('class', 'recruiter-meta-label')
      .text(`WARMTHSCORE: ${recruiter.warmth_score}`);

    recruiterG.append('text')
      .attr('x', centerX)
      .attr('y', centerY + 95)
      .attr('class', 'recruiter-meta-label')
      .style('font-size', '9px')
      .text('FRI: LOW');

    recruiterG.transition().duration(200).style('opacity', 1);

    // 5. Draw Warming Accounts
    const nodeG = g.append('g').attr('class', 'nodes-layer')
      .selectAll('.mule-square')
      .data(nodesWithPos)
      .enter().append('g')
      .attr('class', d => `mule-square ${d.warmth_score >= 85 ? 'inverted' : ''}`)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('opacity', 0)
      .on('click', (event, d) => {
        event.stopPropagation();
        
        // Update selection styling
        d3.select(svgRef.current).selectAll('.mule-square').classed('selected', n => n.id === d.id);
        
        onNodeSelect(d.id);
      });

    nodeG.append('rect')
      .attr('width', 36)
      .attr('height', 36)
      .attr('x', -18)
      .attr('y', -18)
      .attr('fill', d => {
        if (d.warmth_score >= 85) return 'var(--phosphor)';
        if (d.warmth_score >= 75) return 'var(--instrument-ghost)';
        return 'var(--void)';
      })
      .attr('stroke', d => {
        if (d.warmth_score >= 85) return 'none';
        if (d.warmth_score >= 60) return 'var(--phosphor)';
        if (d.warmth_score >= 40) return 'var(--instrument-grey)';
        return 'var(--instrument-dark)';
      })
      .attr('stroke-width', 1);

    nodeG.append('text')
      .attr('class', 'node-score')
      .attr('dy', '.35em')
      .attr('fill', d => d.warmth_score >= 85 ? 'var(--void)' : 'var(--phosphor)')
      .text(d => d.warmth_score);

    // Status box
    const statusG = nodeG.append('g').attr('transform', 'translate(0, 12)');
    statusG.append('rect')
      .attr('class', 'status-box')
      .attr('width', 10)
      .attr('height', 10)
      .attr('x', -5)
      .attr('y', -5)
      .attr('fill', 'none')
      .attr('stroke', d => d.warmth_score >= 85 ? 'var(--void)' : 'var(--instrument-grey)');
    
    statusG.append('text')
      .attr('class', 'status-text')
      .attr('dy', '0.3em')
      .attr('fill', d => d.warmth_score >= 85 ? 'var(--void)' : 'var(--instrument-grey)')
      .text(d => d.current_status[0]);

    // Labels
    nodeG.append('text')
      .attr('class', 'node-id')
      .attr('y', 30)
      .text(d => d.id.substring(0, 10));

    nodeG.append('text')
      .attr('class', 'node-amt')
      .attr('y', 40)
      .text(d => `₹${d.test_payment_received}`);

    // Staggered node appearance
    nodeG.transition()
      .delay(d => {
        if (d.warmth_score >= 75) return 100;
        if (d.warmth_score >= 40) return 200;
        return 300;
      } )
      .duration(300)
      .style('opacity', 1);

    // 6. Global Click for Deselect
    svg.on('click', () => onNodeSelect(null));

    // Handle Selection State (Dimming)
    useEffect(() => {
      if (!selectedNodeId) {
        nodeG.style('opacity', 1);
        edges.attr('class', `edge-line ${isFrozen ? 'frozen' : ''}`);
      } else {
        nodeG.style('opacity', d => d.id === selectedNodeId ? 1 : 0.25);
        edges.attr('class', d => 
          `edge-line ${isFrozen ? 'frozen' : ''} ${d.id === selectedNodeId ? 'active' : ''}`
        );
      }
    }, [selectedNodeId, isFrozen]);

  }, [campaign, isFrozen]);

  return (
    <div className="canvas-area" ref={containerRef}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default RecruiterCanvas;
