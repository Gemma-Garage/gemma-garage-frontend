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
import { API_BASE_URL, API_INFERENCE_BASE_URL } from '../api';

const UnifiedInference = ({ currentUser, currentRequestId, currentBaseModel, hfModelPath }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hfConnected, setHfConnected] = useState(false);
  const [maxNewTokens, setMaxNewTokens] = useState(100);
  const [checkingStatus, setCheckingStatus] = useState(true);
  // Model path is now read-only and comes from props or project data
  // Note: We're not using modelPath anymore, using currentRequestId instead

  // Check Hugging Face connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setCheckingStatus(true);
      try {
        const res = await fetch(`${API_BASE_URL}/huggingface/status`, { credentials: 'include' });
        const data = await res.json();
        setHfConnected(data.connected);
        // Note: We're not using modelPath anymore, using currentRequestId instead
      } catch (e) {
        setHfConnected(false);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkStatus();
  }, [currentUser, currentRequestId, hfModelPath]);

  const handleConnectHF = () => {
    window.location.href = `${API_BASE_URL}/huggingface/login`;
  };

  const handleTest = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    if (!currentRequestId) {
      setError('No training request ID available. Please complete training first.');
      return;
    }
    setLoading(true);
    setError(null);
    setResponse('');
    
    const requestPayload = {
      request_id: currentRequestId,
      base_model: currentBaseModel || "google/gemma-3-1b-pt",
      prompt: prompt,
      max_new_tokens: maxNewTokens
    };
    
    console.log('🔍 [Inference Debug] Making request to:', `${API_INFERENCE_BASE_URL}/inference`);
    console.log('🔍 [Inference Debug] Request payload:', requestPayload);
    
    try {
      const hfResponse = await fetch(`${API_INFERENCE_BASE_URL}/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestPayload),
      });
      
      console.log('🔍 [Inference Debug] Response status:', hfResponse.status);
      console.log('🔍 [Inference Debug] Response headers:', Object.fromEntries(hfResponse.headers.entries()));
      
      const hfData = await hfResponse.json();
      console.log('🔍 [Inference Debug] Full response data:', hfData);
      console.log('🔍 [Inference Debug] Response data type:', typeof hfData);
      console.log('🔍 [Inference Debug] Response data keys:', Object.keys(hfData));
      
      if (!hfResponse.ok) {
        console.error('🔍 [Inference Debug] Response not OK, throwing error');
        throw new Error(hfData.detail || hfData.error || 'Hugging Face inference failed');
      }
      
      if (hfData.error) {
        console.error('🔍 [Inference Debug] Response contains error field:', hfData.error);
        throw new Error(hfData.error);
      }
      
      console.log('🔍 [Inference Debug] Setting response to:', hfData.response);
      setResponse(hfData.response);
    } catch (err) {
      console.error('🔍 [Inference Debug] Caught error:', err);
      console.error('🔍 [Inference Debug] Error message:', err.message);
      console.error('🔍 [Inference Debug] Error stack:', err.stack);
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

  if (!currentRequestId) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Complete training to test inference with your model.
        </Alert>
      </Box>
    );
  }

  return (
    <div className="modern-card">
      <div className="modern-card-header">
        <h3 className="modern-card-title">🤖 Test Your Model & HF Info</h3>
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
          label="Training Request ID"
          value={currentRequestId || ''}
          InputProps={{ readOnly: true }}
          helperText="This is the request ID from your training job."
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Base Model"
          value={currentBaseModel || "google/gemma-3-1b-pt"}
          InputProps={{ readOnly: true }}
          helperText="This is the base model used for training."
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Hugging Face Model"
          value={hfModelPath || 'Not uploaded to HF yet'}
          InputProps={{ readOnly: true }}
          helperText={hfModelPath ? "This is your model uploaded to Hugging Face." : "Upload your model to Hugging Face to get a model name."}
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
        disabled={loading || !prompt.trim() || !currentRequestId}
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
