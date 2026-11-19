import { useEffect, useState } from 'react';
import { api } from '../../services/api';

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function periodoMesAtual() {
  const d = new Date();
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const ultimoDia = String(new Date(a, d.getMonth() + 1, 0).getDate()).padStart(2, '0');
  return { inicio: `${a}-${m}-01`, fim: `${a}-${m}-${ultimoDia}` };
}

// RF7 — Relatório financeiro por categoria
export default function RelatorioCategorias() {
  const [filtros, setFiltros] = useState({ ...periodoMesAtual(), tipo: '' });
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function carregar(f = filtros) {
    setErro('');
    setCarregando(true);
    try {
      const params = {};
      if (f.inicio) params.inicio = f.inicio;
      if (f.fim) params.fim = f.fim;
      if (f.tipo) params.tipo = f.tipo;
      const { data } = await api.get('/relatorios/categorias', { params });
      setRelatorio(data);
    } catch (e2) {
      setRelatorio(null);
      setErro(e2.response?.data?.erro || 'Erro ao gerar o relatório.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function gerar(e) {
    e.preventDefault();
    carregar();
  }

  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <h2>Relatório por categoria</h2>
          <p className="page-subtitle">Distribuição percentual e volume de lançamentos por categoria.</p>
        </div>
      </div>

      <form onSubmit={gerar} className="card">
        <div className="form-row">
          <label className="field">
            Data inicial
            <input
              type="date"
              value={filtros.inicio}
              onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })}
            />
          </label>
          <label className="field">
            Data final
            <input
              type="date"
              value={filtros.fim}
              onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })}
            />
          </label>
          <label className="field">
            Tipo
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            >
              <option value="">Entradas e saídas</option>
              <option value="entrada">Somente entradas</option>
              <option value="saida">Somente saídas</option>
            </select>
          </label>
          <button type="submit" className="btn" disabled={carregando}>
            {carregando ? 'Gerando...' : 'Atualizar relatório'}
          </button>
        </div>
      </form>

      {erro && <div className="alert alert-error" role="alert">{erro}</div>}

      {carregando && !relatorio && <div className="card empty">Carregando relatório por categoria...</div>}

      {relatorio && (
        <>
          <div className="stats">
            <div className="stat stat-entrada">
              <div className="stat-label">TOTAL DE ENTRADAS</div>
              <div className="stat-value">{moeda(relatorio.total_entradas)}</div>
            </div>
            <div className="stat stat-saida">
              <div className="stat-label">TOTAL DE SAÍDAS</div>
              <div className="stat-value">{moeda(relatorio.total_saidas)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">SALDO DO PERÍODO</div>
              <div
                className="stat-value"
                style={{ color: relatorio.saldo < 0 ? 'var(--red)' : 'var(--ink)' }}
              >
                {moeda(relatorio.saldo)}
              </div>
            </div>
          </div>

          {relatorio.dados.length === 0 ? (
            <div className="card empty">Nenhuma categoria encontrada para este período.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th className="num">Lançamentos</th>
                    <th className="num">Total</th>
                    <th className="num">% do tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.dados.map((linha) => (
                    <tr key={linha.categoria_id}>
                      <td><strong className="table-primary">{linha.nome}</strong></td>
                      <td>
                        <span className={`badge ${linha.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida'}`}>
                          {linha.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="num">{linha.quantidade_lancamentos}</td>
                      <td className="num"><strong>{moeda(linha.total)}</strong></td>
                      <td>
                        <div className="pct">
                          <div className="bar-track">
                            <div
                              className={`bar-fill ${linha.tipo}`}
                              style={{ width: `${Math.min(100, linha.percentual)}%` }}
                            />
                          </div>
                          <span className="pct-text">{Number(linha.percentual).toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
