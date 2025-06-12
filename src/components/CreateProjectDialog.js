import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';

const CreateProjectDialog = ({ open, onClose, onCreate }) => {
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!projectName.trim()) {
      setError('Project name cannot be empty.');
      return;
    }
    setError('');
    onCreate(projectName);
    setProjectName(''); // Reset for next time
    onClose();
  };

  const handleDialogClose = () => {
    setProjectName(''); // Reset on close
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose}>
      <DialogTitle>Create New Project</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Please enter a display name for your new fine-tuning project.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="project-name"
          label="Project Display Name"
          type="text"
          fullWidth
          variant="outlined"
          value={projectName}
          onChange={(e) => {
            setProjectName(e.target.value);
            if (error) setError(''); // Clear error when user types
          }}
          error={!!error}
          helperText={error}
        />
      </DialogContent>
      <DialogActions sx={{ p: '0 24px 20px' }}>
        <Button onClick={handleDialogClose} color="secondary">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">Create</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateProjectDialog;
