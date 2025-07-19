import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { API_BASE_URL } from '../api';
import '../style/modern.css';

const HuggingFaceSettings = ({ currentUser, projectId, onConnectionStatusChange }) => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check connection status on component mount
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      console.log('Checking HF connection status...');
      
      const response = await fetch(`${API_BASE_URL}/huggingface/status`, {
        credentials: 'include' // Important for session cookies
      });
      
      console.log('HF status response:', response.status, response.statusText);
      console.log('Response headers:', [...response.headers.entries()]);
      
      if (response.ok) {
        const data = await response.json();
        console.log('HF status data:', data);
        setConnectionStatus(data);
        if (onConnectionStatusChange) onConnectionStatusChange(data);
        setError(null); // Clear any previous errors
      } else {
        console.error('HF status check failed:', response.status, response.statusText);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('HF status error response:', errorText);
        const disconnectedStatus = { connected: false };
        setConnectionStatus(disconnectedStatus);
        if (onConnectionStatusChange) onConnectionStatusChange(disconnectedStatus);
        setError(`Connection check failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error checking HF connection:', err);
      setError(`Failed to check connection status: ${err.message}`);
      const disconnectedStatus = { connected: false };
      setConnectionStatus(disconnectedStatus);
      if (onConnectionStatusChange) onConnectionStatusChange(disconnectedStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Use official OAuth endpoint
    const loginUrl = `${API_BASE_URL}/oauth/huggingface/login`;
    console.log('Redirecting to OAuth login:', loginUrl);
    window.location.href = loginUrl;
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/oauth/huggingface/logout`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        // Re-check status to confirm disconnection
        await checkConnectionStatus();
      } else {
        setError('Failed to disconnect');
      }
    } catch (err) {
      setError('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="modern-card text-center">
        <CircularProgress sx={{ color: 'var(--primary-color)' }} />
        <Typography className="modern-text mt-md">Loading Hugging Face settings...</Typography>
      </div>
    );
  }

  return (
    <div>
      <div className="modern-card-header">
        <Typography className="modern-card-title">🤗 Hugging Face Integration</Typography>
        <Typography className="modern-card-subtitle">
          Connect your Hugging Face account to upload and share your fine-tuned models
        </Typography>
      </div>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {connectionStatus?.connected ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Connected to Hugging Face as <strong>{connectionStatus.username}</strong>
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisconnect}
              disabled={loading}
            >
              Disconnect
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            With your Hugging Face account connected, you can:
          </Typography>
          <ul>
            <li>Upload fine-tuned models directly to your HF profile</li>
            <li>Use HF Inference API for testing models</li>
            <li>Share models publicly or keep them private</li>
          </ul>
        </Box>
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Connect your Hugging Face account to upload your fine-tuned models and use HF Inference API.
          </Alert>
          <Alert severity="info" sx={{ mb: 2 }}>
            Your Hugging Face account is not connected.
          </Alert>
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={loading}
            sx={{ 
              mb: 2,
              bgcolor: '#FF6B35',
              '&:hover': { bgcolor: '#E55A2B' },
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 3,
              py: 1.5
            }}
          >
            <img 
              src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg" 
              alt="Hugging Face"
              style={{ width: 20, height: 20 }}
            />
            Connect to Hugging Face
          </Button>
          <Typography variant="body2" color="text.secondary">
            Click the button above to securely connect your Hugging Face account using OAuth.
          </Typography>
        </Box>
      )}
    </div>
  );
};

export default HuggingFaceSettings;
