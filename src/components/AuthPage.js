// src/components/AuthPage.js
import React, { useState } from 'react';
import { Container, Box, Typography, Tab, Tabs, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import Login from './Login';
import SignUp from './SignUp';
import '../style/auth.css';

// Styled components for modern design
const ModernContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
  }
}));

const GlassCard = styled(Paper)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(20px)',
  borderRadius: '24px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  padding: theme.spacing(4),
  minWidth: '440px',
  maxWidth: '500px',
  width: '100%',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  zIndex: 1,
  animation: 'fadeIn 0.6s ease-out',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
  },
  [theme.breakpoints.down('sm')]: {
    minWidth: 'auto',
    margin: theme.spacing(2),
    padding: theme.spacing(3),
  }
}));

const ModernTabs = styled(Tabs)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& .MuiTabs-indicator': {
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    height: '3px',
    borderRadius: '3px',
  },
  '& .MuiTab-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 600,
    fontSize: '1.1rem',
    textTransform: 'none',
    minHeight: '56px',
    transition: 'all 0.3s ease',
    '&.Mui-selected': {
      color: '#ffffff',
    },
    '&:hover': {
      color: '#ffffff',
      transform: 'translateY(-2px)',
    }
  }
}));

const WelcomeTitle = styled(Typography)(({ theme }) => ({
  color: '#ffffff',
  fontWeight: 700,
  marginBottom: theme.spacing(3),
  textAlign: 'center',
  background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontSize: '2.5rem',
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
  }
}));

const SubTitle = styled(Typography)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.8)',
  textAlign: 'center',
  marginBottom: theme.spacing(4),
  fontSize: '1.1rem',
  fontWeight: 300,
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AuthPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <ModernContainer>
      <GlassCard elevation={0}>
        <WelcomeTitle variant="h3">
          Welcome to Gemma Garage
        </WelcomeTitle>
        <SubTitle variant="body1">
          Fine-tune and deploy AI models with ease
        </SubTitle>
        
        <ModernTabs 
          value={tabValue} 
          onChange={handleChange} 
          variant="fullWidth"
          aria-label="login signup tabs"
        >
          <Tab label="Login" id="auth-tab-0" aria-controls="auth-tabpanel-0" />
          <Tab label="Sign Up" id="auth-tab-1" aria-controls="auth-tabpanel-1" />
        </ModernTabs>
        
        <TabPanel value={tabValue} index={0}>
          <Login />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <SignUp />
        </TabPanel>
      </GlassCard>
    </ModernContainer>
  );
};

export default AuthPage;
