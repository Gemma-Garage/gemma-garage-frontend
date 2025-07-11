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

const HuggingFaceSettings = ({ currentUser }) => {
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
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to the HF OAuth login endpoint provided by attach_huggingface_oauth
    window.location.href = `${API_BASE_URL}/oauth/huggingface/login`;
  };

  const handleDisconnect = () => {
    // Redirect to the HF OAuth logout endpoint provided by attach_huggingface_oauth
    window.location.href = `${API_BASE_URL}/oauth/huggingface/logout`;
  };

  const handleUploadModel = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/huggingface/upload_model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading Hugging Face settings...</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        🤗 Hugging Face Integration
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="body1" gutterBottom>
          Connect your Hugging Face account to upload your fine-tuned models and use HF Inference API.
        </Typography>
      </Box>

      {connectionStatus?.connected ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2">
                  Connected as <Chip label={connectionStatus.username} size="small" color="primary" />
                </Typography>
                {connectionStatus.user_info && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {connectionStatus.user_info.name} ({connectionStatus.user_info.email})
                    {connectionStatus.user_info.is_pro && ' • Pro User'}
                  </Typography>
                )}
                {connectionStatus.expires_at && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Token expires: {new Date(connectionStatus.expires_at).toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Box>
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
            Your Hugging Face account is not connected.
          </Alert>
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            Sign in with Hugging Face
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
              helperText="The request ID from your fine-tuning job"
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
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
              label="Private repository"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
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
