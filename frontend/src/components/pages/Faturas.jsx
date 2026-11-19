import { useEffect, useState } from 'react';
import { api } from '../../services/api';
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = iso => String(iso || '').slice(0, 10).split('-').reverse().join('/');
const mesBR = ref => { const [a,m] = String(ref).split('-'); return `${m}/${a}`; };
const mesAtualLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const STATUS = { aberta:{texto:'Aberta',classe:'aberta'}, fechada:{texto:'Fechada',classe:'fechada'}, futura:{texto:'Prevista',classe:'futura'} };
export default function Faturas(){
 const [mes,setMes]=useState(mesAtualLocal()),[meses,setMeses]=useState(6),[faturas,setFaturas]=useState([]),[erro,setErro]=useState(''),[loading,setLoading]=useState(false);
 async function carregar(){setLoading(true);setErro('');try{const {data}=await api.get('/relatorios/faturas',{params:{mes,meses}});setFaturas(data.faturas||[]);}catch(e){setErro(e.response?.data?.erro||'Erro ao consultar faturas.');setFaturas([]);}finally{setLoading(false);}}
 useEffect(()=>{carregar();},[]);
 return <div className="page">
  <div className="page-header"><h1>Faturas de cartões</h1><p className="page-subtitle fatura-description">Acompanhe os ciclos de fechamento, vencimentos e limite utilizado dos seus cartões. A previsão considera as compras e parcelas registradas no sistema.</p></div>
  <div className="card"><div className="form-row"><label className="field">Mês inicial<input type="month" value={mes} onChange={e=>setMes(e.target.value)}/></label><label className="field">Período<select value={meses} onChange={e=>setMeses(Number(e.target.value))}>{[3,6,9,12].map(n=><option key={n} value={n}>{n} meses</option>)}</select></label><button className="btn" onClick={carregar} disabled={loading||!mes}>{loading?'Consultando...':'Consultar faturas'}</button></div></div>
  {erro&&<div className="alert alert-error" role="alert">{erro}</div>}
  {loading?<div className="card empty">Consultando faturas...</div>:faturas.length===0?<div className="card empty">Nenhum cartão de crédito cadastrado ou nenhuma fatura encontrada para o período.</div>:faturas.map(f=>{
   const st=STATUS[f.status]||STATUS.futura;const usoPct=f.limite>0?Math.min(100,(f.limite_utilizado/f.limite)*100):0;
   return <section className="card fatura-card" key={`${f.cartao_id}-${f.ciclo}`}>
    <div className="fatura-head"><h2>{f.cartao} <span className="muted-separator">/</span> {mesBR(f.mes_referencia)}</h2><span className={`fatura-status ${st.classe}`}>{st.texto}</span></div>
    <div className="fatura-meta"><div className="fatura-meta-item"><span>VALOR DA FATURA</span><strong>{money(f.total)}</strong></div><div className="fatura-meta-item"><span>FECHAMENTO</span><strong>{dataBR(f.fechamento)}</strong></div><div className="fatura-meta-item"><span>VENCIMENTO</span><strong>{dataBR(f.vencimento)}</strong></div></div>
    <div className="fatura-limit"><span>Limite utilizado: {money(f.limite_utilizado)}</span><strong>Disponível: {money(f.limite_disponivel)}</strong></div><div className="fatura-track" title={`${usoPct.toFixed(0)}% do limite utilizado`}><div className={`fatura-fill ${usoPct>80?'high':''}`} style={{width:`${usoPct}%`}}/></div>
    <div className="section-heading"><div><h2>Compras desta fatura</h2><p className="page-subtitle">Limite total: {money(f.limite)}</p></div></div>
    {f.lancamentos?.length?<div className="table-wrap"><table><thead><tr>{['Compra','Categoria','Data','Parcela','Valor'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{f.lancamentos.map(l=><tr key={l.id}><td><strong className="table-primary">{l.descricao}</strong></td><td>{l.categoria}</td><td>{dataBR(l.data)}</td><td>{l.parcela}</td><td className="num">{money(l.valor)}</td></tr>)}</tbody></table></div>:<p className="empty">Sem compras previstas nesta fatura.</p>}
   </section>;
  })}
 </div>;
}
