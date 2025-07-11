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

const HuggingFaceTestPage = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkConnectionStatus();
    
    // Check for OAuth callback success parameter
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    if (success === 'true') {
      // Remove the success parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Recheck connection status after successful OAuth
      setTimeout(checkConnectionStatus, 1000);
    }
  }, []);

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
    // Redirect to the HF OAuth login endpoint
    window.location.href = `${API_BASE_URL}/oauth/huggingface/login`;
  };

  const handleDisconnect = () => {
    // Redirect to the HF OAuth logout endpoint
    window.location.href = `${API_BASE_URL}/oauth/huggingface/logout`;
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
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Checking Hugging Face connection...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
          🤗 Hugging Face Authentication Test
        </Typography>
        
        <Typography variant="body1" sx={{ textAlign: 'center', mb: 4, color: 'text.secondary' }}>
          Test your Hugging Face OAuth integration. Connect your account to enable model uploads and inference.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {connectionStatus ? (
          <Box>
            {connectionStatus.connected ? (
              <Card variant="outlined" sx={{ mb: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      src={connectionStatus.user_info?.picture} 
                      sx={{ mr: 2, width: 56, height: 56 }}
                    />
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        ✅ Successfully Connected!
                      </Typography>
                      <Typography variant="body1">
                        Welcome, <strong>{connectionStatus.username}</strong>!
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Account Information:
                      </Typography>
                      <Typography variant="body2">
                        <strong>Name:</strong> {connectionStatus.user_info?.name || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Email:</strong> {connectionStatus.user_info?.email || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Username:</strong> {connectionStatus.username}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Account Status:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {connectionStatus.user_info?.is_pro && (
                          <Chip label="Pro Account" color="primary" size="small" />
                        )}
                        <Chip 
                          label={connectionStatus.user_info?.is_pro ? "Pro User" : "Free User"} 
                          color={connectionStatus.user_info?.is_pro ? "success" : "default"} 
                          size="small" 
                        />
                      </Box>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Session Information:
                      </Typography>
                      <Typography variant="body2">
                        <strong>Token expires:</strong> {formatDate(connectionStatus.expires_at)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <Card variant="outlined" sx={{ mb: 3, bgcolor: 'warning.light' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" gutterBottom>
                    ❌ Not Connected
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    You need to connect your Hugging Face account to use model upload and inference features.
                  </Typography>
                </CardContent>
              </Card>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {connectionStatus.connected ? (
                <>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleDisconnect}
                    size="large"
                  >
                    Disconnect Account
                  </Button>
                  <Button
                    variant="contained"
                    onClick={checkConnectionStatus}
                    size="large"
                  >
                    Refresh Status
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleConnect}
                  size="large"
                  sx={{ minWidth: 200 }}
                >
                  Connect to Hugging Face
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Unable to determine connection status. Please try refreshing the page.
            </Alert>
            <Button
              variant="contained"
              onClick={checkConnectionStatus}
              size="large"
            >
              Check Connection
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            What does this test?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            This page tests the OAuth integration with Hugging Face. When connected, you can upload fine-tuned models 
            directly to your Hugging Face account and use the Inference API to test models. The authentication is 
            handled securely using OAuth 2.0 without storing your tokens locally.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default HuggingFaceTestPage;
