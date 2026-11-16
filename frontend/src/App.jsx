import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AxiosInterceptor from './components/AxiosInterceptor'; // Importe aqui

// Layout e páginas...
import Layout from './components/Layout';
import Login from './components/pages/Login';
import Cadastro from './components/pages/Cadastro';
import Dashboard from './components/pages/Dashboard';
import Lancamentos from './components/pages/Lancamentos';
import Categorias from './components/pages/Categorias';
import FontesDestinos from './components/pages/FontesDestinos';
import Relatorios from './components/pages/Relatorios';
import Faturas from './components/pages/Faturas';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AxiosInterceptor> {/* O Interceptador envolve as rotas */}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />

            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/lancamentos" element={<Lancamentos />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/fontes-destinos" element={<FontesDestinos />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/faturas" element={<Faturas />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AxiosInterceptor>
      </AuthProvider>
    </BrowserRouter>
  );
}