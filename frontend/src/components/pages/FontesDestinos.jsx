import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const FORM_VAZIO = { nome: '', tipo: 'conta', dia_fechamento: '', dia_vencimento: '', limite: '' };
const NOMES_TIPO = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };
const CLASSE_TIPO = { renda: 'badge-entrada', conta: 'badge-neutral', cartao_credito: 'badge-cartao' };

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    setCarregando(true);
    try {
      const { data } = await api.get('/fontes-destinos');
      setItens(data);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar fontes e destinos.');
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

    const payload = { nome: form.nome, tipo: form.tipo };
    if (ehCartao) {
      payload.dia_fechamento = Number(form.dia_fechamento);
      payload.dia_vencimento = Number(form.dia_vencimento);
      payload.limite = Number(form.limite);
    }

    try {
      if (editandoId) {
        await api.put(`/fontes-destinos/${editandoId}`, payload);
        setSucesso('Conta ou cartão atualizado com sucesso.');
      } else {
        await api.post('/fontes-destinos', payload);
        setSucesso('Conta ou cartão cadastrado com sucesso.');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir "${item.nome}"?`)) return;
    setErro('');
    setSucesso('');
    try {
      await api.delete(`/fontes-destinos/${item.id}`);
      setSucesso('Conta ou cartão excluído com sucesso.');
      if (editandoId === item.id) limparForm();
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao excluir fonte/destino.');
    }
  }

  const totalContas = itens.filter((i) => i.tipo === 'conta').length;
  const cartoes = itens.filter((i) => i.tipo === 'cartao_credito');
  const limiteTotal = cartoes.reduce((acc, c) => acc + Number(c.limite || 0), 0);
  const itensFiltrados = filtroTipo ? itens.filter((i) => i.tipo === filtroTipo) : itens;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Contas e cartões</h1>
        <p className="page-subtitle">Cadastre suas contas bancárias, fontes de renda e cartões de crédito com fechamento e limite.</p>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">CONTAS BANCÁRIAS</div>
          <div className="stat-value">{totalContas}</div>
        </div>
        <div className="stat stat-entrada">
          <div className="stat-label">CARTÕES DE CRÉDITO</div>
          <div className="stat-value">{cartoes.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">LIMITE TOTAL DE CRÉDITO</div>
          <div className="stat-value">{moeda(limiteTotal)}</div>
        </div>
      </div>

      {erro && <div className="alert alert-error" role="alert">{erro}</div>}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}

      <form onSubmit={salvar} className="card">
        <div className="card-heading-row">
          <p className="card-title">{editandoId ? 'Editar conta ou cartão' : 'Nova conta, renda ou cartão'}</p>
          {editandoId && <span className="badge badge-cartao">Editando registro</span>}
        </div>
        <div className="form-row">
          <label className="field" style={{ flex: '2 1 220px' }}>
            Nome
            <input
              value={form.nome}
              maxLength={60}
              required
              placeholder="Ex.: Nubank, Itaú, Salário..."
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </label>
          <label className="field" style={{ flex: '1 1 180px' }}>
            Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="conta">Conta</option>
              <option value="cartao_credito">Cartão de crédito</option>
              <option value="renda">Renda</option>
            </select>
          </label>

          {ehCartao && (
            <>
              <label className="field" style={{ flex: '1 1 130px' }}>
                Dia fechamento
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  placeholder="Ex.: 3"
                  value={form.dia_fechamento}
                  onChange={(e) => setForm({ ...form, dia_fechamento: e.target.value })}
                />
              </label>
              <label className="field" style={{ flex: '1 1 130px' }}>
                Dia vencimento
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  placeholder="Ex.: 10"
                  value={form.dia_vencimento}
                  onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
                />
              </label>
              <label className="field" style={{ flex: '1 1 150px' }}>
                Limite (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={form.limite}
                  onChange={(e) => setForm({ ...form, limite: e.target.value })}
                />
              </label>
            </>
          )}

          <div className="form-inline-actions">
            <button type="submit" className="btn">
              {editandoId ? 'Salvar alterações' : '+ Adicionar'}
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
          <h2>Cadastros ativos</h2>
          <p className="page-subtitle">{itensFiltrados.length} registros exibidos</p>
        </div>
        <div className="segmented-control" role="group" aria-label="Filtrar contas e cartões">
          <button
            type="button"
            className={`seg-btn ${filtroTipo === '' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`seg-btn ${filtroTipo === 'conta' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('conta')}
          >
            Contas
          </button>
          <button
            type="button"
            className={`seg-btn ${filtroTipo === 'cartao_credito' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('cartao_credito')}
          >
            Cartões
          </button>
          <button
            type="button"
            className={`seg-btn ${filtroTipo === 'renda' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('renda')}
          >
            Rendas
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="card empty">Carregando contas e cartões...</div>
      ) : itensFiltrados.length === 0 ? (
        <div className="card empty">Nenhuma fonte ou destino encontrado.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Fechamento</th>
                <th>Vencimento</th>
                <th className="num">Limite</th>
                <th className="num">Ações</th>
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.map((item) => (
                <tr key={item.id}>
                  <td><strong className="table-primary">{item.nome}</strong></td>
                  <td>
                    <span className={`badge ${CLASSE_TIPO[item.tipo]}`}>
                      {NOMES_TIPO[item.tipo]}
                    </span>
                  </td>
                  <td>{item.dia_fechamento ? `Dia ${item.dia_fechamento}` : '—'}</td>
                  <td>{item.dia_vencimento ? `Dia ${item.dia_vencimento}` : '—'}</td>
                  <td className="num">
                    {item.limite !== null && item.limite !== undefined ? <strong>{moeda(item.limite)}</strong> : '—'}
                  </td>
                  <td className="num">
                    <div className="actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => editar(item)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => excluir(item)}>
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
