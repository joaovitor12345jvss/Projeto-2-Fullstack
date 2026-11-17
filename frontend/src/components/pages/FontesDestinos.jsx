import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const FORM_VAZIO = { nome: '', tipo: 'conta', dia_fechamento: '', dia_vencimento: '', limite: '' };

const NOMES_TIPO = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };

const estilos = {
  pagina: { textAlign: 'left', color: '#222' },
  titulo: { color: '#222', fontSize: '2rem', margin: '0 0 1.5rem' },
  caixa: { border: '1px solid #ddd', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', background: '#fafafa' },
  linha: { display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' },
  campo: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.9rem' },
  input: { padding: '8px', border: '1px solid #bbb', borderRadius: 4, background: '#fff', color: '#222', fontSize: '1rem' },
  botao: { padding: '8px 16px', border: 'none', borderRadius: 4, background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '1rem' },
  botaoSec: { padding: '8px 16px', border: '1px solid #bbb', borderRadius: 4, background: '#fff', color: '#222', cursor: 'pointer', fontSize: '1rem' },
  botaoPerigo: { padding: '4px 10px', border: 'none', borderRadius: 4, background: '#d32f2f', color: '#fff', cursor: 'pointer' },
  botaoPeq: { padding: '4px 10px', border: '1px solid #bbb', borderRadius: 4, background: '#fff', color: '#222', cursor: 'pointer', marginRight: 6 },
  tabela: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px', borderBottom: '2px solid #ddd', color: '#222' },
  td: { padding: '8px', borderBottom: '1px solid #eee', color: '#222' },
  erro: { background: '#fdecea', color: '#b71c1c', padding: '8px 12px', borderRadius: 4, marginBottom: '1rem' },
  ok: { background: '#e8f5e9', color: '#1b5e20', padding: '8px 12px', borderRadius: 4, marginBottom: '1rem' }
};

function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FontesDestinos() {
  const [itens, setItens] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(true);

  const ehCartao = form.tipo === 'cartao_credito';

  async function carregar() {
    try {
      const params = filtroTipo ? { tipo: filtroTipo } : {};
      const { data } = await api.get('/fontes-destinos', { params });
      setItens(data);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar fontes e destinos.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTipo]);

  function limparForm() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');

    const payload = { nome: form.nome, tipo: form.tipo };
    if (ehCartao) {
      payload.dia_fechamento = Number(form.dia_fechamento);
      payload.dia_vencimento = Number(form.dia_vencimento);
      payload.limite = Number(form.limite);
    }

    try {
      if (editandoId) {
        await api.put(`/fontes-destinos/${editandoId}`, payload);
        setSucesso('Fonte/destino atualizada com sucesso.');
      } else {
        await api.post('/fontes-destinos', payload);
        setSucesso('Fonte/destino criada com sucesso.');
      }
      limparForm();
      await carregar();
    } catch (e2) {
      setErro(e2.response?.data?.erro || 'Erro ao salvar fonte/destino.');
    }
  }

  function editar(item) {
    setErro('');
    setSucesso('');
    setEditandoId(item.id);
    setForm({
      nome: item.nome,
      tipo: item.tipo,
      dia_fechamento: item.dia_fechamento ?? '',
      dia_vencimento: item.dia_vencimento ?? '',
      limite: item.limite ?? ''
    });
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir "${item.nome}"?`)) return;
    setErro('');
    setSucesso('');
    try {
      await api.delete(`/fontes-destinos/${item.id}`);
      setSucesso('Fonte/destino excluída com sucesso.');
      if (editandoId === item.id) limparForm();
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao excluir fonte/destino.');
    }
  }

  return (
    <div style={estilos.pagina}>
      <h1 style={estilos.titulo}>Fontes e Destinos</h1>

      {erro && <div style={estilos.erro}>{erro}</div>}
      {sucesso && <div style={estilos.ok}>{sucesso}</div>}

      <form onSubmit={salvar} style={estilos.caixa}>
        <strong>{editandoId ? 'Editar fonte/destino' : 'Nova fonte/destino'}</strong>
        <div style={{ ...estilos.linha, marginTop: '0.75rem' }}>
          <label style={estilos.campo}>
            Nome
            <input
              style={estilos.input}
              value={form.nome}
              maxLength={60}
              required
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </label>
          <label style={estilos.campo}>
            Tipo
            <select
              style={estilos.input}
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="conta">Conta</option>
              <option value="renda">Renda</option>
              <option value="cartao_credito">Cartão de crédito</option>
            </select>
          </label>

          {ehCartao && (
            <>
              <label style={estilos.campo}>
                Dia de fechamento
                <input
                  style={{ ...estilos.input, width: 120 }}
                  type="number" min="1" max="31" required
                  value={form.dia_fechamento}
                  onChange={(e) => setForm({ ...form, dia_fechamento: e.target.value })}
                />
              </label>
              <label style={estilos.campo}>
                Dia de vencimento
                <input
                  style={{ ...estilos.input, width: 120 }}
                  type="number" min="1" max="31" required
                  value={form.dia_vencimento}
                  onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
                />
              </label>
              <label style={estilos.campo}>
                Limite (R$)
                <input
                  style={{ ...estilos.input, width: 140 }}
                  type="number" min="0" step="0.01" required
                  value={form.limite}
                  onChange={(e) => setForm({ ...form, limite: e.target.value })}
                />
              </label>
            </>
          )}

          <button type="submit" style={estilos.botao}>{editandoId ? 'Salvar' : 'Adicionar'}</button>
          {editandoId && (
            <button type="button" style={estilos.botaoSec} onClick={limparForm}>Cancelar</button>
          )}
        </div>
      </form>

      <label style={{ ...estilos.campo, marginBottom: '1rem', maxWidth: 220 }}>
        Filtrar por tipo
        <select style={estilos.input} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos</option>
          <option value="conta">Conta</option>
          <option value="renda">Renda</option>
          <option value="cartao_credito">Cartão de crédito</option>
        </select>
      </label>

      {carregando ? (
        <p>Carregando...</p>
      ) : itens.length === 0 ? (
        <p>Nenhuma fonte ou destino encontrado.</p>
      ) : (
        <table style={estilos.tabela}>
          <thead>
            <tr>
              <th style={estilos.th}>Nome</th>
              <th style={estilos.th}>Tipo</th>
              <th style={estilos.th}>Fechamento</th>
              <th style={estilos.th}>Vencimento</th>
              <th style={estilos.th}>Limite</th>
              <th style={estilos.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <td style={estilos.td}>{item.nome}</td>
                <td style={estilos.td}>{NOMES_TIPO[item.tipo]}</td>
                <td style={estilos.td}>{item.dia_fechamento ? `dia ${item.dia_fechamento}` : '—'}</td>
                <td style={estilos.td}>{item.dia_vencimento ? `dia ${item.dia_vencimento}` : '—'}</td>
                <td style={estilos.td}>{item.limite !== null && item.limite !== undefined ? moeda(item.limite) : '—'}</td>
                <td style={estilos.td}>
                  <button style={estilos.botaoPeq} onClick={() => editar(item)}>Editar</button>
                  <button style={estilos.botaoPerigo} onClick={() => excluir(item)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
