import React, { useState, useEffect } from 'react';
import {
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import '../style/modern.css';
import { API_BASE_URL, API_INFERENCE_BASE_URL } from '../api';

const UnifiedInference = ({ currentUser, currentRequestId, currentBaseModel, hfModelPath }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [baseResponse, setBaseResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [baseLoading, setBaseLoading] = useState(false);
  const [error, setError] = useState(null);
  const [baseError, setBaseError] = useState(null);
  const [maxNewTokens, setMaxNewTokens] = useState(100);
  const [hfConnected, setHfConnected] = useState(false);
  const [hfModelName, setHfModelName] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check Hugging Face connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setCheckingStatus(true);
      try {
        const res = await fetch(`${API_BASE_URL}/huggingface/status`, { credentials: 'include' });
        const data = await res.json();
        setHfConnected(data.connected);
        if (data.connected && hfModelPath) {
          // Use the HF model path if available
          setHfModelName(hfModelPath);
        } else if (data.connected && currentUser && currentRequestId) {
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
  }, [currentUser, currentRequestId, hfModelPath]);

  const handleConnectHF = () => {
    // Pass the current request ID to redirect back to the project page
    const loginUrl = `${API_BASE_URL}/huggingface/login${currentRequestId ? `?request_id=${currentRequestId}` : ''}`;
    console.log('Redirecting to OAuth login:', loginUrl);
    window.location.href = loginUrl;
  };

  const handleTest = async () => {
    if (!hfModelName.trim()) {
      setError('Please enter a Hugging Face model name');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    
    setLoading(true);
    setBaseLoading(true);
    setError(null);
    setBaseError(null);
    setResponse('');
    setBaseResponse('');
    
    const baseModel = currentBaseModel || "unsloth/gemma-3-1b-it";
    
    // Call both endpoints in parallel
    const fineTunedPayload = {
      model_name: hfModelName,
      prompt: prompt,
      max_new_tokens: maxNewTokens,
      base_model: baseModel
    };
    
    const baseModelPayload = {
      base_model: baseModel,
      prompt: prompt,
      max_new_tokens: maxNewTokens
    };
    
    console.log('🔍 [Inference Debug] Sending fine-tuned request to:', `${API_INFERENCE_BASE_URL}/inference`);
    console.log('🔍 [Inference Debug] Fine-tuned payload:', fineTunedPayload);
    console.log('🔍 [Inference Debug] Sending base model request to:', `${API_INFERENCE_BASE_URL}/base-inference`);
    console.log('🔍 [Inference Debug] Base model payload:', baseModelPayload);
    
    try {
      // Call both endpoints in parallel
      const [fineTunedResponse, baseModelResponse] = await Promise.all([
        fetch(`${API_INFERENCE_BASE_URL}/inference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fineTunedPayload),
        }),
        fetch(`${API_INFERENCE_BASE_URL}/base-inference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(baseModelPayload),
        })
      ]);
      
      // Handle fine-tuned model response
      if (!fineTunedResponse.ok) {
        const errorData = await fineTunedResponse.json();
        throw new Error(errorData.error || errorData.detail || 'Fine-tuned model inference failed');
      }
      const fineTunedData = await fineTunedResponse.json();
      setResponse(fineTunedData.response);
      
      // Handle base model response
      if (!baseModelResponse.ok) {
        const errorData = await baseModelResponse.json();
        throw new Error(errorData.error || errorData.detail || 'Base model inference failed');
      }
      const baseModelData = await baseModelResponse.json();
      setBaseResponse(baseModelData.response);
      
    } catch (err) {
      console.log('🔍 [Inference Debug] Caught error:', err);
      console.log('🔍 [Inference Debug] Error message:', err.message);
      console.log('🔍 [Inference Debug] Error stack:', err.stack);
      setError(err.message);
    } finally {
      setLoading(false);
      setBaseLoading(false);
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
        <h3 className="modern-card-title">🤖 Compare Fine-tuned vs Base Model</h3>
        <p className="modern-card-subtitle">
          Test your fine-tuned model against the base model. Requires HF login and uploaded model.
        </p>
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
        disabled={loading || baseLoading || !prompt.trim() || !hfModelName.trim()}
        sx={{ mb: 2 }}
      >
        {(loading || baseLoading) ? <CircularProgress size={24} /> : 'Generate Responses'}
      </Button>
      
      {(response || baseResponse) && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Comparison:
          </Typography>
          
          <Grid container spacing={2}>
            {/* Fine-tuned Model Response */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                🤖 Fine-tuned Model Response:
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
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
                    {response || 'No response yet'}
                  </Typography>
                </div>
              )}
            </Grid>
            
            {/* Base Model Response */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'var(--secondary-color)' }}>
                🏠 Base Model Response:
              </Typography>
              {baseLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
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
                    {baseResponse || 'No response yet'}
                  </Typography>
                </div>
              )}
            </Grid>
          </Grid>
        </Box>
      )}
    </div>
  );
};

export default UnifiedInference;
