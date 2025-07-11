import React from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Paper } from '@mui/material';
import ProjectPage from './ProjectPage'; // The existing supervised fine-tuning page
import ReinforcementTuning from '../components/ReinforcementTuning';

const TuningChoice = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <Typography variant="h4" gutterBottom>
        Choose Your Fine-Tuning Method
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 4, maxWidth: '600px', textAlign: 'center' }}>
        Select the type of fine-tuning that best suits your project goals.
      </Typography>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Paper elevation={3} sx={{ padding: 3, width: '300px', textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>Supervised Fine-Tuning</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ideal for training chatbots and other models on unstructured or structured text data.
          </Typography>
          <Button variant="contained" onClick={() => navigate(`/project/${projectId}/supervised`)}>
            Start Supervised Tuning
          </Button>
        </Paper>
        <Paper elevation={3} sx={{ padding: 3, width: '300px', textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>Reinforcement Fine-Tuning</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Perfect for creating coding agents or other models that learn from feedback and interaction.
          </Typography>
          <Button variant="contained" onClick={() => navigate(`/project/${projectId}/reinforcement`)}>
            Start Reinforcement Tuning
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};


const ProjectRouter = ({ currentUser }) => {
  return (
    <Routes>
      <Route path="/" element={<TuningChoice />} />
      <Route path="/supervised" element={<ProjectPage currentUser={currentUser} />} />
      <Route path="/reinforcement" element={<ReinforcementTuning />} />
    </Routes>
  );
};

export default ProjectRouter;
