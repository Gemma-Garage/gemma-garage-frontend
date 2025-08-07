// src/components/ForgotPassword.js
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  Alert, 
  InputAdornment, 
  Snackbar,
  IconButton 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Email, ArrowBack, Send } from '@mui/icons-material';

// Styled components for modern design
const ModernTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2.5),
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    '& fieldset': {
      borderColor: '#e0e0e0',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: '#2196f3',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#1976d2',
      borderWidth: '2px',
    },
    '&.Mui-focused': {
      backgroundColor: '#ffffff',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)',
    }
  },
  '& .MuiInputLabel-root': {
    color: '#666666',
    fontWeight: 500,
    '&.Mui-focused': {
      color: '#1976d2',
    }
  },
  '& .MuiOutlinedInput-input': {
    color: '#1a1a1a',
    padding: '16px 14px',
    fontSize: '1rem',
    '&::placeholder': {
      color: '#999999',
    }
  },
  '& .MuiSvgIcon-root': {
    color: '#666666',
  }
}));

const PrimaryButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
  borderRadius: '12px',
  padding: '14px 24px',
  fontSize: '1.1rem',
  fontWeight: 600,
  textTransform: 'none',
  color: '#ffffff',
  border: 'none',
  boxShadow: '0 4px 16px rgba(33, 150, 243, 0.3)',
  transition: 'all 0.3s ease',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1),
  '&:hover': {
    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(33, 150, 243, 0.4)',
  },
  '&:active': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
  },
  '&:disabled': {
    background: '#cccccc',
    color: '#666666',
    transform: 'none',
    boxShadow: 'none',
  }
}));

const SecondaryButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: '12px 20px',
  fontSize: '1rem',
  fontWeight: 500,
  textTransform: 'none',
  color: '#666666',
  border: '1px solid #e0e0e0',
  backgroundColor: '#ffffff',
  transition: 'all 0.3s ease',
  marginBottom: theme.spacing(2),
  '&:hover': {
    backgroundColor: '#f5f5f5',
    borderColor: '#2196f3',
    color: '#2196f3',
    transform: 'translateY(-1px)',
  }
}));

const FormTitle = styled(Typography)(({ theme }) => ({
  color: '#1a1a1a',
  fontWeight: 600,
  marginBottom: theme.spacing(1),
  textAlign: 'center',
  fontSize: '1.5rem',
}));

const FormSubtitle = styled(Typography)(({ theme }) => ({
  color: '#666666',
  marginBottom: theme.spacing(3),
  textAlign: 'center',
  fontSize: '0.95rem',
  lineHeight: 1.5,
}));

const ModernAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: '12px',
  '&.MuiAlert-standardError': {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#c62828',
    '& .MuiAlert-icon': {
      color: '#f44336',
    }
  },
  '&.MuiAlert-standardSuccess': {
    backgroundColor: '#e8f5e8',
    border: '1px solid #c8e6c9',
    color: '#2e7d32',
    '& .MuiAlert-icon': {
      color: '#4caf50',
    }
  }
}));

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`, // Redirect URL after password reset
        handleCodeInApp: false
      });
      setSuccess(true);
      setSnackbarOpen(true);
      // Clear the email field after successful submission
      setEmail('');
    } catch (err) {
      console.error('Password reset error:', err);
      
      // Handle specific Firebase auth errors
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email address.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/too-many-requests':
          setError('Too many reset attempts. Please try again later.');
          break;
        default:
          setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (success) {
    return (
      <Box>
        <FormTitle variant="h5">
          Check Your Email
        </FormTitle>
        
        <FormSubtitle>
          We've sent a password reset link to <strong>{email}</strong>. 
          Click the link in the email to reset your password.
        </FormSubtitle>
        
        <ModernAlert severity="success">
          Password reset email sent successfully! Check your inbox and spam folder.
        </ModernAlert>
        
        <SecondaryButton
          fullWidth
          onClick={onBack}
          startIcon={<ArrowBack />}
        >
          Back to Sign In
        </SecondaryButton>
        
        <Typography 
          variant="body2" 
          sx={{ 
            textAlign: 'center', 
            color: '#666666', 
            mt: 2,
            fontSize: '0.9rem'
          }}
        >
          Didn't receive the email?{' '}
          <Button
            variant="text"
            onClick={() => {
              setSuccess(false);
              setError(null);
            }}
            sx={{ 
              color: '#2196f3', 
              fontWeight: 600,
              textTransform: 'none',
              p: 0,
              minWidth: 'auto',
              '&:hover': {
                backgroundColor: 'transparent',
                textDecoration: 'underline'
              }
            }}
          >
            Try again
          </Button>
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton 
          onClick={onBack}
          sx={{ 
            color: '#00d4ff',
            mr: 1,
            '&:hover': {
              backgroundColor: 'rgba(0, 212, 255, 0.1)'
            }
          }}
        >
          <ArrowBack />
        </IconButton>
        <FormTitle variant="h5" sx={{ flex: 1 }}>
          Reset Password
        </FormTitle>
      </Box>
      
      <FormSubtitle>
        Enter your email address and we'll send you a link to reset your password.
      </FormSubtitle>
      
      <Box component="form" onSubmit={handleResetPassword}>
        <ModernTextField
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Email />
              </InputAdornment>
            ),
          }}
        />
        
        {error && (
          <ModernAlert severity="error">
            {error}
          </ModernAlert>
        )}
        
        <PrimaryButton
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          startIcon={<Send />}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </PrimaryButton>
        
        <SecondaryButton
          fullWidth
          onClick={onBack}
          startIcon={<ArrowBack />}
        >
          Back to Sign In
        </SecondaryButton>
      </Box>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Password reset email sent successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ForgotPassword;
