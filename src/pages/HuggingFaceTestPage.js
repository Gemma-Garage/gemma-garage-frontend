import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  Stack
} from '@mui/material';
import { API_BASE_URL } from '../api';
import '../style/modern.css';

const HuggingFaceTestPage = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkConfigStatus();
    checkConnectionStatus();
    
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success === 'true') {
      // Remove the success parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Recheck connection status after successful OAuth
      setTimeout(checkConnectionStatus, 1000);
    } else if (error) {
      setError(`OAuth error: ${decodeURIComponent(error)}`);
      // Remove the error parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkConfigStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/huggingface/config`);
      if (response.ok) {
        const data = await response.json();
        setConfigStatus(data);
      }
    } catch (err) {
      console.error('Error checking HF config:', err);
    }
  };

  const checkConnectionStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/huggingface/status`, {
        credentials: 'include' // Important for session cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      } else {
        setConnectionStatus({ connected: false });
      }
    } catch (err) {
      console.error('Error checking HF connection:', err);
      setError('Failed to check connection status');
      setConnectionStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Fix: Use /huggingface/login instead of /oauth/huggingface/login
    window.location.href = `${API_BASE_URL}/huggingface/login`;
  };

  const handleDisconnect = async () => {
    // Fix: Use async fetch for POST logout endpoint instead of redirect
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/huggingface/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        localStorage.removeItem('hf_session_token');
        await checkConnectionStatus(); // Refresh the connection status
      } else {
        setError('Failed to disconnect.');
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError('Failed to disconnect.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="modern-page">
        <div className="modern-container">
          <div className="modern-card text-center">
            <CircularProgress size={60} sx={{ color: 'var(--primary-color)' }} />
            <Typography className="modern-subtitle mt-md">
              Checking Hugging Face connection...
            </Typography>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-page">
      <div className="modern-page-header">
        <div className="modern-container">
          <Typography variant="h3" className="modern-title text-center mb-md">
            🤗 Hugging Face Authentication
          </Typography>
          <Typography className="modern-text text-center modern-text-muted">
            Test your Hugging Face OAuth integration. Connect your account to enable model uploads and inference.
          </Typography>
        </div>
      </div>
      
      <div className="modern-page-content">
        <div className="modern-container modern-container-sm">
          {error && (
            <div className="modern-alert modern-alert-error">
              {error}
            </div>
          )}

          {configStatus && (
            <div className="modern-card">
              <div className="modern-card-header">
                <Typography className="modern-card-title">🔧 OAuth Configuration Status</Typography>
              </div>
              
              <div className="d-flex gap-md" style={{ flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span className={`modern-chip ${configStatus.client_id_configured ? 'modern-chip-success' : 'modern-chip-error'}`}>
                    Client ID: {configStatus.client_id_configured ? 'Configured' : 'Missing'}
                  </span>
                  {configStatus.client_id_preview && (
                    <Typography variant="caption" className="modern-text-muted">
                      ({configStatus.client_id_preview})
                    </Typography>
                  )}
                </Box>
                <span className={`modern-chip ${configStatus.client_secret_configured ? 'modern-chip-success' : 'modern-chip-error'}`}>
                  Client Secret: {configStatus.client_secret_configured ? 'Configured' : 'Missing'}
                </span>
                <Typography className="modern-text-sm modern-text-muted">
                  <strong>Redirect URI:</strong> {configStatus.redirect_uri}
                </Typography>
                {(!configStatus.client_id_configured || !configStatus.client_secret_configured) && (
                  <div className="modern-alert modern-alert-warning">
                    OAuth is not fully configured. Please set the HUGGINGFACE_CLIENT_ID and HUGGINGFACE_CLIENT_SECRET environment variables.
                  </div>
                )}
              </div>
            </div>
          )}

          {connectionStatus ? (
            <Box>
              {connectionStatus.connected ? (
                <div className="modern-card" style={{ border: '1px solid var(--success-color)', background: 'rgba(16, 185, 129, 0.05)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      src={connectionStatus.user_info?.picture} 
                      sx={{ mr: 2, width: 56, height: 56 }}
                    />
                    <Box>
                      <Typography className="modern-subtitle" style={{ color: 'var(--success-hover)' }}>
                        ✅ Successfully Connected!
                      </Typography>
                      <Typography className="modern-text">
                        Welcome, <strong>{connectionStatus.username}</strong>!
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <div className="d-flex gap-lg" style={{ flexDirection: 'column' }}>
                    <Box>
                      <Typography className="modern-text-sm" style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                        Account Information:
                      </Typography>
                      <Typography className="modern-text-sm">
                        <strong>Name:</strong> {connectionStatus.user_info?.name || 'N/A'}
                      </Typography>
                      <Typography className="modern-text-sm">
                        <strong>Email:</strong> {connectionStatus.user_info?.email || 'N/A'}
                      </Typography>
                      <Typography className="modern-text-sm">
                        <strong>Username:</strong> {connectionStatus.username}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography className="modern-text-sm" style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                        Account Status:
                      </Typography>
                      <div className="d-flex gap-sm" style={{ flexWrap: 'wrap' }}>
                        {connectionStatus.user_info?.is_pro && (
                          <span className="modern-chip modern-chip-info">Pro Account</span>
                        )}
                        <span className={`modern-chip ${connectionStatus.user_info?.is_pro ? 'modern-chip-success' : 'modern-chip-default'}`}>
                          {connectionStatus.user_info?.is_pro ? "Pro User" : "Free User"}
                        </span>
                      </div>
                    </Box>
                    
                    <Box>
                      <Typography className="modern-text-sm" style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                        Session Information:
                      </Typography>
                      <Typography className="modern-text-sm">
                        <strong>Token expires:</strong> {formatDate(connectionStatus.expires_at)}
                      </Typography>
                    </Box>
                  </div>
                </div>
              ) : (
                <div className="modern-card text-center" style={{ border: '1px solid var(--warning-color)', background: 'rgba(245, 158, 11, 0.05)' }}>
                  <Typography className="modern-subtitle" style={{ color: 'var(--warning-hover)' }}>
                    ❌ Not Connected
                  </Typography>
                  <Typography className="modern-text modern-text-muted">
                    You need to connect your Hugging Face account to use model upload and inference features.
                  </Typography>
                </div>
              )}

              <div className="modern-card">
                <div className="d-flex gap-md justify-center" style={{ flexWrap: 'wrap' }}>
                  {connectionStatus.connected ? (
                    <>
                      <button
                        className="modern-btn modern-btn-secondary"
                        onClick={handleDisconnect}
                      >
                        Disconnect Account
                      </button>
                      <button
                        className="modern-btn modern-btn-primary"
                        onClick={checkConnectionStatus}
                      >
                        Refresh Status
                      </button>
                    </>
                  ) : (
                    <button
                      className="modern-btn modern-btn-primary"
                      onClick={handleConnect}
                      style={{ minWidth: '200px' }}
                    >
                      Connect to Hugging Face
                    </button>
                  )}
                </div>
              </div>
            </Box>
          ) : (
            <div className="modern-card text-center">
              <div className="modern-alert modern-alert-warning">
                Unable to determine connection status. Please try refreshing the page.
              </div>
              <button
                className="modern-btn modern-btn-primary"
                onClick={checkConnectionStatus}
              >
                Check Connection
              </button>
            </div>
          )}

          <div className="modern-card text-center">
            <Typography className="modern-subtitle mb-md">
              What does this test?
            </Typography>
            <Typography className="modern-text modern-text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
              This page tests the OAuth integration with Hugging Face. When connected, you can upload fine-tuned models 
              directly to your Hugging Face account and use the Inference API to test models. The authentication is 
              handled securely using OAuth 2.0 without storing your tokens locally.
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HuggingFaceTestPage;
