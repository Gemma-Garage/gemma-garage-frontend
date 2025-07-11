import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Context
import { AuthProvider, useAuth } from "./context/AuthContext";

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProjectPage from "./pages/ProjectPage";
import ProjectRouter from "./pages/ProjectRouter";
import HuggingFaceTestPage from "./pages/HuggingFaceTestPage";

import "./style/App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function AppContent() {
  const { currentUser, auth } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header currentUser={currentUser} auth={auth} />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/huggingface-test" element={<HuggingFaceTestPage />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <HomePage currentUser={currentUser} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/project/:projectId/*"
            element={
              <ProtectedRoute>
                <ProjectRouter currentUser={currentUser} />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </Box>
      <Footer />
    </Box>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
