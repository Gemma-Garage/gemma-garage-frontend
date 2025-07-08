import React from 'react';
import { Box } from '@mui/material';
import AuthPage from '../components/AuthPage';

function LoginPage() {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: 'calc(100vh - 120px)' // Account for header/footer
    }}>
      <AuthPage />
    </Box>
  );
}

export default LoginPage;
