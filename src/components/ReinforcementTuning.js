import React, { useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import '../style/modern.css';
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
      const response = await fetch(`${API_BASE_URL}/ingest/ingest`, {
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
    <div className="page-container">
      <div className="modern-card">
        <div className="modern-card-header text-center">
          <h1 className="modern-card-title">Reinforcement Fine-Tuning: Ingest Repository</h1>
          <p className="modern-card-subtitle">
            Enter the URL of a GitHub repository to ingest its content for fine-tuning a coding agent.
          </p>
        </div>
        
        <div className="modern-form-group">
          <TextField
            fullWidth
            label="GitHub Repository URL"
            placeholder="https://github.com/username/repository-name"
            variant="outlined"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <button
            className={`modern-btn modern-btn-primary w-100 ${loading ? 'loading' : ''}`}
            onClick={handleIngest}
            disabled={loading || !repoUrl}
            style={{ padding: '12px 24px' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Ingest Repository"}
          </button>
        </div>

        {error && (
          <div className="modern-alert modern-alert-error">
            {error}
          </div>
        )}

        {ingestionResult && (
          <div className="mt-4">
            <div className="modern-alert modern-alert-success mb-3">
              {ingestionResult.message} GCS Path: {ingestionResult.gcs_path}
            </div>
            
            <div className="modern-card mb-3">
              <div className="modern-card-header">
                <h3 className="modern-card-title">Ingestion Summary</h3>
              </div>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {ingestionResult.summary}
              </Typography>
            </div>
            
            <div className="modern-card">
              <div className="modern-card-header">
                <h3 className="modern-card-title">Content Preview</h3>
              </div>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                {ingestionResult.content_preview}
              </Typography>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReinforcementTuning;
