import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const estilos = {
  pagina: { textAlign: 'left', color: '#222' },
  titulo: { color: '#222', fontSize: '2rem', margin: '0 0 0.5rem' },
  sub: { color: '#555', margin: '0 0 1.5rem' },
  resumo: { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' },
  card: { border: '1px solid #ddd', borderRadius: 8, padding: '1rem 1.25rem', minWidth: 180, background: '#fafafa' },
  valor: { fontSize: '1.5rem', fontWeight: 600 },
  subtitulo: { color: '#222', fontSize: '1.2rem', margin: '0 0 0.75rem' },
  tabela: { width: '100%', maxWidth: 520, borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px', borderBottom: '2px solid #ddd', color: '#222' },
  thNum: { textAlign: 'right', padding: '8px', borderBottom: '2px solid #ddd', color: '#222' },
  td: { padding: '8px', borderBottom: '1px solid #eee', color: '#222' },
  tdNum: { padding: '8px', borderBottom: '1px solid #eee', color: '#222', textAlign: 'right' },
  erro: { background: '#fdecea', color: '#b71c1c', padding: '8px 12px', borderRadius: 4, marginBottom: '1rem' }
};

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
    <div style={estilos.pagina}>
      <h1 style={estilos.titulo}>Olá, {usuario?.nome?.split(' ')[0] || 'usuário'}!</h1>
      <p style={estilos.sub}>Resumo de {periodo.nome}</p>

      {erro && <div style={estilos.erro}>{erro}</div>}
      {carregando && <p>Carregando...</p>}

      {relatorio && (
        <>
          <div style={estilos.resumo}>
            <div style={estilos.card}>
              Entradas
              <div style={{ ...estilos.valor, color: '#1b5e20' }}>{moeda(relatorio.total_entradas)}</div>
            </div>
            <div style={estilos.card}>
              Saídas
              <div style={{ ...estilos.valor, color: '#b71c1c' }}>{moeda(relatorio.total_saidas)}</div>
            </div>
            <div style={estilos.card}>
              Saldo
              <div style={{ ...estilos.valor, color: relatorio.saldo < 0 ? '#b71c1c' : '#222' }}>{moeda(relatorio.saldo)}</div>
            </div>
          </div>

          <h2 style={estilos.subtitulo}>Maiores gastos do mês</h2>
          {topSaidas.length === 0 ? (
            <p>Nenhuma saída registrada neste mês.</p>
          ) : (
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={estilos.th}>Categoria</th>
                  <th style={estilos.thNum}>Total</th>
                  <th style={estilos.thNum}>% das saídas</th>
                </tr>
              </thead>
              <tbody>
                {topSaidas.map((c) => (
                  <tr key={c.categoria_id}>
                    <td style={estilos.td}>{c.nome}</td>
                    <td style={estilos.tdNum}>{moeda(c.total)}</td>
                    <td style={estilos.tdNum}>{c.percentual.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
