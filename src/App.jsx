import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import HomePage from './pages/HomePage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectFormPage from './pages/ProjectFormPage';
import UsersPage from './pages/UsersPage';
import PassportPage from './pages/PassportPage';
import KanbanPage from './pages/KanbanPage';
import SettingsPage from './pages/SettingsPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/projects" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
        <Route path="/projects/:id" element={<PrivateRoute><ProjectDetailPage /></PrivateRoute>} />
        <Route path="/projects/:id/passport" element={<PrivateRoute><PassportPage /></PrivateRoute>} />
        <Route path="/kanban" element={<PrivateRoute><KanbanPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

        {/* Admin only */}
        <Route path="/admin/projects/new" element={<AdminRoute><ProjectFormPage /></AdminRoute>} />
        <Route path="/admin/projects/:id/edit" element={<AdminRoute><ProjectFormPage /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
