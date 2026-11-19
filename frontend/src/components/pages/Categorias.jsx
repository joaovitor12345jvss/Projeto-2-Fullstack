import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const FORM_VAZIO = { nome: '', tipo: 'saida' };

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
    <div className="page">
      <div className="page-header">
        <h1>Categorias</h1>
        <p className="page-subtitle">Organize suas entradas e saídas por categoria.</p>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}

      <form onSubmit={salvar} className="card">
        <p className="card-title">{editandoId ? 'Editar categoria' : 'Nova categoria'}</p>
        <div className="form-row">
          <label className="field" style={{ flex: '1 1 240px' }}>
            Nome
            <input
              value={form.nome}
              maxLength={60}
              required
              placeholder="Ex.: Alimentação"
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </label>
          <label className="field">
            Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="saida">Saída (despesa)</option>
              <option value="entrada">Entrada (receita)</option>
            </select>
          </label>
          <button type="submit" className="btn">{editandoId ? 'Salvar alterações' : '+ Adicionar'}</button>
          {editandoId && (
            <button type="button" className="btn btn-secondary" onClick={limparForm}>Cancelar</button>
          )}
        </div>
      </form>

      <div className="form-row" style={{ marginBottom: '1rem' }}>
        <label className="field">
          Filtrar por tipo
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </label>
      </div>

      {carregando ? (
        <p className="empty">Carregando...</p>
      ) : categorias.length === 0 ? (
        <div className="card empty">Nenhuma categoria encontrada.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th className="num">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.nome}</td>
                  <td>
                    <span className={`badge ${cat.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida'}`}>
                      {cat.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => editar(cat)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => excluir(cat)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
