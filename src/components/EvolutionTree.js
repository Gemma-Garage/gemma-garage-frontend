import React, { useRef, useEffect } from 'react';
import { Box, Paper, Typography, Chip, Tooltip } from '@mui/material';

const EvolutionTree = ({ treeData, onNodeClick, selectedNodeId }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!treeData || !treeData.nodes) return;

    const svg = svgRef.current;
    const { nodes, edges, levels } = treeData;
    
    // Clear previous content
    svg.innerHTML = '';
    
    // Set up dimensions
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const levelHeight = 100;
    const nodeWidth = 120;
    const nodeHeight = 60;
    
    const maxLevel = Math.max(...Object.keys(levels).map(Number));
    const maxNodesPerLevel = Math.max(...Object.values(levels).map(level => level.length));
    
    const svgWidth = Math.max(600, maxNodesPerLevel * (nodeWidth + 40) + margin.left + margin.right);
    const svgHeight = (maxLevel + 1) * levelHeight + margin.top + margin.bottom;
    
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    
    // Create group for content
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
    svg.appendChild(g);
    
    // Calculate node positions
    const nodePositions = {};
    Object.entries(levels).forEach(([level, nodeIds]) => {
      const y = parseInt(level) * levelHeight + nodeHeight / 2;
      const startX = (svgWidth - margin.left - margin.right - nodeIds.length * nodeWidth - (nodeIds.length - 1) * 40) / 2;
      
      nodeIds.forEach((nodeId, index) => {
        const x = startX + index * (nodeWidth + 40) + nodeWidth / 2;
        nodePositions[nodeId] = { x, y };
      });
    });
    
    // Draw edges first (so they appear behind nodes)
    edges.forEach(edge => {
      const fromPos = nodePositions[edge.from];
      const toPos = nodePositions[edge.to];
      
      if (fromPos && toPos) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromPos.x);
        line.setAttribute('y1', fromPos.y + nodeHeight / 2);
        line.setAttribute('x2', toPos.x);
        line.setAttribute('y2', toPos.y - nodeHeight / 2);
        line.setAttribute('stroke', edge.score_delta >= 0 ? '#4caf50' : '#f44336');
        line.setAttribute('stroke-width', Math.abs(edge.score_delta) * 10 + 1);
        line.setAttribute('stroke-opacity', '0.6');
        g.appendChild(line);
        
        // Add score delta label
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + nodeHeight / 2 + toPos.y - nodeHeight / 2) / 2;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', '#666');
        text.setAttribute('font-size', '10');
        text.textContent = edge.score_delta >= 0 ? `+${edge.score_delta.toFixed(3)}` : edge.score_delta.toFixed(3);
        g.appendChild(text);
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;
      
      // Node background
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', pos.x - nodeWidth / 2);
      rect.setAttribute('y', pos.y - nodeHeight / 2);
      rect.setAttribute('width', nodeWidth);
      rect.setAttribute('height', nodeHeight);
      rect.setAttribute('rx', 8);
      rect.setAttribute('fill', node.is_best ? '#fff3e0' : selectedNodeId === node.id ? '#e3f2fd' : '#f5f5f5');
      rect.setAttribute('stroke', node.is_best ? '#ff9800' : selectedNodeId === node.id ? '#2196f3' : '#ddd');
      rect.setAttribute('stroke-width', node.is_best ? 3 : selectedNodeId === node.id ? 2 : 1);
      rect.setAttribute('cursor', 'pointer');
      rect.onclick = () => onNodeClick && onNodeClick(node);
      g.appendChild(rect);
      
      // Best marker
      if (node.is_best) {
        const star = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        star.setAttribute('x', pos.x + nodeWidth / 2 - 8);
        star.setAttribute('y', pos.y - nodeHeight / 2 + 12);
        star.setAttribute('text-anchor', 'middle');
        star.setAttribute('dominant-baseline', 'middle');
        star.setAttribute('fill', '#ff9800');
        star.setAttribute('font-size', '12');
        star.textContent = '⭐';
        g.appendChild(star);
      }
      
      // Node text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x);
      text.setAttribute('y', pos.y - 10);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#333');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('cursor', 'pointer');
      text.onclick = () => onNodeClick && onNodeClick(node);
      text.textContent = `C${node.id}`;
      g.appendChild(text);
      
      // Score text
      const scoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      scoreText.setAttribute('x', pos.x);
      scoreText.setAttribute('y', pos.y + 5);
      scoreText.setAttribute('text-anchor', 'middle');
      scoreText.setAttribute('dominant-baseline', 'middle');
      scoreText.setAttribute('fill', '#666');
      scoreText.setAttribute('font-size', '9');
      scoreText.setAttribute('cursor', 'pointer');
      scoreText.onclick = () => onNodeClick && onNodeClick(node);
      scoreText.textContent = node.score.toFixed(3);
      g.appendChild(scoreText);
      
      // Length text
      const lengthText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lengthText.setAttribute('x', pos.x);
      lengthText.setAttribute('y', pos.y + 16);
      lengthText.setAttribute('text-anchor', 'middle');
      lengthText.setAttribute('dominant-baseline', 'middle');
      lengthText.setAttribute('fill', '#999');
      lengthText.setAttribute('font-size', '8');
      lengthText.setAttribute('cursor', 'pointer');
      lengthText.onclick = () => onNodeClick && onNodeClick(node);
      lengthText.textContent = `${node.prompt_length_chars}ch`;
      g.appendChild(lengthText);
    });
    
  }, [treeData, selectedNodeId, onNodeClick]);

  if (!treeData || !treeData.nodes) {
    return (
      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No evolution tree data available</Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Evolution Tree</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip size="small" label={`${treeData.nodes.length} candidates`} />
          <Chip size="small" label={`${Object.keys(treeData.levels).length} levels`} />
        </Box>
      </Box>
      
      <Box sx={{ 
        overflow: 'auto', 
        border: '1px solid #ddd', 
        borderRadius: 1,
        bg: '#fafafa'
      }}>
        <svg ref={svgRef} style={{ display: 'block' }} />
      </Box>
      
      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip size="small" icon={<span>⭐</span>} label="Best candidate" />
        <Chip size="small" label="Green edges: score improvement" color="success" variant="outlined" />
        <Chip size="small" label="Red edges: score decline" color="error" variant="outlined" />
      </Box>
    </Paper>
  );
};

export default EvolutionTree;
