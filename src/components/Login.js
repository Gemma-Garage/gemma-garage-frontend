// src/components/Login.js
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; // Correct path to firebase.js
import { TextField, Button, Box, Typography, Alert, InputAdornment, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Email, Lock, Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';

// Styled components for modern design
const ModernTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2.5),
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.3)',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#ffffff',
      borderWidth: '2px',
    },
    '&.Mui-focused': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    }
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: 500,
    '&.Mui-focused': {
      color: '#ffffff',
    }
  },
  '& .MuiOutlinedInput-input': {
    color: '#ffffff',
    padding: '16px 14px',
    fontSize: '1rem',
    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.6)',
    }
  },
  '& .MuiSvgIcon-root': {
    color: 'rgba(255, 255, 255, 0.7)',
  }
}));

const ModernButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '12px',
  padding: '14px 24px',
  fontSize: '1.1rem',
  fontWeight: 600,
  textTransform: 'none',
  color: '#ffffff',
  border: 'none',
  boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
  transition: 'all 0.3s ease',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1),
  '&:hover': {
    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 30px rgba(102, 126, 234, 0.6)',
  },
  '&:active': {
    transform: 'translateY(-1px)',
    boxShadow: '0 6px 15px rgba(102, 126, 234, 0.4)',
  },
  '&:disabled': {
    background: 'rgba(255, 255, 255, 0.3)',
    color: 'rgba(255, 255, 255, 0.6)',
    transform: 'none',
    boxShadow: 'none',
  }
}));

const FormTitle = styled(Typography)(({ theme }) => ({
  color: '#ffffff',
  fontWeight: 600,
  marginBottom: theme.spacing(3),
  textAlign: 'center',
  fontSize: '1.5rem',
}));

const ModernAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: '12px',
  backgroundColor: 'rgba(244, 67, 54, 0.1)',
  border: '1px solid rgba(244, 67, 54, 0.3)',
  color: '#ffffff',
  '& .MuiAlert-icon': {
    color: '#ff6b6b',
  }
}));

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Login successful, App.js will handle redirect or UI update
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box>
      <FormTitle variant="h5">
        Welcome Back
      </FormTitle>
      
      <Box component="form" onSubmit={handleLogin}>
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
        
        <ModernTextField
          required
          fullWidth
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={togglePasswordVisibility}
                  edge="end"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        
        {error && (
          <ModernAlert severity="error">
            {error}
          </ModernAlert>
        )}
        
        <ModernButton
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          startIcon={<LoginIcon />}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </ModernButton>
      </Box>
    </Box>
  );
};

export default Login;
