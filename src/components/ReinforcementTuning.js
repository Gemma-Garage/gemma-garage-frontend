import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { API_BASE_URL } from "../api";

const ReinforcementTuning = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ingestionResult, setIngestionResult] = useState(null);

  const handleIngest = async () => {
    if (!repoUrl) {
      setError("Please enter a GitHub repository URL.");
      return;
    }
    setLoading(true);
    setError(null);
    setIngestionResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repository_url: repoUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to ingest repository.");
      }

      const result = await response.json();
      setIngestionResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ padding: 3, marginTop: 2 }}>
      <Typography variant="h5" gutterBottom>
        Reinforcement Fine-Tuning: Ingest Repository
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Enter the URL of a GitHub repository to ingest its content for fine-tuning a coding agent.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          fullWidth
          label="GitHub Repository URL"
          variant="outlined"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={handleIngest}
          disabled={loading || !repoUrl}
          sx={{ height: '56px' }}
        >
          {loading ? <CircularProgress size={24} /> : "Ingest"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {ingestionResult && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="success">
            {ingestionResult.message} GCS Path: {ingestionResult.gcs_path}
          </Alert>
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Ingestion Summary
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {ingestionResult.summary}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Content Preview
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
              {ingestionResult.content_preview}
            </Typography>
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default ReinforcementTuning;
