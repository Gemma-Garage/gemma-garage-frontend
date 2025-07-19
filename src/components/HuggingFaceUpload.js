import React, { useState, useEffect } from 'react';
import {
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
import '../style/modern.css';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { API_BASE_URL } from '../api';

const HuggingFaceUpload = ({ currentRequestId, trainingStatus, modelName, trainedModelPath, connectionStatus }) => {
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

  // Auto-populate upload form when training completes or when we have a trained model path
  useEffect(() => {
    const hasCompletedTraining = (currentRequestId && trainingStatus && trainingStatus.toLowerCase().includes("complete")) || trainedModelPath;
    
    if (hasCompletedTraining) {
      // Extract request ID from trainedModelPath if currentRequestId is not available
      let requestIdToUse = currentRequestId;
      if (!requestIdToUse && trainedModelPath) {
        // Extract request ID from path like: gs://bucket/model/request-id/final_model/
        const pathParts = trainedModelPath.split('/');
        const modelIndex = pathParts.findIndex(part => part === 'model');
        if (modelIndex !== -1 && modelIndex + 1 < pathParts.length) {
          requestIdToUse = pathParts[modelIndex + 1];
        }
      }
      
      // Sanitize model name for HuggingFace repository naming
      let sanitizedModelName = 'gemma-fine-tuned';
      if (modelName) {
        // Remove organization prefix and clean up the name
        const cleanName = modelName.replace(/^(google\/|microsoft\/|meta\/|huggingface\/)/, '');
        // Replace any remaining slashes or invalid characters
        sanitizedModelName = cleanName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
        // Ensure it doesn't start or end with hyphens
        sanitizedModelName = sanitizedModelName.replace(/^-+|-+$/g, '');
        // Add fine-tuned suffix
        sanitizedModelName = `${sanitizedModelName}-fine-tuned`;
        // Ensure it's not too long (HF limit is 96 chars)
        if (sanitizedModelName.length > 90) {
          sanitizedModelName = sanitizedModelName.substring(0, 90) + '-fine-tuned';
        }
      }
      
      setUploadForm(prev => ({
        ...prev,
        requestId: requestIdToUse || '',
        modelName: sanitizedModelName,
        description: `Fine-tuned ${modelName || 'Gemma'} model from Gemma Garage`,
        baseModel: modelName || 'google/gemma-2b'
      }));
    }
  }, [currentRequestId, trainingStatus, modelName, trainedModelPath]);

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

  const validateModelName = (name) => {
    // HuggingFace repository naming rules
    const validPattern = /^[a-zA-Z0-9-]+$/;
    if (!validPattern.test(name)) {
      return "Model name can only contain letters, numbers, and hyphens";
    }
    if (name.startsWith('-') || name.endsWith('-')) {
      return "Model name cannot start or end with a hyphen";
    }
    if (name.length > 96) {
      return "Model name cannot be longer than 96 characters";
    }
    if (name.length < 1) {
      return "Model name cannot be empty";
    }
    return null;
  };

  const handleUploadModel = async () => {
    // Validate model name before upload
    const validationError = validateModelName(uploadForm.modelName);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get session token from localStorage as fallback
      const sessionToken = localStorage.getItem('hf_session_token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add session token to headers if available (as fallback)
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

  // Don't show anything if training is not complete and we don't have a trained model path
  // Extract request ID from trainedModelPath if currentRequestId is not available
  let requestIdToUse = currentRequestId;
  if (!requestIdToUse && trainedModelPath) {
    const pathParts = trainedModelPath.split('/');
    const modelIndex = pathParts.findIndex(part => part === 'model');
    if (modelIndex !== -1 && modelIndex + 1 < pathParts.length) {
      requestIdToUse = pathParts[modelIndex + 1];
    }
  }
  
  const hasCompletedTraining = (requestIdToUse && trainingStatus && trainingStatus.toLowerCase().includes("complete")) || trainedModelPath;
  
  if (!hasCompletedTraining) {
    return null;
  }

  const isConnected = connectionStatus?.connected;

  return (
    <>
      <div className="modern-card mt-3 mb-3">
        <div className="modern-card-header">
          <h2 className="modern-card-title">Upload to Hugging Face</h2>
        </div>
        
        {error && (
          <div className="modern-alert modern-alert-error mb-3">
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
            {error.includes("rate limiting") && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" display="block">
                  ⏰ <strong>Rate Limiting:</strong>
                </Typography>
                <ul style={{ fontSize: '0.75rem', margin: '4px 0', paddingLeft: '16px' }}>
                  <li>HuggingFace is limiting API requests</li>
                  <li>Please wait 2-5 minutes before trying again</li>
                  <li>This is a temporary restriction from HuggingFace</li>
                </ul>
              </Box>
            )}
          </div>
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
            {trainedModelPath && !trainingStatus?.toLowerCase().includes("complete") && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Using previously trained model from: {trainedModelPath}
              </Typography>
            )}
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
      </div>

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
              error={!!validateModelName(uploadForm.modelName)}
              FormHelperTextProps={{
                error: !!validateModelName(uploadForm.modelName)
              }}
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
            disabled={loading || !uploadForm.modelName.trim() || (!uploadForm.requestId && !trainedModelPath)}
          >
            {loading ? <CircularProgress size={20} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HuggingFaceUpload;
