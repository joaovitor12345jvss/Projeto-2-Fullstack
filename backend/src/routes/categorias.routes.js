import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();
const TIPOS = ['entrada', 'saida'];

function idValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function validarCorpo(body) {
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const { tipo } = body;
  if (!nome || nome.length > 60) return { erro: 'Nome é obrigatório e deve ter até 60 caracteres.' };
  if (!TIPOS.includes(tipo)) return { erro: 'Tipo deve ser entrada ou saida.' };
  return { nome, tipo };
}

// RF4 — Listar (filtro opcional ?tipo=entrada|saida)
router.get('/', async (req, res, next) => {
  const { tipo } = req.query;
  if (tipo && !TIPOS.includes(tipo)) return res.status(400).json({ erro: 'Tipo deve ser entrada ou saida.' });
  try {
    const values = [req.usuarioId];
    let filtro = '';
    if (tipo) { values.push(tipo); filtro = ' AND tipo = $2'; }
    const result = await pool.query(
      `SELECT * FROM categorias WHERE usuario_id = $1${filtro} ORDER BY nome;`,
      values
    );
    return res.json(result.rows);
  } catch (erro) { return next(erro); }
});

// RF4 — Consultar uma
router.get('/:id', async (req, res, next) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const result = await pool.query(
      'SELECT * FROM categorias WHERE id = $1 AND usuario_id = $2;',
      [id, req.usuarioId]
    );
    if (!result.rowCount) return res.status(404).json({ erro: 'Categoria não encontrada.' });
    return res.json(result.rows[0]);
  } catch (erro) { return next(erro); }
});

// RF4 — Criar
router.post('/', async (req, res, next) => {
  const dados = validarCorpo(req.body);
  if (dados.erro) return res.status(400).json({ erro: dados.erro });

  try {
    const result = await pool.query(
      'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3) RETURNING *;',
      [req.usuarioId, dados.nome, dados.tipo]
    );
    return res.status(201).json(result.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Você já possui uma categoria com este nome e tipo.' });
    }
    return next(erro);
  }
});

// RF4 — Editar
router.put('/:id', async (req, res, next) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });
  const dados = validarCorpo(req.body);
  if (dados.erro) return res.status(400).json({ erro: dados.erro });

  try {
    const atual = await pool.query(
      'SELECT tipo FROM categorias WHERE id = $1 AND usuario_id = $2;',
      [id, req.usuarioId]
    );
    if (!atual.rowCount) return res.status(404).json({ erro: 'Categoria não encontrada.' });

    // Mudar o tipo de uma categoria já usada deixaria lançamentos inconsistentes
    if (atual.rows[0].tipo !== dados.tipo) {
      const uso = await pool.query(
        'SELECT 1 FROM lancamentos WHERE categoria_id = $1 AND usuario_id = $2 LIMIT 1;',
        [id, req.usuarioId]
      );
      if (uso.rowCount) {
        return res.status(409).json({ erro: 'Não é possível alterar o tipo de uma categoria que já possui lançamentos.' });
      }
    }

    const result = await pool.query(
      'UPDATE categorias SET nome = $1, tipo = $2 WHERE id = $3 AND usuario_id = $4 RETURNING *;',
      [dados.nome, dados.tipo, id, req.usuarioId]
    );
    return res.json(result.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Você já possui uma categoria com este nome e tipo.' });
    }
    return next(erro);
  }
});

// RF4 — Excluir (bloqueia se houver lançamentos vinculados)
router.delete('/:id', async (req, res, next) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    const result = await pool.query(
      'DELETE FROM categorias WHERE id = $1 AND usuario_id = $2 RETURNING id;',
      [id, req.usuarioId]
    );
    if (!result.rowCount) return res.status(404).json({ erro: 'Categoria não encontrada.' });
    return res.status(204).send();
  } catch (erro) {
    if (erro.code === '23503') {
      return res.status(409).json({ erro: 'Não é possível excluir: existem lançamentos vinculados a esta categoria.' });
    }
    return next(erro);
  }
});

export default router;