import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const { login, logado, carregando } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!carregando && logado) return <Navigate to="/dashboard" replace />;

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await login(email, senha);
    } catch (e2) {
      setErro(e2.message || 'Erro ao fazer login.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-side">
        <h1>Finwise</h1>
        <p>Controle suas entradas, saídas e faturas de cartão em um só lugar.</p>
        <ul>
          <li>✓ Lançamentos com parcelamento</li>
          <li>✓ Relatórios por categoria e por fonte</li>
          <li>✓ Previsão das faturas dos cartões</li>
        </ul>
      </div>

      <div className="auth-main">
        <form onSubmit={entrar} className="card auth-card">
          <h2>Bem-vindo de volta</h2>
          <p className="page-subtitle">Entre com a sua conta para continuar.</p>

          {erro && <div className="alert alert-error">{erro}</div>}

          <label className="field">
            E-mail
            <input
              type="email" required autoFocus placeholder="voce@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            Senha
            <input
              type="password" required placeholder="Sua senha"
              value={senha} onChange={(e) => setSenha(e.target.value)}
            />
          </label>

          <button type="submit" className="btn btn-block" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="auth-footer">
            Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
