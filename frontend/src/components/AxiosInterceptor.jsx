import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function AxiosInterceptor({ children }) {
  const { logout } = useAuth();
  const interceptorRef = useRef(null);

  useEffect(() => {
    // Registra o interceptador na montagem
    interceptorRef.current = api.interceptors.response.use(
      (response) => response, // Se der sucesso, apenas repassa a resposta
      (error) => {
        // Se a API retornar erro 401 (Não Autorizado), executa o logout
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    // Limpa o interceptador quando o componente for desmontado para evitar vazamentos de memória
    return () => {
      if (interceptorRef.current !== null) {
        api.interceptors.response.eject(interceptorRef.current);
      }
    };
  }, [logout]);

  return children; // Este componente não renderiza interface, apenas envolve a aplicação
}