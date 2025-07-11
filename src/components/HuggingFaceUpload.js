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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { API_BASE_URL } from '../api';

const HuggingFaceUpload = ({ currentRequestId, trainingStatus, modelName, connectionStatus }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [permissionsInfo, setPermissionsInfo] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    modelName: '',
    description: 'Fine-tuned model from Gemma Garage',
    private: false,
    requestId: '',
    baseModel: ''
  });

  // Auto-populate upload form when training completes
  useEffect(() => {
    if (currentRequestId && trainingStatus && trainingStatus.toLowerCase().includes("complete")) {
      setUploadForm(prev => ({
        ...prev,
        requestId: currentRequestId,
        modelName: modelName ? `${modelName.replace('google/', '')}-fine-tuned` : 'gemma-fine-tuned',
        description: `Fine-tuned ${modelName || 'Gemma'} model from Gemma Garage`,
        baseModel: modelName || 'google/gemma-2b'
      }));
    }
  }, [currentRequestId, trainingStatus, modelName]);

  const checkTokenPermissions = async () => {
    try {
      setCheckingPermissions(true);
      setError(null);
      
      const sessionToken = localStorage.getItem('hf_session_token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/huggingface/token-permissions`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to check permissions');
      }

      const data = await response.json();
      setPermissionsInfo(data);
      
    } catch (err) {
      setError(`Failed to check permissions: ${err.message}`);
    } finally {
      setCheckingPermissions(false);
    }
  };

  const handleUploadModel = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
          base_model: uploadForm.baseModel,
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
        requestId: '',
        baseModel: ''
      });
      
      // Show success message
      alert(`Model uploaded successfully! Repository: ${data.repo_url}`);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Don't show anything if training is not complete
  if (!currentRequestId || !trainingStatus || !trainingStatus.toLowerCase().includes("complete")) {
    return null;
  }

  const isConnected = connectionStatus?.connected;

  return (
    <>
      <Paper elevation={3} sx={{ padding: 3, marginTop: 2, marginBottom: 2, backgroundColor: "#f9f9f9", borderRadius: "16px", boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.1)' }}>
        <Typography variant="h5" gutterBottom className="sessionName">
          Upload to Hugging Face
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" component="div">
              <strong>Error:</strong> {error}
            </Typography>
            {error.includes("don't have the rights") && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" display="block">
                  💡 <strong>Troubleshooting tips:</strong>
                </Typography>
                <ul style={{ fontSize: '0.75rem', margin: '4px 0', paddingLeft: '16px' }}>
                  <li>Check your HF token has 'write-repos' permissions</li>
                  <li>Verify your HuggingFace account is verified</li>
                  <li>Try creating a test repository manually on HuggingFace.co first</li>
                </ul>
              </Box>
            )}
          </Alert>
        )}

        {isConnected && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={checkTokenPermissions}
              disabled={checkingPermissions}
              sx={{ mb: 1 }}
            >
              {checkingPermissions ? <CircularProgress size={16} /> : 'Check Token Permissions'}
            </Button>
            
            {permissionsInfo && (
              <Alert 
                severity={permissionsInfo.can_create_repos ? "success" : "warning"} 
                sx={{ mt: 1, fontSize: '0.875rem' }}
              >
                <Typography variant="body2">
                  <strong>User:</strong> {permissionsInfo.user} | 
                  <strong> Role:</strong> {permissionsInfo.permissions.role} | 
                  <strong> Can create repos:</strong> {permissionsInfo.can_create_repos ? "✅ Yes" : "❌ No"}
                </Typography>
                {!permissionsInfo.can_create_repos && (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    ⚠️ Your token doesn't have write permissions. Please reconnect with 'write-repos' scope.
                  </Typography>
                )}
              </Alert>
            )}
          </Box>
        )}

        {!isConnected ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Connect to Hugging Face first</strong> to upload your fine-tuned model. 
            Use the Hugging Face integration section above to connect your account.
          </Alert>
        ) : (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Ready to upload your fine-tuned model to Hugging Face!
          </Alert>
        )}

        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => setUploadDialogOpen(true)}
          disabled={!isConnected || loading}
          sx={{ 
            backgroundColor: isConnected ? "#FF6B35" : "#e0e0e0",
            "&:hover": { backgroundColor: isConnected ? "#E55A2B" : "#e0e0e0" },
            "&:disabled": { backgroundColor: "#e0e0e0" }
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} color="inherit" sx={{ marginRight: 1 }} />
              Uploading...
            </>
          ) : (
            "Upload Model to Hugging Face"
          )}
        </Button>

        {isConnected && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Upload your fine-tuned model directly to your Hugging Face profile
          </Typography>
        )}
      </Paper>

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
              InputProps={{
                readOnly: true,
              }}
            />
            <TextField
              fullWidth
              label="Base Model"
              value={uploadForm.baseModel}
              onChange={(e) => setUploadForm({ ...uploadForm, baseModel: e.target.value })}
              sx={{ mb: 2 }}
              helperText="The base model that was fine-tuned"
              InputProps={{
                readOnly: true,
              }}
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
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUploadModel}
            variant="contained"
            disabled={loading || !uploadForm.modelName.trim() || !uploadForm.requestId}
          >
            {loading ? <CircularProgress size={20} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HuggingFaceUpload;
