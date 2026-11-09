import pool from '../config/database.js';

export const Categoria = {
  // Cria categorias e fontes padrão logo após o cadastro do usuário
  async criarPadrao(usuarioId) {
    const categorias = [
      { nome: 'Salário', tipo: 'entrada' },
      { nome: 'Alimentação', tipo: 'saida' },
      { nome: 'Moradia', tipo: 'saida' },
      { nome: 'Saúde', tipo: 'saida' },
      { nome: 'Mobilidade', tipo: 'saida' },
      { nome: 'Lazer', tipo: 'saida' },
      { nome: 'Educação', tipo: 'saida' },
      { nome: 'Outros', tipo: 'saida' }
    ];

    const fontePadrao = { nome: 'Conta corrente', tipo: 'conta' };

    const client = await pool.connect();

    try {
      await client.query('BEGIN'); // Inicia a transação

      // Insere as categorias
      for (const cat of categorias) {
        const catQuery = `
          INSERT INTO categorias (usuario_id, nome, tipo)
          VALUES ($1, $2, $3)
        `;
        await client.query(catQuery, [usuarioId, cat.nome, cat.tipo]);
      }

      // Insere a fonte/destino padrão
      const fonteQuery = `
        INSERT INTO fontes_destinos (usuario_id, nome, tipo)
        VALUES ($1, $2, $3)
      `;
      await client.query(fonteQuery, [usuarioId, fontePadrao.nome, fontePadrao.tipo]);

      await client.query('COMMIT'); // Confirma a transação
    } catch (e) {
      await client.query('ROLLBACK'); // Reverte em caso de erro
      throw e;
    } finally {
      client.release();
    }
  },

  async listar(usuarioId) {
    const query = 'SELECT * FROM categorias WHERE usuario_id = $1 ORDER BY nome;';
    const result = await pool.query(query, [usuarioId]);
    return result.rows;
  }
};