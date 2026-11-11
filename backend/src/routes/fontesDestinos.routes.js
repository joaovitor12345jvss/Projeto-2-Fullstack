import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// Listar fontes e destinos do usuário logado
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fontes_destinos WHERE usuario_id = $1 ORDER BY nome;',
      [req.usuarioId]
    );
    return res.json(result.rows);
  } catch (erro) {
    return next(erro);
  }
});

// A implementação de POST, PUT e DELETE segue o mesmo padrão usando consultas parametrizadas e tratamento de erros.

export default router;