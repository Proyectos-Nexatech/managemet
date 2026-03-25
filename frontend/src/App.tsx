import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Magnitudes } from './pages/Magnitudes';
import { Equipos } from './pages/Equipos';
import { Competencias } from './pages/Competencias';
import { Calibraciones } from './pages/Calibraciones';
import { Documentos } from './pages/Documentos';
import { ProgramaCalibracion } from './pages/ProgramaCalibracion';
import { NoConformidades } from './pages/NoConformidades';
import { Auditorias } from './pages/Auditorias';
import { Usuarios } from './pages/Usuarios';
import { ConfiguracionCargos } from './pages/ConfiguracionCargos';
import { Login } from './pages/Login';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/magnitudes" element={<Magnitudes />} />
        <Route path="/competencias" element={<Competencias />} />
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/calibraciones" element={<Calibraciones />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/programa" element={<ProgramaCalibracion />} />
        <Route path="/no-conformidades" element={<NoConformidades />} />
        <Route path="/auditorias" element={<Auditorias />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/config-cargos" element={<ConfiguracionCargos />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
