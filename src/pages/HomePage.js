import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectDashboard from '../components/ProjectDashboard';
import CreateProjectDialog from '../components/CreateProjectDialog';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

function HomePage({ currentUser }) {
  const navigate = useNavigate();
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);

  const handleCreateProjectOpen = () => {
    setShowCreateProjectDialog(true);
  };

  const handleCreateProjectClose = () => {
    setShowCreateProjectDialog(false);
  };

  const handleProjectSelect = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  const handleCreateProject = async (projectName, modelName) => {
    if (!currentUser) {
      alert("You must be logged in to create a project.");
      return;
    }
    try {
      const projectsCollectionRef = collection(db, "users", currentUser.uid, "projects");
      const newProjectRef = await addDoc(projectsCollectionRef, {
        displayName: projectName,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        requestId: null,
        baseModel: modelName || "google/gemma-3-1b-pt",
        weightsUrl: null,
        lastTrainedAt: null,
        epochs: 1,
        learningRate: 0.0002,
        loraRank: 4,
        trainingStatusMessage: "Project created. Ready for training."
      });
      console.log("Project created successfully with ID:", newProjectRef.id, " Name:", projectName);
      handleCreateProjectClose();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project: " + error.message);
    }
  };

  return (
    <>
      <ProjectDashboard
        currentUser={currentUser}
        handleCreateProjectOpen={handleCreateProjectOpen}
        handleProjectSelect={handleProjectSelect}
      />
      <CreateProjectDialog
        open={showCreateProjectDialog}
        onClose={handleCreateProjectClose}
        onCreate={handleCreateProject}
      />
    </>
  );
}

export default HomePage;
