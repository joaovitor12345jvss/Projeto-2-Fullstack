import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
      <div className="page-header">
        <h1>Olá, {usuario?.nome?.split(' ')[0] || 'usuário'}! 👋</h1>
        <p className="page-subtitle">Resumo de {periodo.nome}</p>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}
      {carregando && <p className="empty">Carregando...</p>}

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
              <div className="stat-label">Saldo do mês</div>
              <div className="stat-value" style={{ color: relatorio.saldo < 0 ? '#b91c1c' : undefined }}>
                {moeda(relatorio.saldo)}
              </div>
            </div>
          </div>

          <h2>Maiores gastos do mês</h2>
          {topSaidas.length === 0 ? (
            <div className="card empty">Nenhuma saída registrada neste mês.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th className="num">Total</th>
                    <th className="num">% das saídas</th>
                  </tr>
                </thead>
                <tbody>
                  {topSaidas.map((c) => (
                    <tr key={c.categoria_id}>
                      <td>{c.nome}</td>
                      <td className="num">{moeda(c.total)}</td>
                      <td>
                        <div className="pct">
                          <div className="bar-track"><div className="bar-fill saida" style={{ width: `${c.percentual}%` }} /></div>
                          <span className="pct-text">{c.percentual.toFixed(2)}%</span>
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
    </div>
  );
}
