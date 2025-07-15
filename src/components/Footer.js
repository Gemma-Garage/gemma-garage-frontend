// Footer.js
import React from "react";
import { AppBar, Typography, Link, Box, Grid, Container } from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import DiamondIcon from '@mui/icons-material/Diamond';
import EmailIcon from '@mui/icons-material/Email';
import ArticleIcon from '@mui/icons-material/Article';
import SchoolIcon from '@mui/icons-material/School';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';
import "../style/modern.css";

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#64748b',
    },
  },
});

const Footer = () => {
  return (
    <ThemeProvider theme={theme}>
      <AppBar 
        position="static" 
        component="footer"
        sx={{ 
          backgroundColor: '#ffffff', 
          marginTop: 'auto',
          boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.1)',
          borderTop: '1px solid var(--border-color)'
        }}
      >
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Grid container spacing={4}>
            {/* Project Info */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DiamondIcon sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  Gemma Garage
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
                The go-to place for fine-tuning your LLMs 🤖
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                Part of{' '}
                <Link 
                  href="https://summerofcode.withgoogle.com/programs/2025/projects/yT16LTpy" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  sx={{ color: 'var(--primary-color)', textDecoration: 'underline' }}
                >
                  Google Summer of Code 2025
                </Link>
              </Typography>
            </Grid>

            {/* Quick Links */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'var(--text-primary)', mb: 2 }}>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link 
                  href="https://github.com/Gemma-Garage" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    color: 'var(--text-secondary)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { color: 'var(--primary-color)' }
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
                    color: 'var(--text-secondary)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { color: 'var(--primary-color)' }
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
                    color: 'var(--text-secondary)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { color: 'var(--primary-color)' }
                  }}
                >
                  <SchoolIcon fontSize="small" />
                  Getting Started
                </Link>
              </Box>
            </Grid>

            {/* Contact */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'var(--text-primary)', mb: 2 }}>
                Contact
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link 
                  href="https://github.com/Gemma-Garage/gemma-garage/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    color: 'var(--text-secondary)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { color: 'var(--primary-color)' }
                  }}
                >
                  <CodeIcon fontSize="small" />
                  Report Issues
                </Link>
                <Link 
                  href="mailto:gemma.garage.project@gmail.com" 
                  sx={{ 
                    color: 'var(--text-secondary)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { color: 'var(--primary-color)' }
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
            borderTop: '1px solid var(--border-color)', 
            mt: 3, 
            pt: 2, 
            textAlign: 'center' 
          }}>
            <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
              © 2025 Gemma Garage. Open source project under MIT License.
            </Typography>
          </Box>
        </Container>
      </AppBar>
    </ThemeProvider>
  );
};

export default Footer;
