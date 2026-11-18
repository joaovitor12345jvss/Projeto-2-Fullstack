import { Router } from 'express';
import pool from '../config/database.js';
import { cicloDaCompra, datasDoCiclo, somarMeses, statusDaFatura, dataLocalISO } from '../models/Fatura.js';

const router = Router();

function dataValida(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
    && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`))
    && new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;
}

function mesValido(valor) {
  return typeof valor === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

// RF7 — Relatório financeiro por categoria (totais, quantidade e % do total do tipo).
router.get('/categorias', async (req, res, next) => {
  const { inicio, fim, tipo } = req.query;
  if ((inicio && !dataValida(inicio)) || (fim && !dataValida(fim))) {
    return res.status(400).json({ erro: 'As datas devem estar no formato AAAA-MM-DD.' });
  }
  if (inicio && fim && inicio > fim) return res.status(400).json({ erro: 'A data inicial não pode ser posterior à final.' });
  if (tipo && !['entrada', 'saida'].includes(tipo)) return res.status(400).json({ erro: 'Tipo deve ser entrada ou saida.' });

  try {
    const values = [req.usuarioId];
    const joinCond = ['l.categoria_id = c.id', 'l.usuario_id = c.usuario_id'];
    if (inicio) { values.push(inicio); joinCond.push(`l.data >= $${values.length}`); }
    if (fim) { values.push(fim); joinCond.push(`l.data <= $${values.length}`); }
    let filtroTipo = '';
    if (tipo) { values.push(tipo); filtroTipo = ` AND c.tipo = $${values.length}`; }

    const result = await pool.query(
      `SELECT c.id AS categoria_id, c.nome, c.tipo,
              COALESCE(SUM(l.valor), 0)::numeric(14,2) AS total,
              COUNT(l.id)::int AS quantidade_lancamentos
       FROM categorias c
       LEFT JOIN lancamentos l ON ${joinCond.join(' AND ')}
       WHERE c.usuario_id = $1${filtroTipo}
       GROUP BY c.id, c.nome, c.tipo
       ORDER BY c.tipo, total DESC, c.nome`,
      values
    );

    const somaPorTipo = { entrada: 0, saida: 0 };
    for (const r of result.rows) somaPorTipo[r.tipo] += Number(r.total);

    const dados = result.rows.map(r => ({
      categoria_id: r.categoria_id,
      nome: r.nome,
      tipo: r.tipo,
      total: Number(r.total),
      quantidade_lancamentos: r.quantidade_lancamentos,
      percentual: somaPorTipo[r.tipo] > 0
        ? Number(((Number(r.total) / somaPorTipo[r.tipo]) * 100).toFixed(2))
        : 0
    }));

    return res.json({
      filtros: { inicio: inicio || null, fim: fim || null, tipo: tipo || null },
      total_entradas: Number(somaPorTipo.entrada.toFixed(2)),
      total_saidas: Number(somaPorTipo.saida.toFixed(2)),
      saldo: Number((somaPorTipo.entrada - somaPorTipo.saida).toFixed(2)),
      dados
    });
  } catch (erro) { return next(erro); }
});

// RF8 — Totais de receitas e despesas agrupados por fonte/destino.
router.get('/fontes-destinos', async (req, res, next) => {
  const { inicio, fim, tipo } = req.query;
  if ((inicio && !dataValida(inicio)) || (fim && !dataValida(fim))) {
    return res.status(400).json({ erro: 'As datas devem estar no formato AAAA-MM-DD.' });
  }
  if (inicio && fim && inicio > fim) return res.status(400).json({ erro: 'A data inicial não pode ser posterior à final.' });
  if (tipo && !['entrada', 'saida'].includes(tipo)) return res.status(400).json({ erro: 'Tipo deve ser entrada ou saida.' });

  try {
    const conditions = ['l.usuario_id = $1'];
    const values = [req.usuarioId];
    if (inicio) { values.push(inicio); conditions.push(`l.data >= $${values.length}`); }
    if (fim) { values.push(fim); conditions.push(`l.data <= $${values.length}`); }
    if (tipo) { values.push(tipo); conditions.push(`l.tipo = $${values.length}`); }

    const result = await pool.query(
      `SELECT f.id AS fonte_destino_id, f.nome, f.tipo AS tipo_fonte_destino,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo='entrada'), 0)::numeric(14,2) AS total_entradas,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo='saida'), 0)::numeric(14,2) AS total_saidas,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo='entrada'), 0)
                - COALESCE(SUM(l.valor) FILTER (WHERE l.tipo='saida'), 0) AS saldo,
              COUNT(l.id)::int AS quantidade_lancamentos
       FROM fontes_destinos f
       LEFT JOIN lancamentos l ON l.fonte_destino_id=f.id AND l.usuario_id=f.usuario_id
         AND ${conditions.slice(1).length ? conditions.slice(1).join(' AND ') : 'TRUE'}
       WHERE f.usuario_id=$1
       GROUP BY f.id, f.nome, f.tipo
       ORDER BY f.nome`,
      values
    );
    return res.json({
      filtros: { inicio: inicio || null, fim: fim || null, tipo: tipo || null },
      dados: result.rows
    });
  } catch (erro) { return next(erro); }
});

// RF9 — Previsão de faturas de cartão de crédito.
// A data de cada lançamento é a data da compra (parcela k = data da compra + k-1 meses).
// Regra de fechamento e datas ficam em models/Fatura.js. 'mes' (AAAA-MM) é o primeiro ciclo
// (mês do fechamento) exibido; cada fatura traz também 'mes_referencia' (mês do vencimento).
router.get('/faturas', async (req, res, next) => {
  const { mes, meses = '6' } = req.query;
  if (mes && !mesValido(mes)) return res.status(400).json({ erro: 'mes deve estar no formato AAAA-MM.' });
  const quantidadeMeses = Number(meses);
  if (!Number.isInteger(quantidadeMeses) || quantidadeMeses < 1 || quantidadeMeses > 12) {
    return res.status(400).json({ erro: 'meses deve ser um número entre 1 e 12.' });
  }

  try {
    const cartoes = await pool.query(
      `SELECT id, nome, dia_fechamento, dia_vencimento, limite
       FROM fontes_destinos
       WHERE usuario_id=$1 AND tipo='cartao_credito'
       ORDER BY nome`,
      [req.usuarioId]
    );

    const agora = new Date();
    const hojeISO = dataLocalISO(agora);
    const mesAtual = { ano: agora.getFullYear(), mes: agora.getMonth() + 1 };
    const inicio = mes ? { ano: Number(mes.slice(0, 4)), mes: Number(mes.slice(5, 7)) } : mesAtual;

    // Busca compras a partir de 2 meses antes do mais antigo entre o início pedido e hoje:
    // cobre faturas pedidas no passado e parcelas ainda não vencidas (limite utilizado).
    const maisAntigo = inicio.ano * 12 + inicio.mes < mesAtual.ano * 12 + mesAtual.mes ? inicio : mesAtual;
    const base = somarMeses(maisAntigo.ano, maisAntigo.mes, -2);
    const dataMinima = `${base.ano}-${String(base.mes).padStart(2, '0')}-01`;

    const lancamentos = await pool.query(
      `SELECT l.id, l.descricao, l.valor, to_char(l.data, 'YYYY-MM-DD') AS data,
              l.parcela_atual, l.total_parcelas, l.fonte_destino_id, c.nome AS categoria_nome
       FROM lancamentos l
       JOIN fontes_destinos f ON f.id=l.fonte_destino_id AND f.usuario_id=l.usuario_id
       JOIN categorias c ON c.id=l.categoria_id AND c.usuario_id=l.usuario_id
       WHERE l.usuario_id=$1 AND f.tipo='cartao_credito' AND l.tipo='saida' AND l.data >= $2
       ORDER BY l.data, l.id`,
      [req.usuarioId, dataMinima]
    );

    // Por cartão: ciclo/vencimento de cada compra e limite utilizado
    // (soma das compras e parcelas cuja fatura ainda não venceu).
    const porCartao = new Map();
    for (const cartao of cartoes.rows) {
      const itens = lancamentos.rows
        .filter(l => l.fonte_destino_id === cartao.id)
        .map(l => {
          const ciclo = cicloDaCompra(l.data, cartao.dia_fechamento);
          return { ...l, valor: Number(l.valor), ciclo, vencimento: datasDoCiclo(ciclo, cartao).vencimento };
        });
      const utilizado = itens.filter(l => l.vencimento >= hojeISO).reduce((soma, l) => soma + l.valor, 0);
      porCartao.set(cartao.id, { itens, utilizado: Number(utilizado.toFixed(2)) });
    }

    const faturas = [];
    for (let i = 0; i < quantidadeMeses; i++) {
      const ciclo = somarMeses(inicio.ano, inicio.mes, i);
      for (const cartao of cartoes.rows) {
        const { itens: todos, utilizado } = porCartao.get(cartao.id);
        const itens = todos
          .filter(l => l.ciclo.ano === ciclo.ano && l.ciclo.mes === ciclo.mes)
          .map(l => ({
            id: l.id,
            descricao: l.descricao,
            categoria: l.categoria_nome,
            valor: l.valor,
            data: l.data,
            parcela: `${l.parcela_atual}/${l.total_parcelas}`
          }));
        const total = itens.reduce((soma, item) => soma + item.valor, 0);
        const datas = datasDoCiclo(ciclo, cartao);
        const limite = Number(cartao.limite);
        faturas.push({
          cartao_id: cartao.id,
          cartao: cartao.nome,
          ciclo: `${ciclo.ano}-${String(ciclo.mes).padStart(2, '0')}`,
          mes_referencia: datas.referencia,
          status: statusDaFatura(ciclo, cartao, hojeISO),
          fechamento: datas.fechamento,
          vencimento: datas.vencimento,
          total: Number(total.toFixed(2)),
          limite,
          limite_utilizado: utilizado,
          limite_disponivel: Number((limite - utilizado).toFixed(2)),
          quantidade_lancamentos: itens.length,
          lancamentos: itens
        });
      }
    }

    return res.json({
      observacao: 'Previsão calculada com base nos lançamentos já cadastrados. Não inclui juros, encargos ou compras futuras ainda não registradas.',
      periodo: { inicio: `${inicio.ano}-${String(inicio.mes).padStart(2, '0')}-01`, meses: quantidadeMeses },
      faturas
    });
  } catch (erro) { return next(erro); }
});

export default router;