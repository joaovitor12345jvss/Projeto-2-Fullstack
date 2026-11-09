import pool from '../config/database.js';

export const FonteDestino = {
  async listar(usuarioId) {
    const query = 'SELECT * FROM fontes_destinos WHERE usuario_id = $1 ORDER BY nome;';
    const result = await pool.query(query, [usuarioId]);
    return result.rows;
  }
};