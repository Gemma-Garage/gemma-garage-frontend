import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Tooltip,
  Chip,
  IconButton,
  Stack,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EvolutionTree from '../components/EvolutionTree';// Simple inline diff util (character-level) to avoid extra deps
function computeCharDiff(a, b) {
	// Returns array of segments: {text, type: 'same'|'add'|'del'}
	if (a === b) return [{ text: a, type: 'same' }];
	// LCS dynamic programming (simple, may be O(n*m) but prompts are short)
	const n = a.length, m = b.length;
	const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}
	// Reconstruct LCS path
	let i = 0, j = 0; const segments = [];
	function push(text, type) { if (!text) return; const last = segments[segments.length - 1]; if (last && last.type === type) last.text += text; else segments.push({ text, type }); }
	while (i < n && j < m) {
		if (a[i] === b[j]) { push(a[i], 'same'); i++; j++; }
		else if (dp[i + 1][j] >= dp[i][j + 1]) { push(a[i], 'del'); i++; }
		else { push(b[j], 'add'); j++; }
	}
	while (i < n) { push(a[i], 'del'); i++; }
	while (j < m) { push(b[j], 'add'); j++; }
	return segments;
}

const ComparisonView = ({ base, compare, onClose, title }) => {
  const [viewMode, setViewMode] = useState('diff'); // 'diff' or 'sidebyside'
  const segments = useMemo(() => computeCharDiff(base || '', compare || ''), [base, compare]);
  
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title || 'Prompt Comparison'}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} size="small">
            <Tab label="Diff" value="diff" />
            <Tab label="Side by Side" value="sidebyside" />
          </Tabs>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" gutterBottom>
          Base Length: {(base||'').length} | Compare Length: {(compare||'').length} | Delta: {(compare||'').length - (base||'').length}
        </Typography>
        
        {viewMode === 'diff' && (
          <Paper variant="outlined" sx={{ p:1, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
            {segments.map((s, idx) => {
              let color; let bg; let deco;
              if (s.type === 'add') { color = 'green'; bg = 'rgba(0,200,0,0.08)'; }
              else if (s.type === 'del') { color = 'red'; bg = 'rgba(255,0,0,0.08)'; deco='line-through'; }
              else { color = 'inherit'; }
              return <span key={idx} style={{ color, background: bg, textDecoration: deco }}>{s.text}</span>;
            })}
          </Paper>
        )}
        
        {viewMode === 'sidebyside' && (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Base ({(base||'').length} chars)
              </Typography>
              <Paper variant="outlined" sx={{ 
                p: 1, 
                fontFamily: 'monospace', 
                whiteSpace: 'pre-wrap', 
                lineHeight: 1.4,
                maxHeight: '60vh',
                overflow: 'auto',
                backgroundColor: '#fafafa'
              }}>
                {base || ''}
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Compare ({(compare||'').length} chars)
              </Typography>
              <Paper variant="outlined" sx={{ 
                p: 1, 
                fontFamily: 'monospace', 
                whiteSpace: 'pre-wrap', 
                lineHeight: 1.4,
                maxHeight: '60vh',
                overflow: 'auto',
                backgroundColor: '#fafafa'
              }}>
                {compare || ''}
              </Paper>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};// Expected JSON shape example:
// {
//   "candidate_data": [
//      {"id": "c1", "prompt": "...", "parent_idx": [0], ... },
//      ...
//   ],
//   "evolution_tree": {
//     "nodes": [...],
//     "edges": [...],
//     "levels": {...}
//   }
// }

function GEPAVisualizationPage() {
	const [rawJson, setRawJson] = useState('');
	const [data, setData] = useState(null);
	const [parseError, setParseError] = useState(null);
	const [selectedCandidate, setSelectedCandidate] = useState(null);
	const [diffState, setDiffState] = useState(null); // {base, compare, title}
	const [filter, setFilter] = useState('');
	const [tab, setTab] = useState(0);

	const handleFile = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = ev => {
			const text = ev.target.result;
			setRawJson(text);
			try {
				const parsed = JSON.parse(text);
				setData(parsed);
				setParseError(null);
			} catch (err) {
				setParseError(err.message);
				setData(null);
			}
		};
		reader.readAsText(file);
	};

  const candidates = useMemo(() => {
    if (!data?.candidate_data) return [];
    return data.candidate_data.map((c, idx, arr) => {
      const prev = arr[idx - 1];
      const prompt = c.prompt || c.text || c.input || '';
      const prevPrompt = prev ? (prev.prompt || prev.text || prev.input || '') : '';
      const len = prompt.length;
      const deltaPrev = prev ? len - prevPrompt.length : 0;
      const versions = c.mutation_history || c.versions || [];
      const parent_idx = c.parent_idx ? (Array.isArray(c.parent_idx) ? c.parent_idx[0] : c.parent_idx) : null;
      return { ...c, __index: idx, __len: len, __deltaPrev: deltaPrev, __versions: versions, __prompt: prompt, __parent: parent_idx };
    });
  }, [data]);	const filtered = candidates.filter(c => !filter || c.__prompt.toLowerCase().includes(filter.toLowerCase()));

	const lengthStats = useMemo(() => {
		if (!candidates.length) return null;
		const lengths = candidates.map(c => c.__len);
		const avg = lengths.reduce((a,b)=>a+b,0)/lengths.length;
		return { count: lengths.length, avg: Math.round(avg*100)/100, min: Math.min(...lengths), max: Math.max(...lengths) };
	}, [candidates]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>GEPA Candidate Visualization</Typography>
      <Typography variant="body2" gutterBottom>
        Upload a JSON export containing <code>candidate_data</code> and optional <code>evolution_tree</code>. 
        For each candidate you can inspect length deltas, ancestry, and diff against ancestors or mutation versions.
      </Typography>

      <Stack direction={{ xs:'column', sm:'row' }} spacing={2} sx={{ mb:2 }}>
        <Button variant="contained" component="label">Upload JSON<input hidden type="file" accept="application/json" onChange={handleFile} /></Button>
        <TextField label="Filter prompts" size="small" value={filter} onChange={e=>setFilter(e.target.value)} />
        {lengthStats && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`Count: ${lengthStats.count}`} />
            <Chip label={`Avg: ${lengthStats.avg}`} />
            <Chip label={`Min: ${lengthStats.min}`} />
            <Chip label={`Max: ${lengthStats.max}`} />
          </Stack>
        )}
      </Stack>

      {parseError && <Typography color="error">Parse error: {parseError}</Typography>}
      {!data && <Typography variant="body2">No data loaded yet.</Typography>}

      {data?.evolution_tree && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <EvolutionTree 
              treeData={data.evolution_tree} 
              onNodeClick={(node) => {
                const candidate = candidates.find(c => c.__index === node.id);
                if (candidate) setSelectedCandidate(candidate);
              }}
              selectedNodeId={selectedCandidate?.__index}
            />
          </Grid>
        </Grid>
      )}

      {filtered.length > 0 && (
        <Paper variant="outlined" sx={{ mb:3, overflow:'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Prompt (truncated)</TableCell>
                <TableCell align="right">Length</TableCell>
                <TableCell align="right">Δ Prev</TableCell>
                <TableCell>Parent</TableCell>
                <TableCell>Mutations</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id || c.__index} hover selected={selectedCandidate?.__index === c.__index} onClick={()=>setSelectedCandidate(c)} style={{ cursor:'pointer' }}>
                  <TableCell>{c.__index}</TableCell>
                  <TableCell>
                    <Tooltip title={c.__prompt} placement="top-start">
                      <span>{c.__prompt.slice(0,120)}{c.__prompt.length>120?'…':''}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">{c.__len}</TableCell>
                  <TableCell align="right" style={{ color: c.__deltaPrev > 0 ? 'green' : c.__deltaPrev < 0 ? 'red' : 'inherit' }}>{c.__deltaPrev}</TableCell>
                  <TableCell>
                    {c.__parent !== null ? <Chip size="small" label={`C${c.__parent}`} /> : <Chip size="small" label="Root" color="primary" />}
                  </TableCell>
                  <TableCell>
                    {c.__versions?.length ? <Chip size="small" label={`${c.__versions.length} versions`} /> : <Chip size="small" label="1" />}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={(e)=>{ e.stopPropagation(); const prevIdx = c.__index - 1; if (prevIdx >=0) { const prev = candidates[prevIdx]; setDiffState({ base: prev.__prompt, compare: c.__prompt, title: `Candidate ${c.__index} vs ${prevIdx}`}); } }} disabled={c.__index===0}>Compare Prev</Button>
                      {c.__parent !== null && (
                        <Button size="small" onClick={(e)=>{ e.stopPropagation(); const parent = candidates[c.__parent]; if (parent) setDiffState({ base: parent.__prompt, compare: c.__prompt, title: `Candidate ${c.__index} vs Parent ${c.__parent}`}); }}>Compare Parent</Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}			{selectedCandidate && (
				<Paper variant="outlined" sx={{ p:2 }}>
					<Box sx={{ display: 'flex', justifyContent:'space-between', alignItems:'center' }}>
						<Typography variant="h6">Candidate #{selectedCandidate.__index}</Typography>
						<Button size="small" onClick={()=>setSelectedCandidate(null)}>Close</Button>
					</Box>
					<Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2 }}>
						<Tab label="Prompt" />
						<Tab label="Ancestry" />
						<Tab label="Mutation Versions" />
						<Tab label="Raw JSON" />
					</Tabs>
					{tab===0 && (
						<Box>
							<Typography variant="subtitle2" gutterBottom>Length: {selectedCandidate.__len} | Δ Prev: {selectedCandidate.__deltaPrev}</Typography>
							<Paper variant="outlined" sx={{ p:1, fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{selectedCandidate.__prompt}</Paper>
						</Box>
					)}
					{tab===1 && (
						<Box>
							<Typography variant="subtitle2" gutterBottom>Ancestry & Evolution Path</Typography>
							{selectedCandidate.__parent !== null ? (
								<Box>
									<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
										<Chip label={`Parent: C${selectedCandidate.__parent}`} />
										<Button 
											size="small" 
											onClick={() => {
												const parent = candidates[selectedCandidate.__parent];
												if (parent) setDiffState({ 
													base: parent.__prompt, 
													compare: selectedCandidate.__prompt, 
													title: `C${selectedCandidate.__index} vs Parent C${selectedCandidate.__parent}` 
												});
											}}
										>
											Compare vs Parent
										</Button>
									</Stack>
									
									{/* Ancestry Chain */}
									<Paper variant="outlined" sx={{ p: 2 }}>
										<Typography variant="subtitle2" gutterBottom>Evolution Chain:</Typography>
										{(() => {
											const chain = [];
											let current = selectedCandidate;
											chain.unshift(current);
											
											while (current.__parent !== null && current.__parent !== undefined) {
												current = candidates[current.__parent];
												if (current) chain.unshift(current);
												else break;
											}
											
											return (
												<Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
													{chain.map((c, idx) => (
														<React.Fragment key={c.__index}>
															<Chip 
																label={`C${c.__index} (${c.score?.toFixed(3) || 'N/A'})`}
																color={c.__index === selectedCandidate.__index ? 'primary' : 'default'}
																variant={c.__index === selectedCandidate.__index ? 'filled' : 'outlined'}
																onClick={() => setSelectedCandidate(c)}
																clickable
															/>
															{idx < chain.length - 1 && <span>→</span>}
														</React.Fragment>
													))}
												</Stack>
											);
										})()}
									</Paper>
								</Box>
							) : (
								<Typography variant="body2">This is a root candidate with no parent.</Typography>
							)}
						</Box>
					)}
					{tab===2 && (
						<Box>
							{(!selectedCandidate.__versions || !selectedCandidate.__versions.length) && <Typography variant="body2">No mutation history available (only final prompt was provided). If you want diff vs mutation steps, include a "mutation_history" array per candidate.</Typography>}
							{selectedCandidate.__versions?.length>0 && (
								<Box>
									<Typography variant="subtitle2" gutterBottom>Versions ({selectedCandidate.__versions.length})</Typography>
									{selectedCandidate.__versions.map((v, idx) => {
										const prev = idx>0 ? selectedCandidate.__versions[idx-1] : null;
										const delta = prev ? v.length - prev.length : 0;
										return (
											<Paper key={idx} variant="outlined" sx={{ p:1, mb:1 }}>
												<Stack direction="row" spacing={1} alignItems="center" sx={{ mb:1 }}>
													<Chip size="small" label={`v${idx}`} />
													<Chip size="small" label={`len ${v.length}`} />
													{idx>0 && <Chip size="small" label={`Δ ${delta}`} color={delta>0? 'success': delta<0? 'error':'default'} />}
													{idx>0 && <Button size="small" onClick={()=> setDiffState({ base: prev, compare: v, title: `Mutation v${idx} vs v${idx-1}` })}>Compare Prev</Button>}
													<Button size="small" onClick={()=> setDiffState({ base: selectedCandidate.__versions[0], compare: v, title: `Mutation v${idx} vs v0` })} disabled={idx===0}>Compare v0</Button>
												</Stack>
												<Paper variant="outlined" sx={{ p:1, fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{v}</Paper>
											</Paper>
										);
									})}
								</Box>
							)}
						</Box>
					)}
					{tab===3 && (
						<Paper variant="outlined" sx={{ p:1, fontFamily:'monospace', whiteSpace:'pre-wrap', maxHeight:300, overflow:'auto' }}>{JSON.stringify(selectedCandidate, null, 2)}</Paper>
					)}
				</Paper>
			)}

			{diffState && <ComparisonView {...diffState} onClose={()=>setDiffState(null)} />}
		</Box>
	);
}

export default GEPAVisualizationPage;

