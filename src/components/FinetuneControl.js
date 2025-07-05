import React, { useState } from "react";
import {
  Button,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  LinearProgress // Import LinearProgress
  // TextField import removed
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PretrainStepProgress from "./PretrainStepProgress";
import { extractPretrainLogs } from "../utils/pretrainLogUtils";
import "../style/assets.css";

const FinetuneControl = ({ onStart, wsStatus, progress, allLogs }) => {
  const [loading, setLoading] = useState(false);
  // const [epochs, setEpochs] = useState(1); // Removed state for epochs

  const handleStartFineTuning = () => {
    setLoading(true);
    onStart(); // Reverted: Pass epochs to onStart
    // We don't set loading to false here because training is asynchronous
    // and progress is shown through wsStatus
  };

  // Reset loading state when fine-tuning completes
  React.useEffect(() => {
    if (wsStatus && (wsStatus.toLowerCase().includes("complete") || wsStatus.toLowerCase().includes("error"))) {
      setLoading(false);
    }
  }, [wsStatus]);

  // Calculate overall progress percentage
  const calculateOverallProgress = () => {
    if (!progress || !progress.total_steps || progress.total_steps === 0) {
      return 0;
    }
    // Simple progress: current_step / total_steps
    // More advanced: consider epochs if steps reset per epoch
    // const epochProgress = progress.current_epoch / progress.total_epochs;
    // const stepProgressInEpoch = progress.current_step / progress.total_steps_in_epoch; // Needs total_steps_in_epoch
    // For now, using global step count if available and meaningful
    return (progress.current_step / progress.total_steps) * 100;
  };

  const overallProgressPercentage = calculateOverallProgress();

  return (
    <Paper elevation={3} sx={{ padding: 3, marginBottom: 2, backgroundColor: "#f9f9f9", borderRadius: "16px", boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.1)' }}>
      <Typography variant="h5" gutterBottom className="sessionName">
        Start Fine-Tuning
      </Typography>
      
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
        {/* TextField for epochs removed */}
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={handleStartFineTuning}
          disabled={loading}
          sx={{ 
            backgroundColor: "#6200ee", 
            "&:hover": { backgroundColor: "#3700b3" } 
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={24} color="inherit" sx={{ marginRight: 1 }} />
              Fine-Tuning in Progress
            </>
          ) : (
            "Start Fine-Tuning"
          )}
        </Button>
        
        {/* Pretraining Progress Bar */}
        {extractPretrainLogs(allLogs || []).length > 0 && (
          <Box sx={{ width: '100%', mt: 1 }}>
            <PretrainStepProgress logs={extractPretrainLogs(allLogs || [])} />
          </Box>
        )}
        
        {/* Training Progress Bar */} 
        {loading && progress && progress.total_steps > 0 && (
          <Box sx={{ width: '100%', mt: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {`Epoch: ${progress.current_epoch + 1}/${progress.total_epochs} | Step: ${progress.current_step}/${progress.total_steps}`}
            </Typography>
            <LinearProgress variant="determinate" value={overallProgressPercentage} />
          </Box>
        )}

        {wsStatus && (
          <Alert 
            severity={wsStatus.toLowerCase().includes("error") ? "error" : wsStatus.toLowerCase().includes("complete") ? "success" : "info"}
            sx={{ width: "100%" }}
          >
            <AlertTitle>
              {wsStatus.toLowerCase().includes("error") ? "Error" : wsStatus.toLowerCase().includes("complete") ? "Success" : "Status"}
            </AlertTitle>
            {wsStatus}
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

export default FinetuneControl;
