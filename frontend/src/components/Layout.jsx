import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MENU = [
  { to: '/dashboard', texto: 'Visão geral', grupo: 'PRINCIPAL', codigo: '01' },
  { to: '/lancamentos', texto: 'Lançamentos', codigo: '02' },
  { to: '/categorias', texto: 'Categorias', codigo: '03' },
  { to: '/fontes-destinos', texto: 'Contas e cartões', grupo: 'GESTÃO', codigo: '04' },
  { to: '/faturas', texto: 'Faturas', codigo: '05' },
  { to: '/relatorios', texto: 'Relatórios', codigo: '06' }
];
const TITULOS = Object.fromEntries(MENU.map(item => [item.to, item.texto]));

export default function Layout() {
  const { logado, carregando, logout, usuario } = useAuth();
  const location = useLocation();
  if (carregando) return <div className="app-loading">Carregando aplicação...</div>;
  if (!logado) return <Navigate to="/login" replace />;

  const nome = usuario?.nome?.trim() || 'Usuário';
  const inicial = nome[0]?.toUpperCase() || 'U';
  const primeiroNome = nome.split(' ')[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <span className="brand-name">finwise<span>.</span></span>
        </div>
        <div className="sidebar-caption">ESPAÇO DE TRABALHO</div>
        <nav className="nav">
          {MENU.map((item, index) => (
            <div key={item.to}>
              {item.grupo && <div className="nav-group-label">{item.grupo}</div>}
              <NavLink to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <span className="nav-index">{item.codigo}</span>
                <span>{item.texto}</span>
                {location.pathname === item.to && <span className="nav-current" />}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="status-dot" /> Seus dados estão sincronizados</div>
          <div className="profile-row">
            <span className="user-avatar">{inicial}</span>
            <span className="profile-copy"><strong>{primeiroNome}</strong><small>Conta pessoal</small></span>
            <button className="btn-logout" onClick={logout} aria-label="Sair da conta" title="Sair">Sair</button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div><span className="topbar-eyebrow">FINWISE / FINANÇAS PESSOAIS</span><span className="topbar-title">{TITULOS[location.pathname] || 'Painel'}</span></div>
          <div className="topbar-right"><span className="topbar-date">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span><span className="topbar-avatar">{inicial}</span></div>
        </header>
        <div className="content"><div className="content-inner"><Outlet /></div></div>
      </main>
    </div>
  );
}
