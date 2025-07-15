import React from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import ProjectPage from './ProjectPage'; // The existing supervised fine-tuning page
import ReinforcementTuning from '../components/ReinforcementTuning';
import '../style/modern.css';

const TuningChoice = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-header text-center">
        <h1 className="page-title">Choose Your Fine-Tuning Method</h1>
        <p className="page-subtitle">
          Select the type of fine-tuning that best suits your project goals.
        </p>
      </div>
      
      <div className="d-flex justify-center gap-4">
        <div className="modern-card" style={{ width: '300px', textAlign: 'center' }}>
          <div className="modern-card-header">
            <h3 className="modern-card-title">Supervised Fine-Tuning</h3>
          </div>
          <p className="mb-3">
            Ideal for training chatbots and other models on unstructured or structured text data.
          </p>
          <button 
            className="modern-btn modern-btn-primary"
            onClick={() => navigate(`/project/${projectId}/supervised`)}
          >
            Start Supervised Tuning
          </button>
        </div>
        
        <div className="modern-card" style={{ width: '300px', textAlign: 'center' }}>
          <div className="modern-card-header">
            <h3 className="modern-card-title">Reinforcement Fine-Tuning</h3>
          </div>
          <p className="mb-3">
            Perfect for creating coding agents or other models that learn from feedback and interaction.
          </p>
          <button 
            className="modern-btn modern-btn-primary"
            onClick={() => navigate(`/project/${projectId}/reinforcement`)}
          >
            Start Reinforcement Tuning
          </button>
        </div>
      </div>
    </div>
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
