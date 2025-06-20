// src/components/ProjectDashboard.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // auth removed as currentUser is prop
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Container, Typography, Button, List, ListItem, ListItemButton, ListItemText, Paper, CircularProgress, Box, Divider } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const ProjectDashboard = ({ handleCreateProjectOpen, handleProjectSelect, currentUser }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser && currentUser.uid) {
      setLoading(true);
      setError(null); // Clear previous errors when attempting to load projects
      const projectsRef = collection(db, `users/${currentUser.uid}/projects`);
      const q = query(projectsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userProjects = [];
        querySnapshot.forEach((doc) => {
          userProjects.push({ id: doc.id, ...doc.data() });
        });
        setProjects(userProjects);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching projects: ", err);
        setError("Failed to load projects. Please try again.");
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // This block handles cases where currentUser is not valid for fetching projects
      setProjects([]); // Clear projects if user/UID is not valid
      setLoading(false); // Stop loading indicator

      if (!currentUser) {
        setError("No user logged in. Cannot display projects.");
      } else { // currentUser exists, but uid is missing (should be rare for Firebase auth user objects)
        setError("User data is incomplete (missing UID). Cannot display projects.");
        console.warn("ProjectDashboard: currentUser prop is present but UID is missing.", currentUser);
      }
    }
  }, [currentUser]); // Re-run when currentUser changes

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', mt: 5 }}>
        <CircularProgress />
        <Typography>Loading projects...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ textAlign: 'center', mt: 5 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            My Projects
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleCreateProjectOpen} // This will be connected in App.js
          >
            New Project
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {projects.length === 0 ? (
          <Typography sx={{ textAlign: 'center', mt: 3, color: 'text.secondary' }}>
            You don't have any projects yet. Click "New Project" to get started!
          </Typography>
        ) : (
          <List>
            {projects.map((project) => (
              <ListItem 
                disablePadding
                key={project.id} 
                divider
              >
                <ListItemButton onClick={() => handleProjectSelect(project.id)}>
                  <ListItemText 
                    primary={project.displayName || 'Untitled Project'} 
                    secondary={`ID: ${project.id} ${project.requestId ? `(Job: ${project.requestId})` : ''} - Base: ${project.baseModel || 'N/A'} - Last Trained: ${project.lastTrainedAt ? new Date(project.lastTrainedAt.seconds * 1000).toLocaleDateString() : 'Never'}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default ProjectDashboard;
