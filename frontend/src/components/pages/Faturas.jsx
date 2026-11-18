import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso) => String(iso || '').slice(0, 10).split('-').reverse().join('/');
const mesBR = (ref) => { const [a, m] = String(ref).split('-'); return `${m}/${a}`; };
const mesAtualLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const campo = { padding: 8, border: '1px solid #bbb', borderRadius: 4, background: '#fff', color: '#222' };
const STATUS = {
  aberta: { texto: 'Aberta', cor: '#1d4ed8', fundo: '#dbeafe' },
  fechada: { texto: 'Fechada', cor: '#92400e', fundo: '#fef3c7' },
  futura: { texto: 'Prevista', cor: '#374151', fundo: '#e5e7eb' }
};

export default function Faturas() {
  const [mes, setMes] = useState(mesAtualLocal());
  const [meses, setMeses] = useState(6);
  const [faturas, setFaturas] = useState([]);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function carregar() {
    setLoading(true);
    setErro('');
    try {
      const { data } = await api.get('/relatorios/faturas', { params: { mes, meses } });
      setFaturas(data.faturas || []);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao consultar faturas.');
      setFaturas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  return (
    <div style={{ color: '#222', textAlign: 'left' }}>
      <h1>Faturas de cartões</h1>
      <p>
        Previsão calculada a partir das compras e parcelas já registradas. Cada fatura é identificada
        pelo mês do vencimento. Não inclui juros, encargos nem compras ainda não cadastradas.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', margin: '18px 0' }}>
        <label>Primeiro mês de fechamento<br />
          <input style={campo} type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </label>
        <label>Quantidade de meses<br />
          <select style={campo} value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
            {[3, 6, 9, 12].map((n) => <option key={n} value={n}>{n} meses</option>)}
          </select>
        </label>
        <button onClick={carregar} disabled={loading || !mes}>{loading ? 'Consultando...' : 'Consultar faturas'}</button>
      </div>

      {erro && <p role="alert" style={{ color: '#b91c1c' }}>{erro}</p>}

      {loading ? <p>Carregando...</p> : faturas.length === 0 ? (
        <p>Nenhum cartão de crédito cadastrado ou nenhuma fatura encontrada para o período.</p>
      ) : faturas.map((f) => {
        const st = STATUS[f.status] || STATUS.futura;
        const usoPct = f.limite > 0 ? Math.min(100, (f.limite_utilizado / f.limite) * 100) : 0;
        return (
          <section key={`${f.cartao_id}-${f.ciclo}`} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '0 0 8px' }}>
              {f.cartao} — fatura {mesBR(f.mes_referencia)}
              <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 12, background: st.fundo, color: st.cor }}>{st.texto}</span>
            </h2>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <p>Fechamento: <strong>{dataBR(f.fechamento)}</strong></p>
              <p>Vencimento: <strong>{dataBR(f.vencimento)}</strong></p>
              <p>Valor da fatura: <strong>{money(f.total)}</strong></p>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <p>Limite do cartão: <strong>{money(f.limite)}</strong></p>
              <p>Limite utilizado: <strong>{money(f.limite_utilizado)}</strong></p>
              <p>Limite disponível: <strong>{money(f.limite_disponivel)}</strong></p>
            </div>
            <div title={`${usoPct.toFixed(0)}% do limite utilizado`} style={{ height: 8, background: '#eee', borderRadius: 6, overflow: 'hidden', margin: '0 0 12px' }}>
              <div style={{ width: `${usoPct}%`, height: '100%', background: usoPct > 80 ? '#dc2626' : '#2563eb' }} />
            </div>

            {f.lancamentos?.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Compra', 'Categoria', 'Data', 'Parcela', 'Valor'].map((t) => (
                      <th key={t} style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #ddd' }}>{t}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {f.lancamentos.map((l) => (
                      <tr key={l.id}>
                        {[l.descricao, l.categoria, dataBR(l.data), l.parcela, money(l.valor)].map((v, j) => (
                          <td key={j} style={{ padding: 8, borderBottom: '1px solid #eee' }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p>Sem compras previstas nesta fatura.</p>}
          </section>
        );
      })}
    </div>
  );
}
