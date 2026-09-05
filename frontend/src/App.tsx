import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ServerWakeNotification } from './components/ServerWakeNotification';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { QuizPage } from './pages/QuizPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ServerWakeNotification />
      <Router>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<AuthPage />} />

          {/* Protected Onboarding Wizard */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Protected AI Quiz (RAG Pipeline) */}
          <Route
            path="/quiz"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Leadership Analytics */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Dashboard Route */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
