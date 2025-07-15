import React, { useState } from "react"; // Removed useRef
import { 
  Paper, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  CircularProgress,
  FormControl,
  FormLabel
} from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
// Select component might not be needed if model is determined by requestId
// import Select from "react-select"; 
import SendIcon from "@mui/icons-material/Send";
import { API_INFERENCE_BASE_URL } from "../api"; // Import API_INFERENCE_BASE_URL
import "../style/assets.css";
import "../style/modern.css";

// Custom theme (can remain as is)
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#1d4ed8',
    },
  },
});

// Custom styles for react-select (can be removed if Select is not used)
// const selectStyles = { ... };

// modelOptions might not be needed if model is determined by requestId
// const modelOptions = [ ... ];

const TestLLM = ({ currentRequestId, currentBaseModel }) => { // Accept currentRequestId and currentBaseModel as props
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  
  // The request ID to use will now come from the prop
  // If no currentRequestId is passed, the input field will be empty and button potentially disabled.

  const handleTest = async () => {
    if (!prompt.trim()) {
      alert("Please enter a prompt.");
      return;
    }
    if (!currentRequestId) { // Check if currentRequestId is available
      alert("Request ID is missing. Please ensure a model has been trained and selected.");
      return;
    }
    if (!currentBaseModel) { // Check if currentBaseModel is available
      alert("Base model is missing. Please ensure a model has been trained and selected.");
      return;
    }
    setLoading(true);
    setResponse(""); 

    try {
      // const data = await callPredictEndpoint(prompt, currentRequestId); // Use currentRequestId
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
    } catch (error) {
      console.error("API call error", error);
      setResponse(`API call error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="modern-card-header">
        <Typography className="modern-card-title">Test Fine-Tuned LLM</Typography>
        <Typography className="modern-card-subtitle">
          Test your fine-tuned model with custom prompts and see the results
        </Typography>
      </div>
      
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div className="modern-form-group">
          <label className="modern-form-label">
            Request ID (Model to Test)
          </label>
          <input
            className="modern-input"
            value={currentRequestId || ""} // Display the currentRequestId from props
            disabled // Typically, this would be non-editable here, as it's derived from training
            placeholder="This ID specifies the trained model to use for inference."
          />
        </div>

        <div className="modern-form-group">
          <label className="modern-form-label">
            Base Model
          </label>
          <input
            className="modern-input"
            value={currentBaseModel || ""} // Display the currentBaseModel from props
            disabled // Typically, this would be non-editable here
            placeholder="The base model used for this fine-tuned version."
          />
        </div>
        
        <div className="modern-form-group">
          <label className="modern-form-label">
            Prompt
          </label>
          <textarea
            className="modern-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={6}
            style={{ resize: 'vertical', minHeight: '120px' }}
          />
        </div>
        
        <button
          className={`modern-btn modern-btn-primary ${loading ? 'modern-btn-loading' : ''}`}
          onClick={handleTest}
          disabled={loading || !currentRequestId || !currentBaseModel} // Disable if loading or no currentRequestId or no currentBaseModel
          style={{ alignSelf: "flex-start" }}
        >
          {loading && <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />}
          {loading ? <SendIcon sx={{ fontSize: 16 }} /> : <SendIcon sx={{ fontSize: 16 }} />}
          {loading ? "Testing..." : "Test Model"}
        </button>
        
        <Box sx={{ marginTop: 2 }}>
          <Typography className="modern-subtitle mb-md">
            Response:
          </Typography>
          <div 
            className="modern-input"
            style={{ 
              padding: 'var(--spacing-md)', 
              backgroundColor: 'var(--bg-tertiary)', 
              minHeight: "100px",
              whiteSpace: "pre-wrap",
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}
          >
            {response || "Response will appear here..."}
          </div>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default TestLLM;
