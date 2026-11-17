import { useState } from 'react';
import { api } from '../../services/api';

const estilos = {
  secao: { textAlign: 'left', color: '#222', marginBottom: '2rem' },
  subtitulo: { color: '#222', fontSize: '1.4rem', margin: '0 0 1rem' },
  caixa: { border: '1px solid #ddd', borderRadius: 8, padding: '1rem', marginBottom: '1rem', background: '#fafafa' },
  linha: { display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' },
  campo: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.9rem' },
  input: { padding: '8px', border: '1px solid #bbb', borderRadius: 4, background: '#fff', color: '#222', fontSize: '1rem' },
  botao: { padding: '8px 16px', border: 'none', borderRadius: 4, background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '1rem' },
  resumo: { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' },
  card: { border: '1px solid #ddd', borderRadius: 8, padding: '0.75rem 1rem', minWidth: 160, background: '#fff' },
  tabela: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px', borderBottom: '2px solid #ddd', color: '#222' },
  thNum: { textAlign: 'right', padding: '8px', borderBottom: '2px solid #ddd', color: '#222' },
  td: { padding: '8px', borderBottom: '1px solid #eee', color: '#222' },
  tdNum: { padding: '8px', borderBottom: '1px solid #eee', color: '#222', textAlign: 'right' },
  erro: { background: '#fdecea', color: '#b71c1c', padding: '8px 12px', borderRadius: 4, marginBottom: '1rem' }
};

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
    <section style={estilos.secao}>
      <h2 style={estilos.subtitulo}>Relatório por categoria</h2>

      <form onSubmit={gerar} style={estilos.caixa}>
        <div style={estilos.linha}>
          <label style={estilos.campo}>
            Data inicial
            <input
              style={estilos.input} type="date" value={filtros.inicio}
              onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })}
            />
          </label>
          <label style={estilos.campo}>
            Data final
            <input
              style={estilos.input} type="date" value={filtros.fim}
              onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })}
            />
          </label>
          <label style={estilos.campo}>
            Tipo
            <select
              style={estilos.input} value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            >
              <option value="">Entradas e saídas</option>
              <option value="entrada">Somente entradas</option>
              <option value="saida">Somente saídas</option>
            </select>
          </label>
          <button type="submit" style={estilos.botao} disabled={carregando}>
            {carregando ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>
      </form>

      {erro && <div style={estilos.erro}>{erro}</div>}

      {relatorio && (
        <>
          <div style={estilos.resumo}>
            <div style={estilos.card}>Entradas<br /><strong style={{ color: '#1b5e20' }}>{moeda(relatorio.total_entradas)}</strong></div>
            <div style={estilos.card}>Saídas<br /><strong style={{ color: '#b71c1c' }}>{moeda(relatorio.total_saidas)}</strong></div>
            <div style={estilos.card}>Saldo<br /><strong>{moeda(relatorio.saldo)}</strong></div>
          </div>

          {relatorio.dados.length === 0 ? (
            <p>Nenhuma categoria encontrada.</p>
          ) : (
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={estilos.th}>Categoria</th>
                  <th style={estilos.th}>Tipo</th>
                  <th style={estilos.thNum}>Lançamentos</th>
                  <th style={estilos.thNum}>Total</th>
                  <th style={estilos.thNum}>% do tipo</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.dados.map((linha) => (
                  <tr key={linha.categoria_id}>
                    <td style={estilos.td}>{linha.nome}</td>
                    <td style={estilos.td}>{linha.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
                    <td style={estilos.tdNum}>{linha.quantidade_lancamentos}</td>
                    <td style={estilos.tdNum}>{moeda(linha.total)}</td>
                    <td style={estilos.tdNum}>{linha.percentual.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
