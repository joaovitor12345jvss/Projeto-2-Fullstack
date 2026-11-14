import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

function dataValida(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
    && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`))
    && new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;
}

function mesValido(valor) {
  return typeof valor === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

function dataISO(ano, mes, dia) {
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`;
}

function mesSeguinte(ano, mes, incremento = 1) {
  const d = new Date(Date.UTC(ano, mes - 1 + incremento, 1));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

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

// RF9 — Previsão de faturas. A data do lançamento representa a data da compra/parcela.
// Compras após o fechamento entram no ciclo do mês seguinte; vencimento é no mês do
// ciclo, exceto quando o dia de vencimento é igual/anterior ao fechamento.
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
    const inicio = mes
      ? { ano: Number(mes.slice(0, 4)), mes: Number(mes.slice(5, 7)) }
      : { ano: agora.getFullYear(), mes: agora.getMonth() + 1 };

    const fim = mesSeguinte(inicio.ano, inicio.mes, quantidadeMeses);
    const dataInicio = `${inicio.ano}-${String(inicio.mes).padStart(2, '0')}-01`;
    const dataFim = `${fim.ano}-${String(fim.mes).padStart(2, '0')}-01`;

    const lancamentos = await pool.query(
      `SELECT l.id, l.descricao, l.valor, l.data, l.parcela_atual, l.total_parcelas,
              l.grupo_parcelamento, l.fonte_destino_id, c.nome AS categoria_nome
       FROM lancamentos l
       JOIN fontes_destinos f ON f.id=l.fonte_destino_id AND f.usuario_id=l.usuario_id
       JOIN categorias c ON c.id=l.categoria_id AND c.usuario_id=l.usuario_id
       WHERE l.usuario_id=$1 AND f.tipo='cartao_credito' AND l.tipo='saida'
         AND l.data >= $2::date - INTERVAL '2 months'
         AND l.data < $3::date + INTERVAL '2 months'
       ORDER BY l.data, l.id`,
      [req.usuarioId, dataInicio, dataFim]
    );

    const faturas = [];
    for (let i = 0; i < quantidadeMeses; i++) {
      const ciclo = mesSeguinte(inicio.ano, inicio.mes, i);
      for (const cartao of cartoes.rows) {
        const itens = lancamentos.rows.filter(l => {
          if (l.fonte_destino_id !== cartao.id) return false;
          const [anoCompra, mesCompra, diaCompra] = l.data.toISOString
            ? l.data.toISOString().slice(0, 10).split('-').map(Number)
            : String(l.data).slice(0, 10).split('-').map(Number);
          const cicloCompra = diaCompra > cartao.dia_fechamento
            ? mesSeguinte(anoCompra, mesCompra)
            : { ano: anoCompra, mes: mesCompra };
          return cicloCompra.ano === ciclo.ano && cicloCompra.mes === ciclo.mes;
        }).map(l => ({
          id: l.id,
          descricao: l.descricao,
          categoria: l.categoria_nome,
          valor: Number(l.valor),
          data: String(l.data).slice(0, 10),
          parcela: `${l.parcela_atual}/${l.total_parcelas}`
        }));

        const total = itens.reduce((soma, item) => soma + item.valor, 0);
        const vencimentoCiclo = cartao.dia_vencimento <= cartao.dia_fechamento
          ? mesSeguinte(ciclo.ano, ciclo.mes)
          : ciclo;
        faturas.push({
          cartao_id: cartao.id,
          cartao: cartao.nome,
          mes_referencia: `${ciclo.ano}-${String(ciclo.mes).padStart(2, '0')}`,
          fechamento: dataISO(ciclo.ano, ciclo.mes, cartao.dia_fechamento),
          vencimento: dataISO(vencimentoCiclo.ano, vencimentoCiclo.mes, cartao.dia_vencimento),
          total: Number(total.toFixed(2)),
          limite: Number(cartao.limite),
          limite_disponivel_estimado: Number((Number(cartao.limite) - total).toFixed(2)),
          quantidade_lancamentos: itens.length,
          lancamentos: itens
        });
      }
    }

    return res.json({
      observacao: 'Previsão calculada com base nos lançamentos já cadastrados. Não inclui juros, encargos ou compras futuras ainda não registradas.',
      periodo: { inicio: dataInicio, meses: quantidadeMeses },
      faturas
    });
  } catch (erro) { return next(erro); }
});

export default router;
