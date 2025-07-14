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
  background: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  position: 'relative',
}));

const GlassCard = styled(Paper)(({ theme }) => ({
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e0e0e0',
  padding: theme.spacing(4),
  minWidth: '440px',
  maxWidth: '500px',
  width: '100%',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  position: 'relative',
  zIndex: 1,
  animation: 'fadeIn 0.6s ease-out',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
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
    background: 'linear-gradient(90deg, #2196f3, #1976d2)',
    height: '3px',
    borderRadius: '3px',
  },
  '& .MuiTab-root': {
    color: '#666666',
    fontWeight: 600,
    fontSize: '1.1rem',
    textTransform: 'none',
    minHeight: '56px',
    transition: 'all 0.3s ease',
    '&.Mui-selected': {
      color: '#1976d2',
    },
    '&:hover': {
      color: '#2196f3',
      transform: 'translateY(-1px)',
    }
  }
}));

const WelcomeTitle = styled(Typography)(({ theme }) => ({
  color: '#1a1a1a',
  fontWeight: 700,
  marginBottom: theme.spacing(1),
  textAlign: 'center',
  fontSize: '2.5rem',
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
  }
}));

const SubTitle = styled(Typography)(({ theme }) => ({
  color: '#666666',
  textAlign: 'center',
  marginBottom: theme.spacing(4),
  fontSize: '1.1rem',
  fontWeight: 400,
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
