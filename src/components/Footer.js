// Footer.js
import React from "react";
import { AppBar, Toolbar, Typography, Link, Button, Box, useMediaQuery, IconButton, Grid, Container } from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import DiamondIcon from '@mui/icons-material/Diamond';
import CodeIcon from '@mui/icons-material/Code';
import EmailIcon from '@mui/icons-material/Email';
import ArticleIcon from '@mui/icons-material/Article';
import SchoolIcon from '@mui/icons-material/School';
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

const Footer = () => {
  const isSmallScreen = useMediaQuery('(max-width:900px)');

  return (
    <ThemeProvider theme={theme}>
      <AppBar 
        position="static" 
        component="footer"
        sx={{ 
          backgroundColor: '#6200ee', 
          marginTop: 'auto',
          boxShadow: '0 -2px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Grid container spacing={4}>
            {/* Project Info */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DiamondIcon sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
                  Gemma Garage
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                The go-to place for fine-tuning your LLMs 🤖
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Part of{' '}
                <Link 
                  href="https://summerofcode.withgoogle.com/programs/2025/projects/yT16LTpy" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  sx={{ color: 'white', textDecoration: 'underline' }}
                >
                  Google Summer of Code 2025
                </Link>
              </Typography>
            </Grid>

            {/* Quick Links */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', mb: 2 }}>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link 
                  href="https://github.com/Gemma-Garage" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { color: 'white' }
                  }}
                >
                  <GitHubIcon fontSize="small" />
                  GitHub Repository
                </Link>
                <Link 
                  href="https://github.com/Gemma-Garage/gemma-garage/blob/main/README.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { color: 'white' }
                  }}
                >
                  <ArticleIcon fontSize="small" />
                  Documentation
                </Link>
                <Link 
                  href="https://github.com/Gemma-Garage/gemma-garage/blob/main/docs/tutorial.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { color: 'white' }
                  }}
                >
                  <SchoolIcon fontSize="small" />
                  Getting Started
                </Link>
              </Box>
            </Grid>

            {/* Contact */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', mb: 2 }}>
                Contact
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link 
                  href="https://github.com/Gemma-Garage/gemma-garage/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { color: 'white' }
                  }}
                >
                  <CodeIcon fontSize="small" />
                  Report Issues
                </Link>
                <Link 
                  href="mailto:gemma.garage.project@gmail.com" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { color: 'white' }
                  }}
                >
                  <EmailIcon fontSize="small" />
                  Contact Us
                </Link>
              </Box>
            </Grid>
          </Grid>

          {/* Copyright */}
          <Box sx={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.2)', 
            mt: 3, 
            pt: 2, 
            textAlign: 'center' 
          }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              © 2025 Gemma Garage. Open source project under MIT License.
            </Typography>
          </Box>
        </Container>
      </AppBar>
    </ThemeProvider>
  );
};

export default Footer;
