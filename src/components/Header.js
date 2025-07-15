// Header.js
import React from "react";
import { AppBar, Toolbar, Typography, Link, Button, Box, useMediaQuery, IconButton } from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import GitHubIcon from '@mui/icons-material/GitHub';
import DiamondIcon from '@mui/icons-material/Diamond';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { signOut } from 'firebase/auth';
import "../style/Header.css";

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#1d4ed8',
    },
  },
});

const Header = ({ currentUser, auth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSmallScreen = useMediaQuery('(max-width:600px)');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/home');
  };

  const isInProject = location.pathname.startsWith('/project/');

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" sx={{ 
        backgroundColor: '#2563eb', 
        marginBottom: 0,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        <Toolbar sx={{ justifyContent: 'space-between', padding: '0 24px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DiamondIcon sx={{ mr: 1.5, fontSize: '28px' }} />
            <Typography 
              variant={isSmallScreen ? "h6" : "h5"} 
              component="div" 
              sx={{ 
                fontWeight: 700,
                fontSize: isSmallScreen ? '1.25rem' : '1.5rem',
                letterSpacing: '-0.025em'
              }}
            >
              Gemma Garage
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {currentUser && isInProject && (
              <Button 
                color="inherit" 
                onClick={handleGoToDashboard}
                startIcon={<DashboardIcon />}
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600, 
                  borderRadius: '8px',
                  padding: '8px 16px',
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Dashboard
              </Button>
            )}
            {currentUser ? (
              <>
                <Typography sx={{ 
                  mr: 2, 
                  color: 'white', 
                  fontWeight: 500,
                  fontSize: '0.875rem'
                }}>
                  Hi, {currentUser.displayName || currentUser.email}
                </Typography>
                <Button 
                  color="inherit" 
                  onClick={handleLogout}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Logout
                </Button>
              </>
            ) : null}
            <Button 
              color="inherit" 
              href="https://github.com/Gemma-Garage/" 
              target="_blank"
              rel="noopener noreferrer"
              startIcon={isSmallScreen ? null : <GitHubIcon />}
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                padding: '8px 16px',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {isSmallScreen ? (
                <GitHubIcon />
              ) : (
                "View on GitHub"
              )}
            </Button>
          </Box>
        </Toolbar>
        
        <Box sx={{ 
          backgroundColor: '#1d4ed8', 
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Typography 
            variant="body2" 
            component="div" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.9)',
              fontStyle: 'italic',
              textAlign: 'center',
              fontSize: '0.875rem',
              fontWeight: 400
            }}
          >
            The go-to place for fine-tuning your LLMs 🤖 - now part of{' '} 
            <Link 
            href="https://summerofcode.withgoogle.com/programs/2025/projects/yT16LTpy" 
            target="_blank" 
            rel="noopener noreferrer" 
            sx={{ 
              color: 'white', 
              textDecoration: 'underline',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'none'
              }
            }}>         
            GSoC 2025 
            </Link>
          </Typography>
        </Box>
      </AppBar>
    </ThemeProvider>
  );
};

export default Header;
