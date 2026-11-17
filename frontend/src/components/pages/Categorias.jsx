import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const FORM_VAZIO = { nome: '', tipo: 'saida' };

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

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const params = filtroTipo ? { tipo: filtroTipo } : {};
      const { data } = await api.get('/categorias', { params });
      setCategorias(data);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar categorias.');
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
    try {
      if (editandoId) {
        await api.put(`/categorias/${editandoId}`, form);
        setSucesso('Categoria atualizada com sucesso.');
      } else {
        await api.post('/categorias', form);
        setSucesso('Categoria criada com sucesso.');
      }
      limparForm();
      await carregar();
    } catch (e2) {
      setErro(e2.response?.data?.erro || 'Erro ao salvar categoria.');
    }
  }

  function editar(cat) {
    setErro('');
    setSucesso('');
    setEditandoId(cat.id);
    setForm({ nome: cat.nome, tipo: cat.tipo });
  }

  async function excluir(cat) {
    if (!window.confirm(`Excluir a categoria "${cat.nome}"?`)) return;
    setErro('');
    setSucesso('');
    try {
      await api.delete(`/categorias/${cat.id}`);
      setSucesso('Categoria excluída com sucesso.');
      if (editandoId === cat.id) limparForm();
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao excluir categoria.');
    }
  }

  return (
    <div style={estilos.pagina}>
      <h1 style={estilos.titulo}>Categorias</h1>

      {erro && <div style={estilos.erro}>{erro}</div>}
      {sucesso && <div style={estilos.ok}>{sucesso}</div>}

      <form onSubmit={salvar} style={estilos.caixa}>
        <strong>{editandoId ? 'Editar categoria' : 'Nova categoria'}</strong>
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
              <option value="saida">Saída (despesa)</option>
              <option value="entrada">Entrada (receita)</option>
            </select>
          </label>
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
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </label>

      {carregando ? (
        <p>Carregando...</p>
      ) : categorias.length === 0 ? (
        <p>Nenhuma categoria encontrada.</p>
      ) : (
        <table style={estilos.tabela}>
          <thead>
            <tr>
              <th style={estilos.th}>Nome</th>
              <th style={estilos.th}>Tipo</th>
              <th style={estilos.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((cat) => (
              <tr key={cat.id}>
                <td style={estilos.td}>{cat.nome}</td>
                <td style={estilos.td}>{cat.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
                <td style={estilos.td}>
                  <button style={estilos.botaoPeq} onClick={() => editar(cat)}>Editar</button>
                  <button style={estilos.botaoPerigo} onClick={() => excluir(cat)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
