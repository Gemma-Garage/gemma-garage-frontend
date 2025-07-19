import React, { useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import ProjectPage from './ProjectPage'; // The existing supervised fine-tuning page
import ReinforcementTuning from '../components/ReinforcementTuning';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import '../style/modern.css';

const ProjectRouter = ({ currentUser }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const routeToCorrectPage = async () => {
      if (!currentUser || !projectId) return;
      try {
        const projectDocRef = doc(db, 'users', currentUser.uid, 'projects', projectId);
        const projectDocSnap = await getDoc(projectDocRef);
        if (projectDocSnap.exists()) {
          const projectData = projectDocSnap.data();
          const tuningType = typeof projectData.tuningType === 'number' ? projectData.tuningType : 0;
          if (tuningType === 1) {
            navigate(`/project/${projectId}/reinforcement`, { replace: true });
          } else {
            navigate(`/project/${projectId}/supervised`, { replace: true });
          }
        } else {
          navigate('/home');
        }
      } catch (err) {
        console.error('Error loading project for routing:', err);
        navigate('/home');
      }
    };
    routeToCorrectPage();
    // Only run on mount
    // eslint-disable-next-line
  }, [currentUser, projectId]);

  return (
    <Routes>
      <Route path="/supervised" element={<ProjectPage currentUser={currentUser} />} />
      <Route path="/reinforcement" element={<ReinforcementTuning />} />
    </Routes>
  );
};

export default ProjectRouter;
