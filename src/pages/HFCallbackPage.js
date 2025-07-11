import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Paper, Typography, Box, Alert, CircularProgress } from '@mui/material';

const HFCallbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const hfConnected = urlParams.get('hf_connected');
    const error = urlParams.get('error');

    if (hfConnected === 'true') {
      setStatus('success');
      setTimeout(() => {
        navigate('/home');
      }, 3000);
    } else if (error) {
      setStatus('error');
      setTimeout(() => {
        navigate('/home');
      }, 5000);
    } else {
      setStatus('error');
      setTimeout(() => {
        navigate('/home');
      }, 3000);
    }
  }, [location, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 200px)',
        p: 3
      }}
    >
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
        {status === 'processing' && (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Processing Hugging Face Connection...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we complete your account connection.
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                🎉 Hugging Face Connected Successfully!
              </Typography>
              <Typography variant="body2">
                Your Hugging Face account has been connected. You can now upload models and use HF inference.
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Redirecting to dashboard in 3 seconds...
            </Typography>
          </>
        )}

        {status === 'error' && (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Connection Failed
              </Typography>
              <Typography variant="body2">
                There was an error connecting your Hugging Face account. Please try again.
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Redirecting to dashboard in 5 seconds...
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default HFCallbackPage;
