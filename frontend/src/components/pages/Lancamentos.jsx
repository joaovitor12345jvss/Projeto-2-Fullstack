import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const pad = (n) => String(n).padStart(2, '0');
const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dataBR = (iso) => String(iso || '').slice(0, 10).split('-').reverse().join('/');
const filtroInicial = () => {
  const d = new Date();
  const a = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  return {
    inicio: `${a}-${m}-01`,
    fim: `${a}-${m}-${pad(new Date(a, d.getMonth() + 1, 0).getDate())}`,
    tipo: '',
    categoriaId: '',
    fonteDestinoId: ''
  };
};

const VAZIO = {
  tipo: 'saida',
  descricao: '',
  valor: '',
  data: hojeLocal(),
  categoria_id: '',
  fonte_destino_id: '',
  total_parcelas: 1
};

const ROTULOS_FONTE = {
  conta: 'Conta',
  renda: 'Renda',
  cartao_credito: 'Cartão de crédito'
};

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Lancamentos() {
  const [lista, setLista] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [fontes, setFontes] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [editId, setEditId] = useState(null);
  const [filtro, setFiltro] = useState(filtroInicial);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 0 });
  const [totais, setTotais] = useState({ total_entradas: 0, total_saidas: 0, saldo: 0 });
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function carregar() {
    setLoading(true);
    setErro('');
    try {
      const params = {
        pagina,
        porPagina: 10,
        ...Object.fromEntries(Object.entries(filtro).filter(([, v]) => v))
      };
      const { data } = await api.get('/lancamentos', { params });
      setLista(data.dados || []);
      setPaginacao(data.paginacao || {});
      setTotais(data.totais || { total_entradas: 0, total_saidas: 0, saldo: 0 });
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar lançamentos.');
    } finally {
      setLoading(false);
    }
  }

  async function carregarOpcoes() {
    try {
      const [c, f] = await Promise.all([api.get('/categorias'), api.get('/fontes-destinos')]);
      setCategorias(c.data);
      setFontes(f.data);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar categorias e fontes.');
    }
  }

  useEffect(() => {
    carregarOpcoes();
  }, []);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, filtro]);

  const fonteSelecionada = fontes.find((f) => String(f.id) === String(form.fonte_destino_id));
  const permiteParcelamento = !editId && form.tipo === 'saida' && fonteSelecionada?.tipo === 'cartao_credito';

  function mudarTipo(tipo) {
    setForm({ ...form, tipo, categoria_id: '', total_parcelas: 1 });
  }

  function mudarFonte(fonteId) {
    const f = fontes.find((item) => String(item.id) === String(fonteId));
    setForm({
      ...form,
      fonte_destino_id: fonteId,
      total_parcelas: f?.tipo === 'cartao_credito' ? form.total_parcelas : 1
    });
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setMsg('');
    const payload = {
      ...form,
      valor: Number(form.valor),
      categoria_id: Number(form.categoria_id),
      fonte_destino_id: Number(form.fonte_destino_id),
      total_parcelas: permiteParcelamento ? Number(form.total_parcelas) : 1
    };
    try {
      if (editId) {
        await api.put(`/lancamentos/${editId}`, payload);
        setMsg('Lançamento atualizado com sucesso.');
      } else {
        await api.post('/lancamentos', payload);
        setMsg('Lançamento cadastrado com sucesso.');
      }
      setForm(VAZIO);
      setEditId(null);
      await carregar();
    } catch (e2) {
      setErro(e2.response?.data?.erro || 'Erro ao salvar lançamento.');
    }
  }

  function editar(l) {
    setEditId(l.id);
    setForm({
      tipo: l.tipo,
      descricao: l.descricao,
      valor: l.valor,
      data: String(l.data).slice(0, 10),
      categoria_id: String(l.categoria_id),
      fonte_destino_id: String(l.fonte_destino_id),
      total_parcelas: 1
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function excluir(l) {
    const todas =
      l.grupo_parcelamento &&
      window.confirm('Este lançamento faz parte de uma compra parcelada. Excluir todas as parcelas?');
    if (!todas && !window.confirm('Excluir somente este lançamento?')) return;
    try {
      await api.delete(`/lancamentos/${l.id}`, { params: todas ? { todasParcelas: 'true' } : {} });
      setMsg('Lançamento excluído com sucesso.');
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao excluir lançamento.');
    }
  }

  const categoriasFiltradas = categorias.filter((c) => c.tipo === form.tipo);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Lançamentos</h1>
        <p className="page-subtitle">Registre e acompanhe todas as entradas, despesas e compras parceladas.</p>
      </div>

      {erro && <div className="alert alert-error" role="alert">{erro}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <form onSubmit={salvar} className="card">
        <div className="card-heading-row">
          <p className="card-title">{editId ? 'Editar lançamento' : 'Nova movimentação'}</p>
          {editId && <span className="badge badge-cartao">Modo de edição</span>}
        </div>

        <div className="form-grid">
          <label className="field">
            Tipo de movimentação
            <select value={form.tipo} onChange={(e) => mudarTipo(e.target.value)}>
              <option value="saida">Despesa (saída)</option>
              <option value="entrada">Receita (entrada)</option>
            </select>
          </label>

          <label className="field field-wide">
            Descrição
            <input
              required
              maxLength={120}
              placeholder="Ex.: Compra no supermercado, Salário mensal..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </label>

          <label className="field">
            Valor total (R$)
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
            />
          </label>

          <label className="field">
            Data
            <input
              required
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </label>

          <label className="field">
            Categoria
            <select
              required
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
            >
              <option value="">Selecione uma categoria</option>
              {categoriasFiltradas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>

          <label className="field">
            Conta ou cartão
            <select
              required
              value={form.fonte_destino_id}
              onChange={(e) => mudarFonte(e.target.value)}
            >
              <option value="">Selecione uma conta ou cartão</option>
              {fontes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome} — {ROTULOS_FONTE[f.tipo] || f.tipo}
                </option>
              ))}
            </select>
          </label>

          {!editId && form.tipo === 'saida' && (
            <label className="field">
              Parcelas {fonteSelecionada && fonteSelecionada.tipo !== 'cartao_credito' ? '(apenas cartão)' : ''}
              <input
                type="number"
                min="1"
                max="48"
                disabled={!permiteParcelamento}
                value={permiteParcelamento ? form.total_parcelas : 1}
                onChange={(e) => setForm({ ...form, total_parcelas: e.target.value })}
              />
            </label>
          )}
        </div>

        {permiteParcelamento && Number(form.total_parcelas) > 1 && Number(form.valor) > 0 && (
          <p className="form-hint">
            Serão geradas {Number(form.total_parcelas)} parcelas de{' '}
            <strong>
              {money(Math.floor(Math.round(Number(form.valor) * 100) / Number(form.total_parcelas)) / 100)}
            </strong>
            . A primeira parcela absorve eventual diferença de centavos.
          </p>
        )}

        <div className="form-actions">
          <button className="btn" type="submit">
            {editId ? 'Salvar alterações' : '+ Adicionar lançamento'}
          </button>
          {editId && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setEditId(null);
                setForm(VAZIO);
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className="card filter-card">
        <div className="card-title">Filtrar movimentações</div>
        <div className="form-grid filter-grid">
          <label className="field">
            Data inicial
            <input
              type="date"
              value={filtro.inicio}
              onChange={(e) => {
                setPagina(1);
                setFiltro({ ...filtro, inicio: e.target.value });
              }}
            />
          </label>
          <label className="field">
            Data final
            <input
              type="date"
              value={filtro.fim}
              onChange={(e) => {
                setPagina(1);
                setFiltro({ ...filtro, fim: e.target.value });
              }}
            />
          </label>
          <label className="field">
            Tipo
            <select
              value={filtro.tipo}
              onChange={(e) => {
                setPagina(1);
                setFiltro({ ...filtro, tipo: e.target.value });
              }}
            >
              <option value="">Todos</option>
              <option value="entrada">Receitas</option>
              <option value="saida">Despesas</option>
            </select>
          </label>
          <label className="field">
            Categoria
            <select
              value={filtro.categoriaId}
              onChange={(e) => {
                setPagina(1);
                setFiltro({ ...filtro, categoriaId: e.target.value });
              }}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Conta ou cartão
            <select
              value={filtro.fonteDestinoId}
              onChange={(e) => {
                setPagina(1);
                setFiltro({ ...filtro, fonteDestinoId: e.target.value });
              }}
            >
              <option value="">Todos</option>
              {fontes.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </label>
          <div className="filter-action">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setPagina(1);
                setFiltro(filtroInicial());
              }}
            >
              Mês atual
            </button>
          </div>
        </div>
      </section>

      <div className="stats compact-stats">
        <div className="stat stat-entrada">
          <div className="stat-label">ENTRADAS NO FILTRO</div>
          <div className="stat-value">{money(totais.total_entradas)}</div>
        </div>
        <div className="stat stat-saida">
          <div className="stat-label">SAÍDAS NO FILTRO</div>
          <div className="stat-value">{money(totais.total_saidas)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">SALDO NO FILTRO</div>
          <div
            className="stat-value"
            style={{ color: totais.saldo < 0 ? 'var(--red)' : 'var(--ink)' }}
          >
            {money(totais.saldo)}
          </div>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>Movimentações registradas</h2>
          <p className="page-subtitle">{paginacao.total || 0} registros encontrados</p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">Carregando movimentações...</div>
      ) : lista.length === 0 ? (
        <div className="card empty">Nenhum lançamento encontrado para os filtros selecionados.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Conta ou cartão</th>
                <th className="num">Valor</th>
                <th>Parcela</th>
                <th className="num">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id}>
                  <td>{dataBR(l.data)}</td>
                  <td><strong className="table-primary">{l.descricao}</strong></td>
                  <td>
                    <span className={`badge ${l.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida'}`}>
                      {l.tipo === 'entrada' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td>{l.categoria_nome}</td>
                  <td>{l.fonte_nome}</td>
                  <td className="num"><strong>{money(l.valor)}</strong></td>
                  <td>
                    {l.total_parcelas > 1 ? (
                      <span className="badge badge-cartao">{l.parcela_atual}/{l.total_parcelas}</span>
                    ) : (
                      <span className="badge badge-neutral">À vista</span>
                    )}
                  </td>
                  <td className="num">
                    <div className="actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => editar(l)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => excluir(l)}>
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

      <div className="pagination">
        <span>Página {pagina} de {paginacao.totalPaginas || 1}</span>
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => p - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={pagina >= (paginacao.totalPaginas || 1)}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
