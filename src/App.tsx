import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CategoryView } from './pages/CategoryView';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/category/:id" element={<CategoryView />} />
              </Routes>
            </main>
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
