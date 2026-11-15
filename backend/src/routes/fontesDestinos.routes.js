import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();
const TIPOS = ['renda', 'conta', 'cartao_credito'];

function idValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function diaValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

// Valida o corpo e devolve os dados normalizados (campos de cartão ficam null nos outros tipos)
function validarCorpo(body) {
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const { tipo } = body;
  if (!nome || nome.length > 60) return { erro: 'Nome é obrigatório e deve ter até 60 caracteres.' };
  if (!TIPOS.includes(tipo)) return { erro: 'Tipo deve ser renda, conta ou cartao_credito.' };

  if (tipo !== 'cartao_credito') {
    return { nome, tipo, dia_fechamento: null, dia_vencimento: null, limite: null };
  }

  const fechamento = diaValido(body.dia_fechamento);
  const vencimento = diaValido(body.dia_vencimento);
  const limite = Number(body.limite);
  if (!fechamento || !vencimento) {
    return { erro: 'Cartão de crédito exige dia_fechamento e dia_vencimento entre 1 e 31.' };
  }
  if (body.limite === undefined || body.limite === null || body.limite === ''
      || !Number.isFinite(limite) || limite < 0) {
    return { erro: 'Cartão de crédito exige um limite numérico maior ou igual a zero.' };
  }
  return { nome, tipo, dia_fechamento: fechamento, dia_vencimento: vencimento, limite };
}

// RF5 — Listar (filtro opcional ?tipo=renda|conta|cartao_credito)
router.get('/', async (req, res, next) => {
  const { tipo } = req.query;
  if (tipo && !TIPOS.includes(tipo)) return res.status(400).json({ erro: 'Tipo inválido.' });
  try {
    const values = [req.usuarioId];
    let filtro = '';
    if (tipo) { values.push(tipo); filtro = ' AND tipo = $2'; }
    const result = await pool.query(
      `SELECT * FROM fontes_destinos WHERE usuario_id = $1${filtro} ORDER BY nome;`,
      values
    );
    return res.json(result.rows);
  } catch (erro) { return next(erro); }
});

// RF5 — Consultar uma
router.get('/:id', async (req, res, next) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const result = await pool.query(
      'SELECT * FROM fontes_destinos WHERE id = $1 AND usuario_id = $2;',
      [id, req.usuarioId]
    );
    if (!result.rowCount) return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });
    return res.json(result.rows[0]);
  } catch (erro) { return next(erro); }
});

// RF5 — Criar
router.post('/', async (req, res, next) => {
  const d = validarCorpo(req.body);
  if (d.erro) return res.status(400).json({ erro: d.erro });

  try {
    const result = await pool.query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
      [req.usuarioId, d.nome, d.tipo, d.dia_fechamento, d.dia_vencimento, d.limite]
    );
    return res.status(201).json(result.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Você já possui uma fonte/destino com este nome.' });
    }
    return next(erro);
  }
});

// RF5 — Editar
router.put('/:id', async (req, res, next) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });
  const d = validarCorpo(req.body);
  if (d.erro) return res.status(400).json({ erro: d.erro });

  try {
    const atual = await pool.query(
      'SELECT tipo FROM fontes_destinos WHERE id = $1 AND usuario_id = $2;',
      [id, req.usuarioId]
    );
    if (!atual.rowCount) return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });

    // Mudar o tipo de uma fonte já usada pode invalidar parcelas e faturas existentes
    if (atual.rows[0].tipo !== d.tipo) {
      const uso = await pool.query(
        'SELECT 1 FROM lancamentos WHERE fonte_destino_id = $1 AND usuario_id = $2 LIMIT 1;',
        [id, req.usuarioId]
      );
      if (uso.rowCount) {
        return res.status(409).json({ erro: 'Não é possível alterar o tipo de uma fonte/destino que já possui lançamentos.' });
      }
    }

    const result = await pool.query(
      `UPDATE fontes_destinos
       SET nome = $1, tipo = $2, dia_fechamento = $3, dia_vencimento = $4, limite = $5
       WHERE id = $6 AND usuario_id = $7 RETURNING *;`,
      [d.nome, d.tipo, d.dia_fechamento, d.dia_vencimento, d.limite, id, req.usuarioId]
    );
    return res.json(result.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Você já possui uma fonte/destino com este nome.' });
    }
    return next(erro);
  }
});

// RF5 — Excluir (bloqueia se houver lançamentos vinculados)
router.delete('/:id', async (req, res, next) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    const result = await pool.query(
      'DELETE FROM fontes_destinos WHERE id = $1 AND usuario_id = $2 RETURNING id;',
      [id, req.usuarioId]
    );
    if (!result.rowCount) return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });
    return res.status(204).send();
  } catch (erro) {
    if (erro.code === '23503') {
      return res.status(409).json({ erro: 'Não é possível excluir: existem lançamentos vinculados a esta fonte/destino.' });
    }
    return next(erro);
  }
});

export default router;