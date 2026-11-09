import pool from '../config/database.js';

export const Usuario = {
  // Função para criar um novo usuário no banco
  async criar({ nome, email, cpf, senhaHash }) {
    const query = `
      INSERT INTO usuarios (nome, email, cpf, senha_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, email;
    `;
    
    // Os dados já devem chegar aqui normalizados (trim, toLowerCase, apenas números no CPF)
    const values = [nome, email, cpf, senhaHash];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Função para buscar usuário pelo e-mail (usada no login)
  async buscarPorEmail(email) {
    const query = 'SELECT * FROM usuarios WHERE email = $1;';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }
};