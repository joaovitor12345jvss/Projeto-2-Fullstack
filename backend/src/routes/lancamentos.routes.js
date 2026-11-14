import { Router } from 'express';
import pool from '../config/database.js';
import { randomUUID } from 'node:crypto';

const router = Router();
const TIPOS = ['entrada', 'saida'];
const MAX_POR_PAGINA = 50;

function inteiroPositivo(valor, padrao = null) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function dataValida(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
    && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`))
    && new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;
}

function adicionarMeses(dataString, quantidade) {
  const [ano, mes, dia] = dataString.split('-').map(Number);
  const primeiroDia = new Date(Date.UTC(ano, mes - 1 + quantidade, 1));
  const ultimoDia = new Date(Date.UTC(primeiroDia.getUTCFullYear(), primeiroDia.getUTCMonth() + 1, 0)).getUTCDate();
  const diaFinal = Math.min(dia, ultimoDia);
  return `${primeiroDia.getUTCFullYear()}-${String(primeiroDia.getUTCMonth() + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
}

async function validarRelacionamentos(client, usuarioId, tipo, categoriaId, fonteDestinoId) {
  const categoria = await client.query(
    'SELECT id, tipo FROM categorias WHERE id = $1 AND usuario_id = $2',
    [categoriaId, usuarioId]
  );
  if (!categoria.rowCount) return { status: 404, erro: 'Categoria não encontrada ou não pertence ao usuário.' };
  if (categoria.rows[0].tipo !== tipo) return { status: 400, erro: 'A categoria não corresponde ao tipo do lançamento.' };

  const fonte = await client.query(
    'SELECT id, tipo FROM fontes_destinos WHERE id = $1 AND usuario_id = $2',
    [fonteDestinoId, usuarioId]
  );
  if (!fonte.rowCount) return { status: 404, erro: 'Fonte/destino não encontrada ou não pertence ao usuário.' };
  return { fonte: fonte.rows[0] };
}

// RF6 — Criar lançamento. Compras parceladas no cartão geram um registro por parcela.
router.post('/', async (req, res, next) => {
  const { tipo, descricao, valor, data, categoria_id, fonte_destino_id, total_parcelas = 1 } = req.body;
  const usuarioId = req.usuarioId;
  const valorNumerico = Number(valor);
  const categoriaId = inteiroPositivo(categoria_id);
  const fonteDestinoId = inteiroPositivo(fonte_destino_id);
  const parcelas = inteiroPositivo(total_parcelas);

  if (!TIPOS.includes(tipo) || typeof descricao !== 'string' || !descricao.trim()
      || descricao.trim().length > 120 || !Number.isFinite(valorNumerico) || valorNumerico <= 0
      || !dataValida(data) || !categoriaId || !fonteDestinoId || !parcelas || parcelas > 48) {
    return res.status(400).json({ erro: 'Dados inválidos. Verifique tipo, descrição, valor, data, categoria, fonte/destino e parcelas (1 a 48).' });
  }

  const client = await pool.connect();
  let transacaoIniciada = false;
  try {
    const validacao = await validarRelacionamentos(client, usuarioId, tipo, categoriaId, fonteDestinoId);
    if (validacao.erro) return res.status(validacao.status).json({ erro: validacao.erro });

    if (parcelas > 1 && (tipo !== 'saida' || validacao.fonte.tipo !== 'cartao_credito')) {
      return res.status(400).json({ erro: 'Parcelamento só é permitido para despesas em cartão de crédito.' });
    }

    await client.query('BEGIN');
    transacaoIniciada = true;
    const grupo = parcelas > 1 ? randomUUID() : null;
    const totalCentavos = Math.round(valorNumerico * 100);
    const baseCentavos = Math.floor(totalCentavos / parcelas);
    const resto = totalCentavos % parcelas;
    const inseridos = [];

    for (let i = 1; i <= parcelas; i++) {
      const valorParcela = (baseCentavos + (i === 1 ? resto : 0)) / 100;
      const dataParcela = adicionarMeses(data, i - 1);
      const result = await client.query(
        `INSERT INTO lancamentos
          (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
           parcela_atual, total_parcelas, grupo_parcelamento)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [usuarioId, tipo, descricao.trim(), valorParcela, dataParcela, categoriaId,
          fonteDestinoId, i, parcelas, grupo]
      );
      inseridos.push(result.rows[0]);
    }

    await client.query('COMMIT');
    transacaoIniciada = false;
    return res.status(201).json(parcelas > 1
      ? { grupo_parcelamento: grupo, total_parcelas: parcelas, lancamentos: inseridos }
      : inseridos[0]);
  } catch (erro) {
    if (transacaoIniciada) await client.query('ROLLBACK');
    return next(erro);
  } finally {
    client.release();
  }
});

// RF6 — Listar com filtros independentes e paginação.
router.get('/', async (req, res, next) => {
  const { inicio, fim, tipo, categoriaId, fonteDestinoId, pagina = '1', porPagina = '20' } = req.query;
  const page = inteiroPositivo(pagina);
  const pageSize = inteiroPositivo(porPagina);
  if (!page || !pageSize || pageSize > MAX_POR_PAGINA) {
    return res.status(400).json({ erro: `pagina deve ser positiva e porPagina deve estar entre 1 e ${MAX_POR_PAGINA}.` });
  }
  if ((inicio && !dataValida(inicio)) || (fim && !dataValida(fim))) {
    return res.status(400).json({ erro: 'As datas devem estar no formato AAAA-MM-DD.' });
  }
  if (inicio && fim && inicio > fim) return res.status(400).json({ erro: 'A data inicial não pode ser posterior à data final.' });
  if (tipo && !TIPOS.includes(tipo)) return res.status(400).json({ erro: 'Tipo deve ser entrada ou saida.' });
  const catId = categoriaId ? inteiroPositivo(categoriaId) : null;
  const fonteId = fonteDestinoId ? inteiroPositivo(fonteDestinoId) : null;
  if ((categoriaId && !catId) || (fonteDestinoId && !fonteId)) {
    return res.status(400).json({ erro: 'categoriaId e fonteDestinoId devem ser números inteiros positivos.' });
  }

  try {
    const conditions = ['l.usuario_id = $1'];
    const values = [req.usuarioId];
    const add = (sql, value) => { values.push(value); conditions.push(sql.replace('?', `$${values.length}`)); };
    if (inicio) add('l.data >= ?', inicio);
    if (fim) add('l.data <= ?', fim);
    if (tipo) add('l.tipo = ?', tipo);
    if (catId) add('l.categoria_id = ?', catId);
    if (fonteId) add('l.fonte_destino_id = ?', fonteId);

    const where = conditions.join(' AND ');
    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM lancamentos l WHERE ${where}`, values);
    const total = countResult.rows[0].total;
    const offset = (page - 1) * pageSize;
    const dataValues = [...values, pageSize, offset];
    const result = await pool.query(
      `SELECT l.*, c.nome AS categoria_nome, f.nome AS fonte_nome, f.tipo AS fonte_tipo
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id AND c.usuario_id = l.usuario_id
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id AND f.usuario_id = l.usuario_id
       WHERE ${where}
       ORDER BY l.data DESC, l.id DESC
       LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`,
      dataValues
    );
    return res.json({
      dados: result.rows,
      paginacao: { pagina: page, porPagina: pageSize, total, totalPaginas: Math.ceil(total / pageSize) }
    });
  } catch (erro) {
    return next(erro);
  }
});

// RF6 — Consultar um lançamento específico.
router.get('/:id', async (req, res, next) => {
  const id = inteiroPositivo(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const result = await pool.query(
      `SELECT l.*, c.nome AS categoria_nome, f.nome AS fonte_nome, f.tipo AS fonte_tipo
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id
       WHERE l.id = $1 AND l.usuario_id = $2`,
      [id, req.usuarioId]
    );
    if (!result.rowCount) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    return res.json(result.rows[0]);
  } catch (erro) { return next(erro); }
});

// RF6 — Atualizar um lançamento (somente o registro informado).
router.put('/:id', async (req, res, next) => {
  const id = inteiroPositivo(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });
  const { tipo, descricao, valor, data, categoria_id, fonte_destino_id } = req.body;
  const valorNumerico = Number(valor);
  const categoriaId = inteiroPositivo(categoria_id);
  const fonteDestinoId = inteiroPositivo(fonte_destino_id);
  if (!TIPOS.includes(tipo) || typeof descricao !== 'string' || !descricao.trim()
      || descricao.trim().length > 120 || !Number.isFinite(valorNumerico) || valorNumerico <= 0
      || !dataValida(data) || !categoriaId || !fonteDestinoId) {
    return res.status(400).json({ erro: 'Informe tipo, descrição, valor positivo, data, categoria_id e fonte_destino_id válidos.' });
  }

  const client = await pool.connect();
  try {
    const validacao = await validarRelacionamentos(client, req.usuarioId, tipo, categoriaId, fonteDestinoId);
    if (validacao.erro) return res.status(validacao.status).json({ erro: validacao.erro });
    if (validacao.fonte.tipo === 'cartao_credito' && tipo !== 'saida') {
      return res.status(400).json({ erro: 'Cartão de crédito só pode ser usado em despesas.' });
    }
    const result = await client.query(
      `UPDATE lancamentos
       SET tipo=$1, descricao=$2, valor=$3, data=$4, categoria_id=$5, fonte_destino_id=$6
       WHERE id=$7 AND usuario_id=$8
       RETURNING *`,
      [tipo, descricao.trim(), valorNumerico, data, categoriaId, fonteDestinoId, id, req.usuarioId]
    );
    if (!result.rowCount) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    return res.json(result.rows[0]);
  } catch (erro) { return next(erro); }
  finally { client.release(); }
});

// RF6 — Excluir um lançamento. Use ?grupo=true para excluir todas as parcelas do mesmo grupo.
router.delete('/:id', async (req, res, next) => {
  const id = inteiroPositivo(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const encontrado = await pool.query(
      'SELECT grupo_parcelamento FROM lancamentos WHERE id=$1 AND usuario_id=$2',
      [id, req.usuarioId]
    );
    if (!encontrado.rowCount) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    const grupo = encontrado.rows[0].grupo_parcelamento;
    const result = req.query.grupo === 'true' && grupo
      ? await pool.query('DELETE FROM lancamentos WHERE grupo_parcelamento=$1 AND usuario_id=$2 RETURNING id', [grupo, req.usuarioId])
      : await pool.query('DELETE FROM lancamentos WHERE id=$1 AND usuario_id=$2 RETURNING id', [id, req.usuarioId]);
    return res.json({ mensagem: 'Lançamento(s) excluído(s) com sucesso.', excluidos: result.rowCount });
  } catch (erro) { return next(erro); }
});

export default router;
