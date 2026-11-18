// Regras puras de fatura de cartão de crédito (RF9). Não acessam o banco.
// Datas sempre como texto 'AAAA-MM-DD' e meses de 1 a 12, para evitar problemas de fuso horário.

const pad = (n) => String(n).padStart(2, '0');

export function ultimoDiaDoMes(ano, mes) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function somarMeses(ano, mes, quantidade = 1) {
  const d = new Date(Date.UTC(ano, mes - 1 + quantidade, 1));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

// Monta 'AAAA-MM-DD' ajustando dias inexistentes (ex.: dia 31 em fevereiro) para o último dia do mês.
export function dataISO(ano, mes, dia) {
  return `${ano}-${pad(mes)}-${pad(Math.min(dia, ultimoDiaDoMes(ano, mes)))}`;
}

export function dataLocalISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Ciclo (mês de fechamento) em que a compra cai.
// Antes do dia de fechamento: fatura que fecha neste mês. No dia do fechamento ou depois: mês seguinte.
export function cicloDaCompra(dataCompra, diaFechamento) {
  const [ano, mes, dia] = dataCompra.slice(0, 10).split('-').map(Number);
  const fechamentoDoMes = Math.min(diaFechamento, ultimoDiaDoMes(ano, mes));
  return dia < fechamentoDoMes ? { ano, mes } : somarMeses(ano, mes, 1);
}

// Datas de fechamento e vencimento de um ciclo. 'referencia' é o mês do vencimento (AAAA-MM).
export function datasDoCiclo(ciclo, cartao) {
  const fechamento = dataISO(ciclo.ano, ciclo.mes, cartao.dia_fechamento);
  const mesVenc = cartao.dia_vencimento > cartao.dia_fechamento
    ? ciclo
    : somarMeses(ciclo.ano, ciclo.mes, 1);
  const vencimento = dataISO(mesVenc.ano, mesVenc.mes, cartao.dia_vencimento);
  return { fechamento, vencimento, referencia: vencimento.slice(0, 7) };
}

// 'futura' (ainda nem começou), 'aberta' (recebendo compras) ou 'fechada' (já fechou).
export function statusDaFatura(ciclo, cartao, hojeISO) {
  const { fechamento } = datasDoCiclo(ciclo, cartao);
  const { fechamento: fechamentoAnterior } = datasDoCiclo(somarMeses(ciclo.ano, ciclo.mes, -1), cartao);
  if (hojeISO >= fechamento) return 'fechada';
  if (hojeISO >= fechamentoAnterior) return 'aberta';
  return 'futura';
}
