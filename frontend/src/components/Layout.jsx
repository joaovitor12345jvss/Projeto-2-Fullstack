import { Link, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { logado, carregando, logout } = useAuth();

  // Impede que a tela pisque no /login antes do useEffect carregar o localStorage
  if (carregando) {
    return <div style={{ padding: '2rem' }}>Carregando aplicação...</div>;
  }

  // Proteção de rota: redireciona se não estiver logado
  if (!logado) {
    return <Navigate to="/login" replace />;
  }

  // Menu lateral
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{ width: '220px', padding: '1rem', backgroundColor: '#f4f4f5', borderRight: '1px solid #ddd' }}>
        <h2>Finanças</h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '2rem' }}>
          <li><Link to="/dashboard" style={{ textDecoration: 'none', color: '#333' }}>Dashboard</Link></li>
          <li><Link to="/lancamentos" style={{ textDecoration: 'none', color: '#333' }}>Lançamentos</Link></li>
          <li><Link to="/categorias" style={{ textDecoration: 'none', color: '#333' }}>Categorias</Link></li>
          <li><Link to="/fontes-destinos" style={{ textDecoration: 'none', color: '#333' }}>Fontes e Destinos</Link></li>
          <li><Link to="/relatorios" style={{ textDecoration: 'none', color: '#333' }}>Relatórios</Link></li>
          <li><Link to="/faturas" style={{ textDecoration: 'none', color: '#333' }}>Faturas</Link></li>
          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #ccc' }} />
          {/* Botão de Logout conectado ao Contexto */}
          <li>
            <button 
              onClick={logout} 
              style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', padding: 0, fontSize: '1rem' }}
            >
              Sair
            </button>
          </li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '2rem', backgroundColor: '#ffffff' }}>
        <Outlet /> 
      </main>
    </div>
  );
}