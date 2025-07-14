import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthPage from '../components/AuthPage';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/home', { replace: true });
    }
  }, [currentUser, navigate]);

  // Remove the Box wrapper since AuthPage now handles full-screen layout
  return <AuthPage />;
}

export default LoginPage;
