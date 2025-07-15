import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Typography, Box, Alert, CircularProgress } from '@mui/material';
import '../style/modern.css';

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
      <div className="modern-card text-center" style={{ maxWidth: '500px' }}>
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
            <div className="modern-alert modern-alert-success mb-3">
              <Typography variant="h6" gutterBottom>
                🎉 Hugging Face Connected Successfully!
              </Typography>
              <Typography variant="body2">
                Your Hugging Face account has been connected. You can now upload models and use HF inference.
              </Typography>
            </div>
            <Typography variant="body2" color="text.secondary">
              Redirecting to dashboard in 3 seconds...
            </Typography>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="modern-alert modern-alert-error mb-3">
              <Typography variant="h6" gutterBottom>
                Connection Failed
              </Typography>
              <Typography variant="body2">
                There was an error connecting your Hugging Face account. Please try again.
              </Typography>
            </div>
            <Typography variant="body2" color="text.secondary">
              Redirecting to dashboard in 5 seconds...
            </Typography>
          </>
        )}
      </div>
    </Box>
  );
};

export default HFCallbackPage;
