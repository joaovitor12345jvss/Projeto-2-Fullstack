import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const TIPOS = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };
const box = { border: '1px solid #ddd', borderRadius: 8, padding: 16, margin: '12px 0', background: '#fff' };
const input = { padding: 8, border: '1px solid #bbb', borderRadius: 4, color: '#222', background: '#fff' };
const button = { padding: '9px 14px', border: 0, borderRadius: 5, background: '#2563eb', color: '#fff', cursor: 'pointer' };

function periodoMesAtual() {
  const d = new Date();
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return { inicio: `${a}-${m}-01`, fim: `${a}-${m}-${String(new Date(a, d.getMonth() + 1, 0).getDate()).padStart(2, '0')}` };
}

// Barra horizontal simples; a largura é proporcional ao maior valor individual do relatório.
function Barra({ valor, maximo, cor, rotulo }) {
  const pct = maximo > 0 ? (Number(valor) / maximo) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '3px 0' }}>
      <span style={{ width: 62, fontSize: '0.8rem', color: '#555' }}>{rotulo}</span>
      <div style={{ flex: 1, height: 14, background: '#f1f1f1', borderRadius: 7, overflow: 'hidden' }}>
        <div title={`${rotulo}: ${money(valor)}`} style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 7 }} />
      </div>
      <span style={{ width: 110, textAlign: 'right', fontSize: '0.85rem' }}>{money(valor)}</span>
    </div>
  );
}

// RF8 — Relatório por fonte/destino
export default function RelatorioFontesDestinos() {
  const [filtros, setFiltros] = useState({ ...periodoMesAtual(), tipo: '' });
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function carregar(f = filtros) {
    setErro('');
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
      const { data } = await api.get('/relatorios/fontes-destinos', { params });
      setRelatorio(data);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Não foi possível gerar o relatório.');
      setRelatorio(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function gerar(e) {
    e.preventDefault();
    carregar();
  }

  const dados = relatorio?.dados || [];
  const totalEntradas = dados.reduce((s, x) => s + Number(x.total_entradas || 0), 0);
  const totalSaidas = dados.reduce((s, x) => s + Number(x.total_saidas || 0), 0);
  const maximo = Math.max(0, ...dados.flatMap((x) => [Number(x.total_entradas), Number(x.total_saidas)]));
  const comMovimento = dados.filter((x) => Number(x.quantidade_lancamentos) > 0);
  const contas = dados.filter((x) => x.tipo_fonte_destino === 'conta');

  return (
    <section style={{ color: '#222', marginTop: 32 }}>
      <h2>Relatório por fonte/destino</h2>

      <form onSubmit={gerar} style={{ ...box, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label>Data inicial<br />
          <input style={input} type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} />
        </label>
        <label>Data final<br />
          <input style={input} type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} />
        </label>
        <label>Tipo de lançamento<br />
          <select style={input} value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </label>
        <button style={button} disabled={loading}>{loading ? 'Gerando...' : 'Gerar relatório'}</button>
      </form>

      {erro && <p role="alert" style={{ color: '#b91c1c' }}>{erro}</p>}
      {loading && !relatorio && <p>Carregando...</p>}

      {relatorio && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={box}>Total de entradas<br /><strong style={{ color: '#15803d' }}>{money(totalEntradas)}</strong></div>
            <div style={box}>Total de saídas<br /><strong style={{ color: '#b91c1c' }}>{money(totalSaidas)}</strong></div>
            <div style={box}>Saldo do período<br /><strong style={{ color: totalEntradas - totalSaidas < 0 ? '#b91c1c' : '#222' }}>{money(totalEntradas - totalSaidas)}</strong></div>
          </div>

          {dados.length === 0 ? <p>Nenhuma fonte ou destino cadastrado.</p> : (
            <>
              {contas.length > 0 && (
                <div style={box}>
                  <h3 style={{ marginTop: 0 }}>Saldo das contas no período</h3>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {contas.map((c) => (
                      <div key={c.fonte_destino_id} style={{ ...box, margin: 0, minWidth: 180 }}>
                        {c.nome}<br />
                        <strong style={{ color: Number(c.saldo) < 0 ? '#b91c1c' : '#15803d' }}>{money(c.saldo)}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#555' }}>entradas − saídas</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={box}>
                <h3 style={{ marginTop: 0 }}>Entradas e saídas por fonte/destino</h3>
                {comMovimento.length === 0 ? <p>Nenhuma movimentação no período.</p> : comMovimento.map((item) => (
                  <div key={item.fonte_destino_id} style={{ margin: '16px 0' }}>
                    <strong>{item.nome}</strong> <small style={{ color: '#555' }}>({TIPOS[item.tipo_fonte_destino] || item.tipo_fonte_destino})</small>
                    <Barra rotulo="Entradas" valor={item.total_entradas} maximo={maximo} cor="#16a34a" />
                    <Barra rotulo="Saídas" valor={item.total_saidas} maximo={maximo} cor="#dc2626" />
                  </div>
                ))}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Fonte/destino', 'Tipo', 'Entradas', 'Saídas', 'Saldo (contas)', 'Lançamentos'].map((t) => (
                      <th key={t} style={{ textAlign: 'left', padding: 9, borderBottom: '2px solid #ddd' }}>{t}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {dados.map((x) => (
                      <tr key={x.fonte_destino_id}>
                        {[
                          x.nome,
                          TIPOS[x.tipo_fonte_destino] || x.tipo_fonte_destino,
                          money(x.total_entradas),
                          money(x.total_saidas),
                          x.tipo_fonte_destino === 'conta' ? money(x.saldo) : '—',
                          x.quantidade_lancamentos
                        ].map((v, i) => <td key={i} style={{ padding: 9, borderBottom: '1px solid #eee' }}>{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
