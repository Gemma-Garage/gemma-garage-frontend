// src/components/AuthPage.js
import React, { useState } from 'react';
import { Container, Box, Typography, Tab, Tabs } from '@mui/material';
import Login from './Login';
import SignUp from './SignUp';

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
        <Box sx={{ p: 3 }}>
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
    <Container component="main" maxWidth="sm" sx={{ marginTop: 8, marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography component="h1" variant="h4" gutterBottom>
        Welcome to Gemma Garage
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
        <Tabs value={tabValue} onChange={handleChange} aria-label="login signup tabs" centered>
          <Tab label="Login" id="auth-tab-0" aria-controls="auth-tabpanel-0" />
          <Tab label="Sign Up" id="auth-tab-1" aria-controls="auth-tabpanel-1" />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        <Login />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <SignUp />
      </TabPanel>
    </Container>
  );
};

export default AuthPage;
