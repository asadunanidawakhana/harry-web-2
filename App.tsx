
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import Layout from './components/Layout';
import WarningPopup from './components/WarningPopup';
import ChangelogPage from './pages/ChangelogPage';

const AppRoutes = () => {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="w-16 h-16 border-4 border-t-transparent border-primary-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/dashboard" />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route 
          path="/dashboard" 
          element={user ? <DashboardPage /> : <Navigate to="/auth" />} 
        />
        <Route 
          path="/admin/*" 
          element={user && isAdmin ? <AdminPage /> : <Navigate to="/dashboard" />} 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  const [showWarning, setShowWarning] = useState(true);

  useEffect(() => {
    const warningAccepted = localStorage.getItem('warningAccepted');
    if (warningAccepted) {
      setShowWarning(false);
    }
  }, []);

  const handleAcceptWarning = () => {
    localStorage.setItem('warningAccepted', 'true');
    setShowWarning(false);
  };

  return (
    <HashRouter>
      <AuthProvider>
        {showWarning && <WarningPopup onAccept={handleAcceptWarning} />}
        <div className={showWarning ? 'blur-sm' : ''}>
           <AppRoutes />
        </div>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
