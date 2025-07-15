import React from "react";
import { Box, Stepper, Step, StepLabel, Typography } from "@mui/material";
import '../style/modern.css';

const PRETRAIN_STEPS = [
  "Job Submitted",
  "Job Instantiated",
  "Dataset Loading",
  "Model Loading",
  "Dataset Formatting",
  "Training Start"
];

export default function PretrainStepProgress({ logs }) {
  // Find the highest completed step from logs
  let activeStep = 0;
  let statusMessage = "";
  if (logs && logs.length > 0) {
    for (let i = 0; i < logs.length; ++i) {
      const log = logs[i];
      if (log.step && typeof log.step === "number") {
        // Use step number directly as array index (backend uses 0-based indexing)
        const stepIdx = Math.max(0, Math.min(PRETRAIN_STEPS.length - 1, log.step));
        if (stepIdx > activeStep) {
          activeStep = stepIdx;
          statusMessage = log.status_message || "";
        }
      }
      // If training started, set to last step
      if (log.step_name && log.step_name === "Training Start") {
        activeStep = PRETRAIN_STEPS.length - 1;
        statusMessage = log.status_message;
      }
    }
  }
  
  // Debug print
  console.log('[PretrainStepProgress] Component received logs:', logs);
  console.log('[PretrainStepProgress] Component logs length:', logs ? logs.length : 0);
  console.log('[PretrainStepProgress] Component activeStep:', activeStep);
  console.log('[PretrainStepProgress] Component statusMessage:', statusMessage);
  // Debug print
  if (logs && logs.length > 0) {
    // eslint-disable-next-line no-console
    console.log('[PretrainStepProgress] logs:', logs, 'activeStep:', activeStep);
  }

  return (
    <div className="modern-card mb-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="modern-card-header">
        <h3 className="modern-card-title">Fine-tuning Preparation Progress</h3>
      </div>
      <Stepper activeStep={activeStep} alternativeLabel>
        {PRETRAIN_STEPS.map((label, idx) => (
          <Step key={label} completed={activeStep > idx}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {statusMessage}
      </Typography>
    </div>
  );
}
