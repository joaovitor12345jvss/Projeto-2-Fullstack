import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MENU = [
  { to: '/dashboard', icone: '📊', texto: 'Dashboard' },
  { to: '/lancamentos', icone: '🧾', texto: 'Lançamentos' },
  { to: '/categorias', icone: '🏷️', texto: 'Categorias' },
  { to: '/fontes-destinos', icone: '🏦', texto: 'Fontes e Destinos' },
  { to: '/relatorios', icone: '📈', texto: 'Relatórios' },
  { to: '/faturas', icone: '💳', texto: 'Faturas' }
];

export default function Layout() {
  const { logado, carregando, logout, usuario } = useAuth();

  // Impede que a tela pisque no /login antes do useEffect carregar o localStorage
  if (carregando) {
    return <div style={{ padding: '2rem' }}>Carregando aplicação...</div>;
  }

  // Proteção de rota: redireciona se não estiver logado
  if (!logado) {
    return <Navigate to="/login" replace />;
  }

  const inicial = usuario?.nome?.trim()?.[0]?.toUpperCase() || '?';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">💰</span>
          <span>Finanças</span>
        </div>

        <nav className="nav">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span>{item.icone}</span>
              <span>{item.texto}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-avatar">{inicial}</span>
            <span className="user-name">{usuario?.nome}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sair</button>
        </div>
      </aside>

      <main className="content">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
