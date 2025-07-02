// Utility to extract pretrain step logs from all logs
export function extractPretrainLogs(lossValues) {
  if (!Array.isArray(lossValues)) return [];
  // Only keep logs with a 'step' or 'step_name' field
  return lossValues.filter(
    (log) => log.step !== undefined || log.step_name !== undefined
  );
}

// Utility to check if training has started (i.e., a log with 'Starting training')
export function hasTrainingStarted(lossValues) {
  if (!Array.isArray(lossValues)) return false;
  return lossValues.some(
    (log) =>
      log.status_message &&
      log.status_message.toLowerCase().includes("starting training")
  );
}
