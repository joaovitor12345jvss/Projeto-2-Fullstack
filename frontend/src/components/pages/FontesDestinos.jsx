import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const FORM_VAZIO = { nome: '', tipo: 'conta', dia_fechamento: '', dia_vencimento: '', limite: '' };
const NOMES_TIPO = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };
const CLASSE_TIPO = { renda: 'badge-entrada', conta: 'badge-neutral', cartao_credito: 'badge-cartao' };

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
    <div className="page">
      <div className="page-header">
        <h1>Fontes e Destinos</h1>
        <p className="page-subtitle">Cadastre de onde o dinheiro vem e para onde ele vai: rendas, contas e cartões.</p>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}

      <form onSubmit={salvar} className="card">
        <p className="card-title">{editandoId ? 'Editar fonte/destino' : 'Nova fonte/destino'}</p>
        <div className="form-row">
          <label className="field" style={{ flex: '1 1 220px' }}>
            Nome
            <input
              value={form.nome}
              maxLength={60}
              required
              placeholder="Ex.: Nubank"
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </label>
          <label className="field">
            Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="conta">Conta</option>
              <option value="renda">Renda</option>
              <option value="cartao_credito">Cartão de crédito</option>
            </select>
          </label>

          {ehCartao && (
            <>
              <label className="field field-sm">
                Fechamento (dia)
                <input
                  type="number" min="1" max="31" required
                  value={form.dia_fechamento}
                  onChange={(e) => setForm({ ...form, dia_fechamento: e.target.value })}
                />
              </label>
              <label className="field field-sm">
                Vencimento (dia)
                <input
                  type="number" min="1" max="31" required
                  value={form.dia_vencimento}
                  onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
                />
              </label>
              <label className="field" style={{ width: 150 }}>
                Limite (R$)
                <input
                  type="number" min="0" step="0.01" required
                  value={form.limite}
                  onChange={(e) => setForm({ ...form, limite: e.target.value })}
                />
              </label>
            </>
          )}

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
            <option value="conta">Conta</option>
            <option value="renda">Renda</option>
            <option value="cartao_credito">Cartão de crédito</option>
          </select>
        </label>
      </div>

      {carregando ? (
        <p className="empty">Carregando...</p>
      ) : itens.length === 0 ? (
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
              {itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td><span className={`badge ${CLASSE_TIPO[item.tipo]}`}>{NOMES_TIPO[item.tipo]}</span></td>
                  <td>{item.dia_fechamento ? `dia ${item.dia_fechamento}` : '—'}</td>
                  <td>{item.dia_vencimento ? `dia ${item.dia_vencimento}` : '—'}</td>
                  <td className="num">{item.limite !== null && item.limite !== undefined ? moeda(item.limite) : '—'}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => editar(item)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => excluir(item)}>Excluir</button>
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
