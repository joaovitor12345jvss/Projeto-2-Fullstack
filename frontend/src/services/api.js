import axios from 'axios';

// Cria a instância base conectada ao servidor local
export const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Ajuste a porta se o seu .env do back-end for diferente
  headers: {
    'Content-Type': 'application/json'
  }
});

// Adiciona o token JWT a todas as requisições enviadas
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('@Financas:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);