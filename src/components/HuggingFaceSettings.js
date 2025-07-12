import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip
} from '@mui/material';
import { API_BASE_URL } from '../api';

const HuggingFaceSettings = ({ currentUser, projectId }) => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    modelName: '',
    description: 'Fine-tuned model from Gemma Garage',
    private: false,
    requestId: ''
  });

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
      
      // Get session token from localStorage
      const sessionToken = localStorage.getItem('hf_session_token');
      console.log('Session token from localStorage:', sessionToken);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add session token to headers if available
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
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
        setError(null); // Clear any previous errors
      } else {
        console.error('HF status check failed:', response.status, response.statusText);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('HF status error response:', errorText);
        setConnectionStatus({ connected: false });
        setError(`Connection check failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error checking HF connection:', err);
      setError(`Failed to check connection status: ${err.message}`);
      setConnectionStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to the HF OAuth login endpoint with project ID as request_id
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
        setConnectionStatus({ connected: false });
        setError(null);
      } else {
        setError('Failed to disconnect');
      }
    } catch (err) {
      setError('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadModel = async () => {
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
      
      const response = await fetch(`${API_BASE_URL}/huggingface/upload_model`, {
        method: 'POST',
        headers,
        credentials: 'include', // Important for session cookies
        body: JSON.stringify({
          model_name: uploadForm.modelName,
          request_id: uploadForm.requestId,
          description: uploadForm.description,
          private: uploadForm.private,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload model');
      }

      const data = await response.json();
      setUploadDialogOpen(false);
      setUploadForm({
        modelName: '',
        description: 'Fine-tuned model from Gemma Garage',
        private: false,
        requestId: ''
      });
      
      // Show success message
      alert(`Model uploaded successfully! Repository: ${data.repo_url}`);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center', mb: 2 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading Hugging Face settings...</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        🤗 Hugging Face Integration
      </Typography>
      
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
              variant="contained"
              onClick={() => setUploadDialogOpen(true)}
              disabled={loading}
            >
              Upload Model to HF
            </Button>
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

      {/* Upload Model Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Model to Hugging Face</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Model Name"
              value={uploadForm.modelName}
              onChange={(e) => setUploadForm({ ...uploadForm, modelName: e.target.value })}
              sx={{ mb: 2 }}
              helperText="This will be the repository name on Hugging Face"
            />
            <TextField
              fullWidth
              label="Request ID"
              value={uploadForm.requestId}
              onChange={(e) => setUploadForm({ ...uploadForm, requestId: e.target.value })}
              sx={{ mb: 2 }}
              helperText="The fine-tuning request ID containing your model"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={uploadForm.private}
                  onChange={(e) => setUploadForm({ ...uploadForm, private: e.target.checked })}
                />
              }
              label="Make repository private"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUploadModel}
            variant="contained"
            disabled={!uploadForm.modelName || !uploadForm.requestId || loading}
          >
            Upload Model
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default HuggingFaceSettings;
