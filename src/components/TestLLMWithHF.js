import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch
} from '@mui/material';
import { API_BASE_URL, API_INFERENCE_BASE_URL } from '../api';

const TestLLMWithHF = ({ currentUser, currentRequestId, currentBaseModel }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useHuggingFace, setUseHuggingFace] = useState(false);
  const [hfModelName, setHfModelName] = useState('');
  const [maxNewTokens, setMaxNewTokens] = useState(100);

  const handleTest = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse('');

    try {
      if (useHuggingFace) {
        // Use Hugging Face Inference API
        if (!hfModelName.trim()) {
          setError("Please enter a Hugging Face model name");
          return;
        }

        // Get session token from localStorage
        const sessionToken = localStorage.getItem('hf_session_token');
        const headers = {
          'Content-Type': 'application/json'
        };
        
        // Add session token to headers if available
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        }

        const hfResponse = await fetch(`${API_BASE_URL}/huggingface/inference`, {
          method: 'POST',
          headers,
          credentials: 'include', // Important for session cookies
          body: JSON.stringify({
            model_name: hfModelName,
            prompt: prompt,
            max_new_tokens: maxNewTokens
          }),
        });

        if (!hfResponse.ok) {
          const errorData = await hfResponse.json();
          throw new Error(errorData.detail || 'Hugging Face inference failed');
        }

        const hfData = await hfResponse.json();
        setResponse(hfData.response);

      } else {
        // Use original Gemma Garage inference
        if (!currentRequestId) {
          setError("No request ID found. Please complete fine-tuning first.");
          return;
        }

        const predictResponse = await fetch(`${API_INFERENCE_BASE_URL}/inference/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt,
            request_id: currentRequestId,
            base_model: currentBaseModel
          }),
        });

        if (!predictResponse.ok) {
          const errorBody = await predictResponse.text();
          throw new Error(`API call failed with status ${predictResponse.status}: ${errorBody}`);
        }

        const data = await predictResponse.json();

        if (data.response) {
          setResponse(data.response);
        } else if (data.error) {
          setResponse(`Error: ${data.error}`);
        } else {
          setResponse("Received an unexpected response format.");
        }
      }

    } catch (err) {
      console.error("API call error", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ padding: 3, marginTop: 2 }}>
      <Typography variant="h6" gutterBottom>
        🧪 Test Your Model
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={useHuggingFace}
              onChange={(e) => setUseHuggingFace(e.target.checked)}
            />
          }
          label="Use Hugging Face Inference API"
        />
      </Box>

      {useHuggingFace && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Hugging Face Model Name"
            value={hfModelName}
            onChange={(e) => setHfModelName(e.target.value)}
            placeholder="username/model-name"
            helperText="Enter the full model name from Hugging Face (e.g., microsoft/DialoGPT-medium)"
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
      )}

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
        disabled={loading || !prompt.trim() || (useHuggingFace && !hfModelName.trim())}
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Generate Response'}
      </Button>

      {response && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Response:
          </Typography>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              backgroundColor: '#f5f5f5',
              maxHeight: 300,
              overflow: 'auto'
            }}
          >
            <Typography
              variant="body1"
              component="pre"
              sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
            >
              {response}
            </Typography>
          </Paper>
        </Box>
      )}

      {!useHuggingFace && !currentRequestId && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Complete a fine-tuning job first to test your custom model, or enable Hugging Face inference to test any HF model.
        </Alert>
      )}
    </Paper>
  );
};

export default TestLLMWithHF;
