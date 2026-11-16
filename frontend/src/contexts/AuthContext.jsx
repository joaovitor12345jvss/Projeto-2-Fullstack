import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  // Recupera o token e usuário do localStorage ao recarregar a página
  useEffect(() => {
    const tokenSalvo = localStorage.getItem('@Financas:token');
    const usuarioSalvo = localStorage.getItem('@Financas:usuario');

    if (tokenSalvo && usuarioSalvo) {
      setToken(tokenSalvo);
      setUsuario(JSON.parse(usuarioSalvo));
    }
    setCarregando(false);
  }, []);

  async function login(email, senha) {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.erro || 'Erro ao fazer login.');
    }

    const data = await response.json();
    
    localStorage.setItem('@Financas:token', data.token);
    localStorage.setItem('@Financas:usuario', JSON.stringify(data.usuario));
    
    setToken(data.token);
    setUsuario(data.usuario);
    navigate('/dashboard'); // Redireciona após o sucesso
  }

  function logout() {
    localStorage.removeItem('@Financas:token');
    localStorage.removeItem('@Financas:usuario');
    setToken(null);
    setUsuario(null);
    navigate('/login');
  }

  async function cadastrar(dados) {
    const response = await fetch('http://localhost:3000/api/auth/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (!response.ok) {
      const error = await response.json();
      throw error; // Lança o erro (ex: 409 Conflict) para o componente exibir no campo correto
    }
  }

  return (
    <AuthContext.Provider value={{ logado: !!token, usuario, token, carregando, login, logout, cadastrar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}