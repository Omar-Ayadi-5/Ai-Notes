import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import WorkspacePage from './pages/WorkspacePage';
import SharedPage from './pages/SharedPage';
import { DEMO_ONLY } from './config';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={DEMO_ONLY ? <Navigate to="/demo" replace /> : <LoginPage />} />
          <Route path="/signup" element={DEMO_ONLY ? <Navigate to="/demo" replace /> : <SignupPage />} />
          <Route path="/demo" element={<WorkspacePage demo />} />
          {!DEMO_ONLY && <Route path="/shared" element={<SharedPage />} />}
          {!DEMO_ONLY && <Route path="/shared/:shareId" element={<SharedPage />} />}
          <Route
            path="/"
            element={
              DEMO_ONLY ? <Navigate to="/demo" replace /> : <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
