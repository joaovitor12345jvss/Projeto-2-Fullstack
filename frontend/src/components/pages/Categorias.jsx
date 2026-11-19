import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const FORM_VAZIO = { nome: '', tipo: 'saida' };

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get('/categorias');
      setCategorias(data);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar categorias.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const totalEntradas = categorias.filter((c) => c.tipo === 'entrada').length;
  const totalSaidas = categorias.filter((c) => c.tipo === 'saida').length;

  const categoriasFiltradas = categorias.filter((cat) => {
    const bateTipo = !filtroTipo || cat.tipo === filtroTipo;
    const bateBusca = !busca.trim() || cat.nome.toLowerCase().includes(busca.trim().toLowerCase());
    return bateTipo && bateBusca;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Categorias</h1>
        <p className="page-subtitle">Organize suas receitas e despesas para acompanhar exatamente para onde vai cada centavo.</p>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">TOTAL CADASTRADO</div>
          <div className="stat-value">{categorias.length}</div>
        </div>
        <div className="stat stat-entrada">
          <div className="stat-label">CATEGORIAS DE ENTRADA</div>
          <div className="stat-value">{totalEntradas}</div>
        </div>
        <div className="stat stat-saida">
          <div className="stat-label">CATEGORIAS DE SAÍDA</div>
          <div className="stat-value">{totalSaidas}</div>
        </div>
      </div>

      {erro && <div className="alert alert-error" role="alert">{erro}</div>}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}

      <form onSubmit={salvar} className="card">
        <div className="card-heading-row">
          <p className="card-title">{editandoId ? 'Editar categoria' : 'Nova categoria'}</p>
          {editandoId && <span className="badge badge-cartao">Editando registro</span>}
        </div>
        <div className="form-row">
          <label className="field" style={{ flex: '2 1 260px' }}>
            Nome da categoria
            <input
              value={form.nome}
              maxLength={60}
              required
              placeholder="Ex.: Alimentação, Assinaturas, Freelance..."
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </label>
          <label className="field" style={{ flex: '1 1 200px' }}>
            Tipo de movimentação
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="saida">Saída (despesa)</option>
              <option value="entrada">Entrada (receita)</option>
            </select>
          </label>
          <div className="form-inline-actions">
            <button type="submit" className="btn">
              {editandoId ? 'Salvar alterações' : '+ Adicionar categoria'}
            </button>
            {editandoId && (
              <button type="button" className="btn btn-secondary" onClick={limparForm}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="section-heading">
        <div>
          <h2>Categorias cadastradas</h2>
          <p className="page-subtitle">
            Exibindo {categoriasFiltradas.length} de {categorias.length} categorias
          </p>
        </div>

        <div className="toolbar-controls">
          <div className="segmented-control" role="group" aria-label="Filtrar por tipo">
            <button
              type="button"
              className={`seg-btn ${filtroTipo === '' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('')}
            >
              Todas ({categorias.length})
            </button>
            <button
              type="button"
              className={`seg-btn ${filtroTipo === 'entrada' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('entrada')}
            >
              Entradas ({totalEntradas})
            </button>
            <button
              type="button"
              className={`seg-btn ${filtroTipo === 'saida' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('saida')}
            >
              Saídas ({totalSaidas})
            </button>
          </div>

          <input
            type="search"
            className="search-input"
            placeholder="Buscar categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {carregando ? (
        <div className="card empty">Carregando categorias...</div>
      ) : categoriasFiltradas.length === 0 ? (
        <div className="card empty">Nenhuma categoria encontrada para o filtro atual.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome da categoria</th>
                <th>Tipo</th>
                <th className="num">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categoriasFiltradas.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <strong className="table-primary">{cat.nome}</strong>
                  </td>
                  <td>
                    <span className={`badge ${cat.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida'}`}>
                      {cat.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="num">
                    <div className="actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => editar(cat)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => excluir(cat)}>
                        Excluir
                      </button>
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
