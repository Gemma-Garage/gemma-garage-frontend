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
    // Check for OAuth callback success parameter and session token
    const urlParams = new URLSearchParams(window.location.search);
    const hfConnected = urlParams.get('hf_connected');
    const sessionToken = urlParams.get('session_token');
    
    if (hfConnected === 'true' && sessionToken) {
      // Store session token in localStorage for API calls
      localStorage.setItem('hf_session_token', sessionToken);
      console.log('Stored HF session token from OAuth callback:', sessionToken);
      
      // Remove the parameters from URL
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('hf_connected');
      newUrl.searchParams.delete('session_token');
      window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
      
      // Recheck connection status after successful OAuth
      setTimeout(checkConnectionStatus, 1000);
    } else {
      // Regular check on component mount
      checkConnectionStatus();
    }
  }, []);

  const checkConnectionStatus = async () => {
    try {
      console.log('Checking HF connection status...');
      console.log('Current cookies:', document.cookie);
      
      // Get session token from localStorage as fallback
      const sessionToken = localStorage.getItem('hf_session_token');
      console.log('Session token from localStorage (fallback):', sessionToken);
      
      // Also check URL for session token (in case cookie didn't work)
      const urlParams = new URLSearchParams(window.location.search);
      const urlSessionToken = urlParams.get('session_token');
      console.log('Session token from URL:', urlSessionToken);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add session token to headers if available (prioritize localStorage, then URL)
      const tokenToUse = sessionToken || urlSessionToken;
      if (tokenToUse) {
        headers['Authorization'] = `Bearer ${tokenToUse}`;
        console.log('Using session token in Authorization header:', tokenToUse);
      }
      
      const response = await fetch(`${API_BASE_URL}/huggingface/status`, {
        credentials: 'include', // Important for session cookies
        headers
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
    // Fix: Use the correct OAuth endpoint - /huggingface/login instead of /oauth/huggingface/login
    const loginUrl = `${API_BASE_URL}/huggingface/login${projectId ? `?request_id=${projectId}` : ''}`;
    console.log('Redirecting to OAuth login:', loginUrl);
    window.location.href = loginUrl;
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      
      // Get session token from localStorage
      const sessionToken = localStorage.getItem('hf_session_token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add session token to headers if available
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/huggingface/logout`, {
        method: 'POST',
        credentials: 'include',
        headers
      });

      if (response.ok) {
        // Clear stored session token
        localStorage.removeItem('hf_session_token');
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
