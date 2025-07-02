import React from "react";
import { Box, Stepper, Step, StepLabel, Typography, Paper } from "@mui/material";

const PRETRAIN_STEPS = [
  "Job Instantiated",
  "Dataset Loading",
  "Model Loading",
  "Dataset Formatting",
  "Training"
];

export default function PretrainStepProgress({ logs }) {
  // Find the highest completed step from logs
  let activeStep = 0;
  let statusMessage = "";
  if (logs && logs.length > 0) {
    for (let i = 0; i < logs.length; ++i) {
      const log = logs[i];
      if (log.step && log.step > activeStep) {
        activeStep = log.step;
        statusMessage = log.status_message || "";
      }
      // If training started, set to last step
      if (log.status_message && log.status_message.toLowerCase().includes("starting training")) {
        activeStep = PRETRAIN_STEPS.length - 1;
        statusMessage = log.status_message;
      }
    }
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2, background: "#f5f5f5" }}>
      <Typography variant="h6" gutterBottom>Fine-tuning Preparation Progress</Typography>
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
    </Paper>
  );
}
