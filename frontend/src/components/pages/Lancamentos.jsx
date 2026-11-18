import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const pad=n=>String(n).padStart(2,'0');
const hojeLocal=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const dataBR=iso=>String(iso||'').slice(0,10).split('-').reverse().join('/');
const filtroInicial=()=>{const d=new Date();const a=d.getFullYear(),m=pad(d.getMonth()+1);return {inicio:`${a}-${m}-01`,fim:`${a}-${m}-${pad(new Date(a,d.getMonth()+1,0).getDate())}`,tipo:'',categoriaId:'',fonteDestinoId:''};};
const vazio={tipo:'saida',descricao:'',valor:'',data:hojeLocal(),categoria_id:'',fonte_destino_id:'',total_parcelas:1};
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const campo={padding:8,border:'1px solid #bbb',borderRadius:4,background:'#fff',color:'#222'};
const botao={padding:'8px 13px',border:0,borderRadius:4,background:'#2563eb',color:'#fff',cursor:'pointer'};
export default function Lancamentos(){
 const [lista,setLista]=useState([]),[categorias,setCategorias]=useState([]),[fontes,setFontes]=useState([]);
 const [form,setForm]=useState(vazio),[editId,setEditId]=useState(null);
 const [filtro,setFiltro]=useState(filtroInicial);
 const [pagina,setPagina]=useState(1),[paginacao,setPaginacao]=useState({total:0,totalPaginas:0});
 const [totais,setTotais]=useState({total_entradas:0,total_saidas:0,saldo:0});
 const [erro,setErro]=useState(''),[msg,setMsg]=useState(''),[loading,setLoading]=useState(false);
 async function carregar(){
  setLoading(true);setErro('');
  try{
   const params={pagina,porPagina:10,...Object.fromEntries(Object.entries(filtro).filter(([,v])=>v))};
   const {data}=await api.get('/lancamentos',{params});
   setLista(data.dados||[]);setPaginacao(data.paginacao||{});
   setTotais(data.totais||{total_entradas:0,total_saidas:0,saldo:0});
  }catch(e){setErro(e.response?.data?.erro||'Erro ao carregar lançamentos.');}finally{setLoading(false);}
 }
 async function carregarOpcoes(){try{const [c,f]=await Promise.all([api.get('/categorias'),api.get('/fontes-destinos')]);setCategorias(c.data);setFontes(f.data);}catch(e){setErro(e.response?.data?.erro||'Erro ao carregar categorias e fontes.');}}
 useEffect(()=>{carregarOpcoes();},[]);
 useEffect(()=>{carregar();},[pagina,filtro]);
 function mudarTipo(tipo){setForm({...form,tipo,categoria_id:''});}
 async function salvar(e){e.preventDefault();setErro('');setMsg('');
  const payload={...form,valor:Number(form.valor),categoria_id:Number(form.categoria_id),fonte_destino_id:Number(form.fonte_destino_id),total_parcelas:Number(form.total_parcelas)};
  try{if(editId){await api.put(`/lancamentos/${editId}`,payload);setMsg('Lançamento atualizado.');}else{await api.post('/lancamentos',payload);setMsg('Lançamento cadastrado.');}
   setForm(vazio);setEditId(null);await carregar();
  }catch(e2){setErro(e2.response?.data?.erro||'Erro ao salvar lançamento.');}
 }
 function editar(l){setEditId(l.id);setForm({tipo:l.tipo,descricao:l.descricao,valor:l.valor,data:String(l.data).slice(0,10),categoria_id:String(l.categoria_id),fonte_destino_id:String(l.fonte_destino_id),total_parcelas:1});window.scrollTo({top:0,behavior:'smooth'});}
 async function excluir(l){const todas=l.grupo_parcelamento&&window.confirm('Este lançamento faz parte de uma compra parcelada. Excluir todas as parcelas?');if(!todas&&!window.confirm('Excluir somente este lançamento?'))return;
  try{await api.delete(`/lancamentos/${l.id}`,{params:todas?{todasParcelas:'true'}:{}});setMsg('Lançamento excluído.');await carregar();}catch(e){setErro(e.response?.data?.erro||'Erro ao excluir.');}}
 const categoriasFiltradas=categorias.filter(c=>c.tipo===form.tipo);
 return <div style={{color:'#222',textAlign:'left'}}><h1>Lançamentos</h1>
  {erro&&<p role="alert" style={{color:'#b91c1c'}}>{erro}</p>}{msg&&<p style={{color:'#15803d'}}>{msg}</p>}
  <form onSubmit={salvar} style={{border:'1px solid #ddd',borderRadius:8,padding:16,marginBottom:20,display:'flex',gap:12,flexWrap:'wrap',alignItems:'end'}}>
   <h2 style={{width:'100%',margin:'0 0 5px'}}>{editId?'Editar lançamento':'Novo lançamento'}</h2>
   <label>Tipo<br/><select style={campo} value={form.tipo} onChange={e=>mudarTipo(e.target.value)}><option value="saida">Despesa</option><option value="entrada">Receita</option></select></label>
   <label>Descrição<br/><input style={campo} required maxLength="120" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})}/></label>
   <label>Valor total (R$)<br/><input style={campo} required type="number" min="0.01" step="0.01" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})}/></label>
   <label>Data da compra<br/><input style={campo} required type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/></label>
   <label>Categoria<br/><select style={campo} required value={form.categoria_id} onChange={e=>setForm({...form,categoria_id:e.target.value})}><option value="">Selecione</option>{categoriasFiltradas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
   <label>Fonte/destino<br/><select style={campo} required value={form.fonte_destino_id} onChange={e=>setForm({...form,fonte_destino_id:e.target.value})}><option value="">Selecione</option>{fontes.map(f=><option key={f.id} value={f.id}>{f.nome} ({f.tipo})</option>)}</select></label>
   {!editId&&form.tipo==='saida'&&<label>Parcelas<br/><input style={{...campo,width:80}} type="number" min="1" max="48" value={form.total_parcelas} onChange={e=>setForm({...form,total_parcelas:e.target.value})}/></label>}
   {!editId&&form.tipo==='saida'&&Number(form.total_parcelas)>1&&Number(form.valor)>0&&<small style={{width:'100%',color:'#555'}}>{Number(form.total_parcelas)}× de {money(Math.floor(Math.round(Number(form.valor)*100)/Number(form.total_parcelas))/100)} (a 1ª parcela absorve a diferença de centavos). Parcelamento só é aceito para cartão de crédito.</small>}
   <button style={botao}>{editId?'Salvar alterações':'Cadastrar'}</button>{editId&&<button type="button" style={{...botao,background:'#666'}} onClick={()=>{setEditId(null);setForm(vazio);}}>Cancelar</button>}
  </form>
  <h2>Filtros</h2><div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end',marginBottom:16}}>
   <label>De<br/><input style={campo} type="date" value={filtro.inicio} onChange={e=>{setPagina(1);setFiltro({...filtro,inicio:e.target.value})}}/></label>
   <label>Até<br/><input style={campo} type="date" value={filtro.fim} onChange={e=>{setPagina(1);setFiltro({...filtro,fim:e.target.value})}}/></label>
   <label>Tipo<br/><select style={campo} value={filtro.tipo} onChange={e=>{setPagina(1);setFiltro({...filtro,tipo:e.target.value})}}><option value="">Todos</option><option value="entrada">Receitas</option><option value="saida">Despesas</option></select></label>
   <label>Categoria<br/><select style={campo} value={filtro.categoriaId} onChange={e=>{setPagina(1);setFiltro({...filtro,categoriaId:e.target.value})}}><option value="">Todas</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
   <label>Fonte/destino<br/><select style={campo} value={filtro.fonteDestinoId} onChange={e=>{setPagina(1);setFiltro({...filtro,fonteDestinoId:e.target.value})}}><option value="">Todos</option>{fontes.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>
   <button style={{...botao,background:'#555'}} onClick={()=>{setPagina(1);setFiltro(filtroInicial())}}>Mês atual</button>
  </div>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}><div>Total de entradas: <strong>{money(totais.total_entradas)}</strong></div><div>Total de saídas: <strong>{money(totais.total_saidas)}</strong></div><div>Saldo: <strong>{money(totais.saldo)}</strong></div></div>
  {loading?<p>Carregando...</p>:lista.length===0?<p>Nenhum lançamento encontrado.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Data','Descrição','Tipo','Categoria','Fonte/destino','Valor','Parcela','Ações'].map(t=><th key={t} style={{textAlign:'left',padding:8,borderBottom:'2px solid #ddd'}}>{t}</th>)}</tr></thead><tbody>{lista.map(l=><tr key={l.id}>{[dataBR(l.data),l.descricao,l.tipo==='entrada'?'Receita':'Despesa',l.categoria_nome,l.fonte_nome,money(l.valor),`${l.parcela_atual}/${l.total_parcelas}`].map((v,i)=><td key={i} style={{padding:8,borderBottom:'1px solid #eee'}}>{v}</td>)}<td style={{padding:8}}><button onClick={()=>editar(l)}>Editar</button> <button onClick={()=>excluir(l)}>Excluir</button></td></tr>)}</tbody></table></div>}
  <div style={{display:'flex',gap:12,alignItems:'center',marginTop:16}}><button disabled={pagina<=1} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Página {pagina} de {paginacao.totalPaginas||1} · {paginacao.total||0} registros</span><button disabled={pagina>=(paginacao.totalPaginas||1)} onClick={()=>setPagina(p=>p+1)}>Próxima</button></div>
 </div>;
}
