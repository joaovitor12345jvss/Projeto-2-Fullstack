import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const estilos = {
  fundo: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5', padding: '1rem', boxSizing: 'border-box' },
  card: { width: '100%', maxWidth: 380, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '2rem', textAlign: 'left', color: '#222', boxSizing: 'border-box' },
  titulo: { color: '#222', fontSize: '1.8rem', margin: '0 0 1.5rem', textAlign: 'center' },
  campo: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.9rem', marginBottom: '1rem' },
  input: { padding: '10px', border: '1px solid #bbb', borderRadius: 4, background: '#fff', color: '#222', fontSize: '1rem' },
  botao: { width: '100%', padding: '10px', border: 'none', borderRadius: 4, background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '1rem' },
  erro: { background: '#fdecea', color: '#b71c1c', padding: '8px 12px', borderRadius: 4, marginBottom: '1rem', fontSize: '0.9rem' },
  rodape: { marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', color: '#444' }
};

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
    <div style={estilos.fundo}>
      <form onSubmit={entrar} style={estilos.card}>
        <h1 style={estilos.titulo}>Finanças</h1>

        {erro && <div style={estilos.erro}>{erro}</div>}

        <label style={estilos.campo}>
          E-mail
          <input
            style={estilos.input} type="email" required autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label style={estilos.campo}>
          Senha
          <input
            style={estilos.input} type="password" required
            value={senha} onChange={(e) => setSenha(e.target.value)}
          />
        </label>

        <button type="submit" style={estilos.botao} disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>

        <p style={estilos.rodape}>
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}
