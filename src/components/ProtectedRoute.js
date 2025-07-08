import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { currentUser, loadingAuth, isUserSetupComplete } = useAuth();

  if (loadingAuth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading authentication...</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isUserSetupComplete) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Finalizing user setup...</Typography>
      </Box>
    );
  }

  return children;
}

export default ProtectedRoute;
