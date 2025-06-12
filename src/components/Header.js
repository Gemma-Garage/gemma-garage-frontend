// Header.js
import React from "react";
import { AppBar, Toolbar, Typography, Link, Button, Box, useMediaQuery, IconButton } from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import DiamondIcon from '@mui/icons-material/Diamond';
import { signOut } from 'firebase/auth'; // Import signOut
import "../style/Header.css";

const theme = createTheme({
  palette: {
    primary: {
      main: '#6200ee',
    },
    secondary: {
      main: '#3700b3',
    },
  },
});

const Header = ({ currentUser, auth }) => { // Accept currentUser and auth as props
  const isSmallScreen = useMediaQuery('(max-width:600px)');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // User signed out, App.js will handle redirect or UI update
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" sx={{ 
        backgroundColor: '#6200ee', 
        marginBottom: 2,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DiamondIcon sx={{ mr: 1 }} />
            <Typography 
              variant={isSmallScreen ? "h6" : "h5"} 
              component="div" 
              sx={{ fontWeight: 'bold' }}
            >
              Gemma Garage
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {currentUser ? (
              <>
                <Typography sx={{ mr: 2, color: 'white' }}>
                  Hi, {currentUser.displayName || currentUser.email}
                </Typography>
                <Button 
                  color="inherit" 
                  onClick={handleLogout}
                  sx={{ textTransform: 'none', mr: 1, fontWeight: 'bold', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)'} }}
                >
                  Logout
                </Button>
              </>
            ) : (
              // Optionally, show Login/SignUp buttons here if not on AuthPage
              // For now, this part is empty as AuthPage handles non-logged-in users
              null 
            )}
            <Button 
              color="inherit" 
              href="https://github.com/Gemma-Garage/" 
              target="_blank"
              rel="noopener noreferrer"
              startIcon={isSmallScreen ? null : <GitHubIcon />}
              sx={{ 
                textTransform: 'none',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
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
          backgroundColor: '#3700b3', 
          padding: '4px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center' 
        }}>
          <Typography 
            variant="body2" 
            component="div" 
            sx={{ 
              color: 'white',
              fontStyle: 'italic',
              textAlign: 'center'
            }}
          >
            The go-to place for fine-tuning your LLMs 🤖 - now part of{' '} 
            <Link 
            href="https://summerofcode.withgoogle.com/programs/2025/projects/yT16LTpy" 
            target="_blank" 
            rel="noopener noreferrer" 
            sx={{ color: 'white', textDecoration: 'underline' }}>         
            GSoC 2025 
            </Link>
          </Typography>
        </Box>
      </AppBar>
    </ThemeProvider>
  );
};

export default Header;
