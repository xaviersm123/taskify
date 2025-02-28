// Import necessary modules and components from React, React Router, and local files
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthForm } from './components/auth/AuthForm';
import { Dashboard } from './pages/Dashboard';
import { ProjectBoard } from './pages/ProjectBoard';
import { ProjectSettings } from './pages/ProjectSettings';
import { ProfilePage } from './pages/Profile';
import { InboxPage } from './pages/Inbox';
import { MetricsPage } from './pages/MetricsPage';
import { useAuthStore } from './lib/store/auth';
import { useWorkspaceStore } from './lib/store/workspace';
import { useNotificationStore } from './lib/store/notification';
import { WorkspaceLoader } from './components/workspace/WorkspaceLoader';
import { WorkspaceError } from './components/workspace/WorkspaceError';
import { Layout } from './components/layout/Layout';

export default function App() {
  const { user, loading: authLoading } = useAuthStore();
  const { initialize, loading: workspaceLoading, error } = useWorkspaceStore();
  const { fetchNotifications } = useNotificationStore();
  const [initializationAttempted, setInitializationAttempted] = useState(false);

  // Initialize workspace when user is logged in
  useEffect(() => {
    if (user && !initializationAttempted) {
      initialize().finally(() => setInitializationAttempted(true));
    }
  }, [user, initialize, initializationAttempted]);

  // Fetch initial notifications when user logs in
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Set up real-time notification subscription
  useEffect(() => {
    let unsubscribe;
    if (user) {
      unsubscribe = useNotificationStore.getState().subscribeToNotifications(user.id);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  if (authLoading) {
    return <WorkspaceLoader message="Loading..." />;
  }

  if (user && workspaceLoading && !initializationAttempted) {
    return <WorkspaceLoader />;
  }

  if (user && error && initializationAttempted) {
    return (
      <WorkspaceError
        message={typeof error === 'string' ? error : error.message}
        onRetry={() => {
          setInitializationAttempted(false);
          initialize();
        }}
      />
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/signin" 
          element={user ? <Navigate to="/dashboard" /> : <AuthForm mode="signin" />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/dashboard" /> : <AuthForm mode="signup" />} 
        />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route 
                  path="/dashboard" 
                  element={user ? <Dashboard /> : <Navigate to="/signin" />} 
                />
                <Route 
                  path="/profile" 
                  element={user ? <ProfilePage /> : <Navigate to="/signin" />} 
                />
                <Route 
                  path="/inbox" 
                  element={user ? <InboxPage /> : <Navigate to="/signin" />} 
                />
                <Route 
                  path="/projects/:projectId" 
                  element={user ? <ProjectBoard /> : <Navigate to="/signin" />} 
                />
                <Route 
                  path="/projects/:projectId/project-settings" 
                  element={user ? <ProjectSettings /> : <Navigate to="/signin" />} 
                />
                <Route 
                  path="/projects/:projectId/metrics" 
                  element={user ? <MetricsPage /> : <Navigate to="/signin" />} 
                />
                <Route 
                  path="*" 
                  element={<Navigate to={user ? "/dashboard" : "/signin"} />} 
                />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}