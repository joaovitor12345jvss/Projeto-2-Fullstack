import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const tokenSalvo = localStorage.getItem('@Financas:token');
    const usuarioSalvo = localStorage.getItem('@Financas:usuario');

    if (tokenSalvo && usuarioSalvo) {
      try {
        setToken(tokenSalvo);
        setUsuario(JSON.parse(usuarioSalvo));
      } catch {
        localStorage.removeItem('@Financas:token');
        localStorage.removeItem('@Financas:usuario');
      }
    }
    setCarregando(false);
  }, []);

  async function login(email, senha) {
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      localStorage.setItem('@Financas:token', data.token);
      localStorage.setItem('@Financas:usuario', JSON.stringify(data.usuario));
      setToken(data.token);
      setUsuario(data.usuario);
      navigate('/dashboard');
    } catch (err) {
      throw new Error(err.response?.data?.erro || 'Erro ao fazer login.');
    }
  }

  function logout() {
    localStorage.removeItem('@Financas:token');
    localStorage.removeItem('@Financas:usuario');
    setToken(null);
    setUsuario(null);
    navigate('/login');
  }

  async function cadastrar(dados) {
    try {
      await api.post('/auth/cadastro', dados);
    } catch (err) {
      throw err.response?.data || { erro: 'Erro ao cadastrar. Tente novamente.' };
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
