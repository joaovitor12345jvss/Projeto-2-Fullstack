import pool from '../config/database.js';

export const Lancamento = {
  // Lista lançamentos com isolamento de usuário
  async listarPorPeriodo(usuarioId, inicio, fim) {
    const query = `
      SELECT l.*, c.nome as categoria_nome, f.nome as fonte_nome 
      FROM lancamentos l
      JOIN categorias c ON l.categoria_id = c.id
      JOIN fontes_destinos f ON l.fonte_destino_id = f.id
      WHERE l.usuario_id = $1 AND l.data BETWEEN $2 AND $3
      ORDER BY l.data DESC;
    `;
    const result = await pool.query(query, [usuarioId, inicio, fim]);
    return result.rows;
  }
};