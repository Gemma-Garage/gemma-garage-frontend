// src/components/ProjectDashboard.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // auth removed as currentUser is prop
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { 
  Container, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress, 
  Box, 
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  AddCircleOutline as AddIcon,
  SmartToy as AIIcon,
  Schedule as TimeIcon,
  PlayArrow as PlayIcon,
  MoreVert as MoreIcon,
  TrendingUp as TrendingIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

// Styled components for modern dashboard design
const DashboardContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: theme.spacing(2),
    alignItems: 'stretch',
  }
}));

const DashboardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  color: '#1a1a1a',
  fontSize: '2.5rem',
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
    textAlign: 'center',
  }
}));

const CreateButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
  borderRadius: '12px',
  padding: '12px 24px',
  fontSize: '1rem',
  fontWeight: 600,
  textTransform: 'none',
  color: '#ffffff',
  boxShadow: '0 4px 16px rgba(33, 150, 243, 0.3)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(33, 150, 243, 0.4)',
  }
}));

const ProjectCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '16px',
  border: '1px solid #f0f0f0',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.15)',
    borderColor: '#2196f3',
  }
}));

const ProjectAvatar = styled(Avatar)(({ theme }) => ({
  background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
  width: 48,
  height: 48,
  marginBottom: theme.spacing(2),
}));

const ProjectTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '1.25rem',
  color: '#1a1a1a',
  marginBottom: theme.spacing(1),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const ProjectDescription = styled(Typography)(({ theme }) => ({
  color: 'var(--text-secondary)',
  fontSize: '0.875rem',
  marginBottom: theme.spacing(2),
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}));

const StatusChip = styled(Chip)(({ status, theme }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'training': return { bg: '#fff3e0', color: '#f57c00', border: '#ffcc02' };
      case 'completed': return { bg: '#e8f5e8', color: '#2e7d32', border: '#4caf50' };
      case 'ready': return { bg: '#e3f2fd', color: '#1976d2', border: '#2196f3' };
      case 'never_trained': return { bg: '#f5f5f5', color: '#666666', border: '#e0e0e0' };
      default: return { bg: '#ffffff', color: '#64748b', border: '#e2e8f0' };
    }
  };
  
  const colors = getStatusColor();
  return {
    backgroundColor: colors.bg,
    color: colors.color,
    border: `1px solid ${colors.border}`,
    fontWeight: 500,
    fontSize: '0.75rem',
  };
});

const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(6),
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '2px dashed #e0e0e0',
}));

const EmptyStateIcon = styled(AIIcon)(({ theme }) => ({
  fontSize: '4rem',
  color: '#cccccc',
  marginBottom: theme.spacing(2),
}));

