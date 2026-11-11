import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// Listar categorias do usuário logado
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categorias WHERE usuario_id = $1 ORDER BY nome;',
      [req.usuarioId]
    );
    return res.json(result.rows);
  } catch (erro) {
    return next(erro);
  }
});

// Criar nova categoria
router.post('/', async (req, res, next) => {
  const { nome, tipo } = req.body;
  if (!nome || !tipo) {
    return res.status(400).json({ erro: 'Nome e tipo são obrigatórios.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3) RETURNING *;',
      [req.usuarioId, nome, tipo]
    );
    return res.status(201).json(result.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') { // Restrição UNIQUE do banco
      return res.status(409).json({ erro: 'Você já possui uma categoria com este nome e tipo.' });
    }
    return next(erro);
  }
});

// A implementação de PUT e DELETE segue o mesmo padrão usando consultas parametrizadas.

export default router;