import { Router } from 'express';
import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Inserir Lançamento (RF6 - com suporte a parcelamento)
router.post('/', async (req, res, next) => {
  const { tipo, descricao, valor, data, categoria_id, fonte_destino_id, total_parcelas } = req.body;
  const usuarioId = req.usuarioId;

  if (!tipo || !descricao || valor === undefined || !data || !categoria_id || !fonte_destino_id) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos: { geral: 'Todos os campos são obrigatórios.' } });
  }

  if (valor <= 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos: { valor: 'O valor deve ser maior que zero.' } });
  }

  const client = await pool.connect();

  try {
    // 1. Validação de posse e correspondência de tipo
    const catQuery = 'SELECT tipo FROM categorias WHERE id = $1 AND usuario_id = $2';
    const catResult = await client.query(catQuery, [categoria_id, usuarioId]);
    
    if (catResult.rowCount === 0) {
      return res.status(404).json({ erro: 'Categoria não encontrada ou não pertence ao utilizador.' });
    }
    if (catResult.rows[0].tipo !== tipo) {
      return res.status(400).json({ erro: 'O tipo da categoria é diferente do tipo do lançamento.' });
    }

    const fonteQuery = 'SELECT tipo FROM fontes_destinos WHERE id = $1 AND usuario_id = $2';
    const fonteResult = await client.query(fonteQuery, [fonte_destino_id, usuarioId]);
    
    if (fonteResult.rowCount === 0) {
      return res.status(404).json({ erro: 'Fonte/Destino não encontrada ou não pertence ao utilizador.' });
    }

    const tipoFonte = fonteResult.rows[0].tipo;
    const parcelas = (tipoFonte === 'cartao_credito' && total_parcelas > 1) ? parseInt(total_parcelas, 10) : 1;

    await client.query('BEGIN'); // Inicia a transação

    const lancamentosInseridos = [];

    if (parcelas > 1) {
      // 2. Lógica de parcelamento com divisão exata de cêntimos
      const grupoParcelamento = uuidv4();
      const valorCentimos = Math.round(valor * 100);
      const valorBaseParcela = Math.floor(valorCentimos / parcelas);
      const resto = valorCentimos % parcelas;

      // Usamos a data base enviada para gerar as datas dos meses seguintes
      const dataBase = new Date(data);

      for (let i = 1; i <= parcelas; i++) {
        // A diferença de arredondamento vai para a primeira parcela (ex: R$ 100 em 3x -> 33.34 + 33.33 + 33.33)
        const valorParcelaAtual = (i === 1 ? valorBaseParcela + resto : valorBaseParcela) / 100;
        
        const dataParcela = new Date(dataBase.getFullYear(), dataBase.getMonth() + (i - 1), dataBase.getDate());

        const insertQuery = `
          INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
        `;
        const values = [usuarioId, tipo, descricao, valorParcelaAtual, dataParcela.toISOString().split('T')[0], categoria_id, fonte_destino_id, i, parcelas, grupoParcelamento];
        
        const result = await client.query(insertQuery, values);
        lancamentosInseridos.push(result.rows[0]);
      }
    } else {
      // Inserção de lançamento único
      const insertQuery = `
        INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
      `;
      const values = [usuarioId, tipo, descricao, valor, data, categoria_id, fonte_destino_id];
      const result = await client.query(insertQuery, values);
      lancamentosInseridos.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return res.status(201).json(parcelas > 1 ? lancamentosInseridos : lancamentosInseridos[0]);

  } catch (erro) {
    await client.query('ROLLBACK');
    return next(erro);
  } finally {
    client.release();
  }
});

// Listagem de Lançamentos com Filtros e Paginação (RF6)
router.get('/', async (req, res, next) => {
  const { inicio, fim, tipo, categoriaId, fonteDestinoId, pagina = 1 } = req.query;
  const limite = 20;
  const offset = (pagina - 1) * limite;
  
  try {
    let query = `
      SELECT l.*, c.nome as categoria_nome, f.nome as fonte_nome 
      FROM lancamentos l
      JOIN categorias c ON l.categoria_id = c.id
      JOIN fontes_destinos f ON l.fonte_destino_id = f.id
      WHERE l.usuario_id = $1
    `;
    const values = [req.usuarioId];
    let count = 2;

    if (inicio && fim) {
      query += ` AND l.data BETWEEN $${count} AND $${count+1}`;
      values.push(inicio, fim);
      count += 2;
    }
    if (tipo) {
      query += ` AND l.tipo = $${count}`;
      values.push(tipo);
      count++;
    }
    if (categoriaId) {
      query += ` AND l.categoria_id = $${count}`;
      values.push(categoriaId);
      count++;
    }
    if (fonteDestinoId) {
      query += ` AND l.fonte_destino_id = $${count}`;
      values.push(fonteDestinoId);
      count++;
    }

    query += ` ORDER BY l.data DESC LIMIT $${count} OFFSET $${count+1}`;
    values.push(limite, offset);

    const result = await pool.query(query, values);
    return res.json(result.rows);
  } catch (erro) {
    return next(erro);
  }
});

export default router;