const ProjectDashboard = ({ handleCreateProjectOpen, handleProjectSelect, currentUser }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

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

  // Delete project handlers
  const handleMenuOpen = (event, project) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedProject(project);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProject(null);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject || !currentUser) return;
    
    setDeletingProject(true);
    try {
      const projectRef = doc(db, `users/${currentUser.uid}/projects/${selectedProject.id}`);
      await deleteDoc(projectRef);
      setDeleteDialogOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project: " + error.message);
    } finally {
      setDeletingProject(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedProject(null);
  };

  // Helper functions
  const getProjectStatus = (project) => {
    // Check if training is currently in progress
    if (project.trainingStatusMessage?.toLowerCase().includes('training') || 
        project.trainingStatusMessage?.toLowerCase().includes('in progress') ||
        project.trainingStatusMessage?.toLowerCase().includes('polling for logs')) {
      return 'training';
    }
    // Check if training is completed
    if (project.weightsUrl || project.trainingStatusMessage?.toLowerCase().includes('complete')) {
      return 'completed';
    }
    // Check if training has been started but not completed
    if (project.requestId) {
      return 'ready';
    }
    // Default: project created but never trained
    return 'never_trained';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'training': return 'Training';
      case 'completed': return 'Completed';
      case 'ready': return 'Training Ready';
      case 'never_trained': return 'Never Trained';
      default: return 'Created';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getModelDisplayName = (baseModel) => {
    if (!baseModel) return 'Unknown Model';
    return baseModel.split('/').pop() || baseModel;
  };

  if (loading) {
    return (
      <DashboardContainer maxWidth="lg">
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '400px',
          gap: 2
        }}>
          <CircularProgress size={48} />
          <Typography variant="h6" color="text.secondary">
            Loading your projects...
          </Typography>
        </Box>
      </DashboardContainer>
    );
  }

  if (error) {
    return (
      <DashboardContainer maxWidth="lg">
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Unable to load projects
          </Typography>
          <Typography color="text.secondary">
            {error}
          </Typography>
        </Paper>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer maxWidth="lg">
      <HeaderSection>
        <Box>
          <DashboardTitle variant="h3">
            My Projects
          </DashboardTitle>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            Manage and track your AI model fine-tuning projects
          </Typography>
        </Box>
        <CreateButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateProjectOpen}
        >
          New Project
        </CreateButton>
      </HeaderSection>

      {projects.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
            No projects yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create your first AI model fine-tuning project to get started
          </Typography>
          <CreateButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateProjectOpen}
          >
            Create Your First Project
          </CreateButton>
        </EmptyState>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => {
            const status = getProjectStatus(project);
            return (
              <Grid item xs={12} sm={6} md={4} key={project.id}>
                <ProjectCard onClick={() => handleProjectSelect(project.id)}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <ProjectAvatar>
                        <AIIcon />
                      </ProjectAvatar>
                      <Tooltip title="More options">
                        <IconButton 
                          size="small" 
                          sx={{ color: '#666666' }}
                          onClick={(e) => handleMenuOpen(e, project)}
                        >
                          <MoreIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <ProjectTitle>
                      {project.displayName || 'Untitled Project'}
                    </ProjectTitle>
                    
                    <ProjectDescription>
                      Fine-tuning {getModelDisplayName(project.baseModel)} • 
                      {project.epochs || 1} epoch{(project.epochs || 1) !== 1 ? 's' : ''}
                    </ProjectDescription>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <StatusChip 
                        status={status}
                        label={getStatusLabel(status)}
                        size="small"
                      />
                      {project.requestId && (
                        <Chip 
                          label={`Job ${project.requestId.slice(-6)}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#666666' }}>
                      <TimeIcon sx={{ fontSize: '1rem' }} />
                      <Typography variant="caption">
                        Last trained: {formatDate(project.lastTrainedAt)}
                      </Typography>
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ px: 3, pb: 2 }}>
                    <Button 
                      startIcon={<PlayIcon />}
                      size="small"
                      sx={{ 
                        color: '#2196f3',
                        fontWeight: 600,
                        textTransform: 'none'
                      }}
                    >
                      Open Project
                    </Button>
                    {status === 'completed' && (
                      <Button 
                        startIcon={<TrendingIcon />}
                        size="small"
                        sx={{ 
                          color: '#4caf50',
                          fontWeight: 600,
                          textTransform: 'none'
                        }}
                      >
                        View Results
                      </Button>
                    )}
                  </CardActions>
                </ProjectCard>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Project Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            minWidth: '180px'
          }
        }}
      >
        <MenuItem 
          onClick={handleDeleteClick}
          sx={{ 
            color: '#d32f2f',
            '&:hover': { backgroundColor: '#ffebee' }
          }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
          Delete Project
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Delete Project
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedProject?.displayName}"? 
            This action cannot be undone and will permanently remove all project data.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={handleDeleteCancel}
            variant="outlined"
            disabled={deletingProject}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deletingProject}
            startIcon={deletingProject ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deletingProject ? 'Deleting...' : 'Delete Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContainer>
  );
};

export default ProjectDashboard;
