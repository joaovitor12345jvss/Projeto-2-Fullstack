import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function saudacaoAtual() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function periodoDoMes() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const mm = String(mes).padStart(2, '0');
  return {
    inicio: `${ano}-${mm}-01`,
    fim: `${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}`,
    nome: agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  };
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const periodo = periodoDoMes();

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await api.get('/relatorios/categorias', {
          params: { inicio: periodo.inicio, fim: periodo.fim }
        });
        setRelatorio(data);
      } catch (e) {
        setErro(e.response?.data?.erro || 'Erro ao carregar o resumo.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topSaidas = relatorio
    ? relatorio.dados.filter((d) => d.tipo === 'saida' && d.total > 0).slice(0, 5)
    : [];

  return (
    <div className="page">
      <div className="page-header page-header-flex">
        <div>
          <h1>{saudacaoAtual()}, {usuario?.nome?.split(' ')[0] || 'usuário'}.</h1>
          <p className="page-subtitle">Panorama consolidado das suas finanças em {periodo.nome}.</p>
        </div>
        <div className="header-actions">
          <Link to="/lancamentos" className="btn">+ Novo lançamento</Link>
          <Link to="/relatorios" className="btn btn-secondary">Ver relatórios</Link>
        </div>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}
      {carregando && <div className="card empty">Carregando informações financeiras...</div>}

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

          <div className="section">
            <div className="section-heading">
              <div>
                <h2>Despesas por categoria</h2>
                <p className="page-subtitle">Categorias com maior participação nas saídas do mês.</p>
              </div>
              <Link to="/categorias" className="link-subtle">Gerenciar categorias →</Link>
            </div>

            {topSaidas.length === 0 ? (
              <div className="card empty">Nenhuma despesa registrada neste mês.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th className="num">Lançamentos</th>
                      <th className="num">Valor total</th>
                      <th className="num">Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSaidas.map((c) => (
                      <tr key={c.categoria_id}>
                        <td><strong className="table-primary">{c.nome}</strong></td>
                        <td className="num">{c.quantidade_lancamentos}</td>
                        <td className="num"><strong>{moeda(c.total)}</strong></td>
                        <td>
                          <div className="pct">
                            <div className="bar-track">
                              <div
                                className="bar-fill saida"
                                style={{ width: `${Math.min(100, c.percentual)}%` }}
                              />
                            </div>
                            <span className="pct-text">{Number(c.percentual).toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
