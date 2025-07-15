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
import "../style/modern.css";

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
    <div>
      <div className="modern-card-header">
        <Typography className="modern-card-title">Start Fine-Tuning</Typography>
        <Typography className="modern-card-subtitle">
          Begin training your model with the configured parameters
        </Typography>
      </div>
      
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
        <button
          className={`modern-btn modern-btn-primary ${loading ? 'modern-btn-loading' : ''}`}
          onClick={handleStartFineTuning}
          disabled={loading}
        >
          {loading ? (
            <>
              <CircularProgress size={16} color="inherit" sx={{ marginRight: 1 }} />
              <PlayArrowIcon sx={{ fontSize: 16, mr: 1 }} />
              Fine-Tuning in Progress
            </>
          ) : (
            <>
              <PlayArrowIcon sx={{ fontSize: 16 }} />
              Start Fine-Tuning
            </>
          )}
        </button>
        
        {/* Pretraining Progress Bar */}
        {extractPretrainLogs(allLogs || []).length > 0 && (
          <Box sx={{ width: '100%', mt: 1 }}>
            <PretrainStepProgress logs={extractPretrainLogs(allLogs || [])} />
          </Box>
        )}
        
        {/* Training Progress Bar */} 
        {loading && progress && progress.total_steps > 0 && (
          <Box sx={{ width: '100%', mt: 1, mb: 1 }}>
            <Typography className="modern-text-sm modern-text-muted mb-sm">
              {`Epoch: ${progress.current_epoch + 1}/${progress.total_epochs} | Step: ${progress.current_step}/${progress.total_steps}`}
            </Typography>
            <div className="modern-progress">
              <div 
                className="modern-progress-bar" 
                style={{ width: `${overallProgressPercentage}%` }}
              ></div>
            </div>
          </Box>
        )}

        {wsStatus && (
          <div className={`modern-alert ${
            wsStatus.toLowerCase().includes("error") ? "modern-alert-error" : 
            wsStatus.toLowerCase().includes("complete") ? "modern-alert-success" : 
            "modern-alert-info"
          }`} style={{ width: "100%" }}>
            <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
              {wsStatus.toLowerCase().includes("error") ? "Error" : wsStatus.toLowerCase().includes("complete") ? "Success" : "Status"}
            </div>
            {wsStatus}
          </div>
        )}
      </Box>
    </div>
  );
};

export default FinetuneControl;
