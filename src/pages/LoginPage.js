import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import AuthPage from '../components/AuthPage';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/home', { replace: true });
    }
  }, [currentUser, navigate]);

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
