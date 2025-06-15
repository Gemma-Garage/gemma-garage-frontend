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

// Custom theme (can remain as is)
const theme = createTheme({
  palette: {
    primary: {
      main: '#6200ee',
    },
    secondary: {
      main: '#3700b3',
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
      <Paper elevation={3} sx={{ padding: 3, marginBottom: 2, backgroundColor: "#f9f9f9", borderRadius: "16px", boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.1)' }}>
        <Typography variant="h5" gutterBottom className="sessionName">
          Test Fine-Tuned LLM
        </Typography>
        
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <FormControl fullWidth>
            <FormLabel sx={{ marginBottom: 1, color: "text.primary", fontWeight: "medium" }}>
              Request ID (Model to Test)
            </FormLabel>
            <TextField
              value={currentRequestId || ""} // Display the currentRequestId from props
              disabled // Typically, this would be non-editable here, as it's derived from training
              variant="outlined"
              fullWidth
              helperText="This ID specifies the trained model to use for inference."
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel sx={{ marginBottom: 1, color: "text.primary", fontWeight: "medium" }}>
              Base Model
            </FormLabel>
            <TextField
              value={currentBaseModel || ""} // Display the currentBaseModel from props
              disabled // Typically, this would be non-editable here
              variant="outlined"
              fullWidth
              helperText="The base model used for this fine-tuned version."
            />
          </FormControl>
          
          <FormControl fullWidth>
            <FormLabel sx={{ marginBottom: 1, color: "text.primary", fontWeight: "medium" }}>
              Prompt
            </FormLabel>
            <TextField
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              multiline
              rows={6}
              variant="outlined"
              fullWidth
            />
          </FormControl>
          
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            onClick={handleTest}
            disabled={loading || !currentRequestId || !currentBaseModel} // Disable if loading or no currentRequestId or no currentBaseModel
            sx={{ 
              backgroundColor: "#6200ee", 
              "&:hover": { backgroundColor: "#3700b3" },
              alignSelf: "flex-start"
            }}
          >
            {loading ? "Testing..." : "Test Model"}
          </Button>
          
          <Box sx={{ marginTop: 2 }}>
            <Typography variant="h6" gutterBottom>
              Response:
            </Typography>
            <Paper 
              elevation={1} 
              sx={{ 
                padding: 2, 
                backgroundColor: "#f5f5f5", 
                minHeight: "100px",
                whiteSpace: "pre-wrap"
              }}
            >
              {response || "Response will appear here..."}
            </Paper>
          </Box>
        </Box>
      </Paper>
    </ThemeProvider>
  );
};

export default TestLLM;
