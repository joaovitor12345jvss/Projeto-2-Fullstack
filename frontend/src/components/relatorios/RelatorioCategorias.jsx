import { useState } from 'react';
import { api } from '../../services/api';

function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// RF7 — Relatório financeiro por categoria
export default function RelatorioCategorias() {
  const [filtros, setFiltros] = useState({ inicio: '', fim: '', tipo: '' });
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function gerar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const params = {};
      if (filtros.inicio) params.inicio = filtros.inicio;
      if (filtros.fim) params.fim = filtros.fim;
      if (filtros.tipo) params.tipo = filtros.tipo;
      const { data } = await api.get('/relatorios/categorias', { params });
      setRelatorio(data);
    } catch (e2) {
      setRelatorio(null);
      setErro(e2.response?.data?.erro || 'Erro ao gerar o relatório.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="section">
      <h2>Relatório por categoria</h2>

      <form onSubmit={gerar} className="card">
        <div className="form-row">
          <label className="field">
            Data inicial
            <input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} />
          </label>
          <label className="field">
            Data final
            <input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} />
          </label>
          <label className="field">
            Tipo
            <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
              <option value="">Entradas e saídas</option>
              <option value="entrada">Somente entradas</option>
              <option value="saida">Somente saídas</option>
            </select>
          </label>
          <button type="submit" className="btn" disabled={carregando}>
            {carregando ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>
      </form>

      {erro && <div className="alert alert-error">{erro}</div>}

      {relatorio && (
        <>
          <div className="stats">
            <div className="stat stat-entrada">
              <div className="stat-label">Entradas</div>
              <div className="stat-value">{moeda(relatorio.total_entradas)}</div>
            </div>
            <div className="stat stat-saida">
              <div className="stat-label">Saídas</div>
              <div className="stat-value">{moeda(relatorio.total_saidas)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Saldo</div>
              <div className="stat-value" style={{ color: relatorio.saldo < 0 ? '#b91c1c' : undefined }}>
                {moeda(relatorio.saldo)}
              </div>
            </div>
          </div>

          {relatorio.dados.length === 0 ? (
            <div className="card empty">Nenhuma categoria encontrada.</div>
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
                      <td>{linha.nome}</td>
                      <td>
                        <span className={`badge ${linha.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida'}`}>
                          {linha.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="num">{linha.quantidade_lancamentos}</td>
                      <td className="num">{moeda(linha.total)}</td>
                      <td>
                        <div className="pct">
                          <div className="bar-track">
                            <div className={`bar-fill ${linha.tipo}`} style={{ width: `${linha.percentual}%` }} />
                          </div>
                          <span className="pct-text">{linha.percentual.toFixed(2)}%</span>
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
