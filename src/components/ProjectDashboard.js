// src/components/ProjectDashboard.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Container, Typography, Button, List, ListItem, ListItemText, Paper, CircularProgress, Box, Divider } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// Forward declaration for now, will be passed via props or context
// const handleCreateProjectOpen = () => {}; 
// const handleProjectSelect = (projectId) => {};

const ProjectDashboard = ({ handleCreateProjectOpen, handleProjectSelect }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (auth.currentUser) {
      setLoading(true);
      const projectsRef = collection(db, `users/${auth.currentUser.uid}/projects`);
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
      setProjects([]);
      setLoading(false);
    }
  }, []); // Re-run if auth.currentUser changes - though App.js should ensure this component only renders when user exists

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
    <Container maxWidth="md" sx={{ mt: 4 }}>
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
                button 
                key={project.id} 
                onClick={() => handleProjectSelect(project.id)} // This will be connected in App.js
                divider
              >
                <ListItemText 
                  primary={project.displayName || 'Untitled Project'} 
                  secondary={`Request ID: ${project.requestId || 'Not yet trained'} - Base: ${project.baseModel || 'N/A'}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default ProjectDashboard;
