import React, { useState } from 'react';
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField,
  Box,
  Typography,
  Avatar,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { SmartToy as AIIcon, RocketLaunch as RocketIcon } from '@mui/icons-material';

// Styled components for modern dialog
const ModernDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    padding: theme.spacing(1),
    minWidth: '500px',
    [theme.breakpoints.down('sm')]: {
      minWidth: 'auto',
      margin: theme.spacing(2),
    }
  }
}));

const DialogHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const ProjectIcon = styled(Avatar)(({ theme }) => ({
  background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
  width: 56,
  height: 56,
}));

const ModernTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    '&.Mui-focused fieldset': {
      borderColor: '#2196f3',
    }
  }
}));

const ModernButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: '10px 24px',
  fontWeight: 600,
  textTransform: 'none',
}));

const CreateButton = styled(ModernButton)(({ theme }) => ({
  background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
  color: '#ffffff',
  '&:hover': {
    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
  }
}));

const CreateProjectDialog = ({ open, onClose, onCreate }) => {
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const [tuningType, setTuningType] = useState('0'); // '0' = Supervised, '1' = RL

  const handleSubmit = () => {
    if (!projectName.trim()) {
      setError('Project name cannot be empty.');
      return;
    }
    setError('');
    onCreate(projectName, parseInt(tuningType, 10));
    setProjectName('');
    setTuningType('0');
    onClose();
  };

  const handleDialogClose = () => {
    setProjectName('');
    setError('');
    onClose();
  };

  return (
    <ModernDialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <DialogHeader>
          <ProjectIcon>
            <AIIcon />
          </ProjectIcon>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Create New Project
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set up a new AI model fine-tuning project
            </Typography>
          </Box>
        </DialogHeader>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1 }}>
        <ModernTextField
          autoFocus
          fullWidth
          label="Project Name"
          placeholder="e.g., Customer Support Chatbot"
          value={projectName}
          onChange={(e) => {
            setProjectName(e.target.value);
            if (error) setError('');
          }}
          error={!!error}
          helperText={error || 'Give your project a descriptive name'}
        />
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend">Tuning Type</FormLabel>
          <RadioGroup
            row
            value={tuningType}
            onChange={(e) => setTuningType(e.target.value)}
            name="tuning-type-group"
          >
            <FormControlLabel value="0" control={<Radio />} label="Supervised Fine-Tuning" />
            <FormControlLabel value="1" control={<Radio />} label="Reinforcement Learning" />
          </RadioGroup>
        </FormControl>
        <Box sx={{ 
          p: 2, 
          backgroundColor: '#ffffff', 
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            What happens next?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Upload your training dataset<br/>
            • Configure training parameters<br/>
            • Start fine-tuning your model<br/>
            • Deploy and test your results
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <ModernButton 
          onClick={handleDialogClose} 
          variant="outlined"
          sx={{ borderColor: '#e0e0e0', color: '#666666' }}
        >
          Cancel
        </ModernButton>
        <CreateButton 
          onClick={handleSubmit} 
          variant="contained"
          startIcon={<RocketIcon />}
        >
          Create Project
        </CreateButton>
      </DialogActions>
    </ModernDialog>
  );
};

export default CreateProjectDialog;
