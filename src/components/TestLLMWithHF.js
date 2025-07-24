import React, { useState, useEffect } from 'react';
import {
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import '../style/modern.css';
import { API_BASE_URL } from '../api';

const UnifiedInference = ({ currentUser, currentRequestId, currentBaseModel }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hfConnected, setHfConnected] = useState(false);
  const [hfModelName, setHfModelName] = useState('');
  const [maxNewTokens, setMaxNewTokens] = useState(100);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check Hugging Face connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setCheckingStatus(true);
      try {
        const res = await fetch(`${API_BASE_URL}/huggingface/status`, { credentials: 'include' });
        const data = await res.json();
        setHfConnected(data.connected);
        if (data.connected && currentUser && currentRequestId) {
          // Default to user's own fine-tuned model if available
          setHfModelName(`${data.username}/${currentRequestId}`);
        }
      } catch (e) {
        setHfConnected(false);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkStatus();
  }, [currentUser, currentRequestId]);

  const handleConnectHF = () => {
    window.location.href = `${API_BASE_URL}/huggingface/login`;
  };

  const handleTest = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    if (!hfModelName.trim()) {
      setError('Please enter a Hugging Face model name');
      return;
    }
    setLoading(true);
    setError(null);
    setResponse('');
    try {
      const hfResponse = await fetch(`${API_BASE_URL}/huggingface/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model_name: hfModelName,
          prompt: prompt,
          max_new_tokens: maxNewTokens
        }),
      });
      if (!hfResponse.ok) {
        const errorData = await hfResponse.json();
        throw new Error(errorData.detail || 'Hugging Face inference failed');
      }
      const hfData = await hfResponse.json();
      setResponse(hfData.response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  if (!hfConnected) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          You must connect your Hugging Face account to use inference.
        </Alert>
        <Button variant="contained" onClick={handleConnectHF}>
          Connect Hugging Face
        </Button>
      </Box>
    );
  }

  return (
    <div className="modern-card">
      <div className="modern-card-header">
        <h3 className="modern-card-title">🤖 Test Your Model (Hugging Face Inference)</h3>
      </div>
      {error && (
        <div className="modern-alert modern-alert-error mb-3">
          {error}
          <button onClick={() => setError(null)} className="modern-alert-close">×</button>
        </div>
      )}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Hugging Face Model Name"
          value={hfModelName}
          onChange={(e) => setHfModelName(e.target.value)}
          placeholder="username/model-name"
          helperText="Enter the full model name from Hugging Face (e.g., your-username/your-model)"
          sx={{ mb: 2 }}
        />
        <TextField
          type="number"
          label="Max New Tokens"
          value={maxNewTokens}
          onChange={(e) => setMaxNewTokens(parseInt(e.target.value) || 100)}
          inputProps={{ min: 1, max: 1000 }}
          sx={{ width: 200 }}
        />
      </Box>
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Enter your prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
        sx={{ mb: 2 }}
      />
      <Button
        variant="contained"
        onClick={handleTest}
        disabled={loading || !prompt.trim() || !hfModelName.trim()}
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Generate Response'}
      </Button>
      {response && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Response:
          </Typography>
          <div 
            className="modern-card mt-3"
            style={{
              backgroundColor: 'var(--bg-primary)',
              maxHeight: '300px',
              overflow: 'auto',
              fontFamily: 'monospace',
              border: '1px solid var(--border-color)'
            }}
          >
            <Typography
              variant="body1"
              component="pre"
              sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
            >
              {response}
            </Typography>
          </div>
        </Box>
      )}
    </div>
  );
};

export default UnifiedInference;
