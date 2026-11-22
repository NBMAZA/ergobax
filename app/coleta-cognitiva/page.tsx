'use client';
import {useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {supabase} from '../../lib/supabase';
import {useClienteAtivo} from '../use-cliente-ativo';

const catalogo=[
['COG-01','Sobrecarga mental'],
['COG-02','Exigência elevada de atenção'],
['COG-03','Necessidade de concentração prolongada'],
['COG-04','Exigência elevada de memória'],
['COG-05','Grande quantidade de informações'],
['COG-06','Tomada de decisões complexas'],
['COG-07','Necessidade de raciocínio rápido'],
['COG-08','Múltiplas tarefas cognitivas simultâneas'],
['COG-09','Alternância frequente entre tarefas'],
['COG-10','Interrupções constantes'],
['COG-11','Vigilância contínua'],
['COG-12','Necessidade de memorizar procedimentos sem apoio'],
['COG-13','Necessidade de detectar sinais ou alarmes rapidamente'],
['COG-14','Incompatibilidade entre complexidade da tarefa e recursos disponíveis'],
['COG-15','Ritmo cognitivo elevado']
] as const;
type Fator={situacao:'nao_avaliado'|'presente'|'ausente';descricao:string;observacoes:string};
type Registro={id:string;cliente_id:string;cargo_id:string;titulo:string;data_avaliacao:string;status:'em_elaboracao'|'concluida';vigente:boolean;fatores:Record<string,Fator>;observacoes:string|null};
type Cargo={id:string;codigo:string;nome:string;tipo_cargo:string|null};
type Cliente={id:string;razao_social:string;consultoria_id:string};
const vazio=():Fator=>({situacao:'nao_avaliado',descricao:'',observacoes:''});
export default function ColetaCognitiva(){
 const {clienteAtivo}=useClienteAtivo();
 const [clientes,setClientes]=useState<Cliente[]>([]),[cargos,setCargos]=useState<Cargo[]>([]),[registros,setRegistros]=useState<Registro[]>([]);
 const [editId,setEditId]=useState<string|null>(null),[tela,setTela]=useState<'lista'|'form'>('lista'),[identificacaoAberta,setIdentificacaoAberta]=useState(false);
 const [cargoId,setCargoId]=useState(''),[titulo,setTitulo]=useState('Avaliação cognitiva'),[data,setData]=useState(new Date().toISOString().slice(0,10));
 const [status,setStatus]=useState<'em_elaboracao'|'concluida'>('em_elaboracao'),[vigente,setVigente]=useState(false);
 const [fatores,setFatores]=useState<Record<string,Fator>>({}),[ativo,setAtivo]=useState('COG-01'),[observacoes,setObservacoes]=useState('');
 const [erro,setErro]=useState(''),[sucesso,setSucesso]=useState(''),[busy,setBusy]=useState(false),[original,setOriginal]=useState('');
 const cliente=clientes.find(c=>c.id===clienteAtivo);
 const snapshot=()=>JSON.stringify({cargoId,titulo,data,status,vigente,fatores,observacoes});
 function avisoSaida(){return tela!=='form'||snapshot()===original||window.confirm('Existem alterações não salvas. Deseja descartá-las?')}
 useEffect(()=>{(async()=>{const db=supabase();const {data:{user}}=await db.auth.getUser();if(!user){setErro('Entre no Portal para acessar a Coleta Cognitiva.');return}const r=await db.from('clientes').select('id,razao_social,consultoria_id');if(r.error)setErro(r.error.message);else setClientes(r.data||[])})()},[]);
 useEffect(()=>{setTela('lista');setEditId(null);setErro('');setSucesso('');if(!clienteAtivo){setCargos([]);setRegistros([]);return}let cancel=false;(async()=>{const db=supabase();const [a,b]=await Promise.all([db.from('cargos').select('id,codigo,nome,tipo_cargo').eq('cliente_id',clienteAtivo).order('nome'),db.from('avaliacoes_cognitivas').select('*').eq('cliente_id',clienteAtivo).order('created_at',{ascending:false})]);if(cancel)return;if(a.error||b.error)setErro(a.error?.message||b.error?.message||'Falha ao carregar dados');else{setCargos(a.data||[]);setRegistros(b.data||[])}})();return()=>{cancel=true}},[clienteAtivo]);
 async function recarregar(){if(!clienteAtivo)return;const r=await supabase().from('avaliacoes_cognitivas').select('*').eq('cliente_id',clienteAtivo).order('created_at',{ascending:false});if(r.error)throw r.error;setRegistros(r.data||[])}
 function novo(){if(!avisoSaida())return;setEditId(null);setCargoId('');setTitulo('Avaliação cognitiva');const hoje=new Date().toISOString().slice(0,10);setData(hoje);setStatus('em_elaboracao');setVigente(false);setFatores({});setObservacoes('');setAtivo('COG-01');setIdentificacaoAberta(true);setOriginal(JSON.stringify({cargoId:'',titulo:'Avaliação cognitiva',data:hoje,status:'em_elaboracao',vigente:false,fatores:{},observacoes:''}));setTela('form');setErro('');setSucesso('')}
 function editar(r:Registro){if(!avisoSaida())return;setEditId(r.id);setCargoId(r.cargo_id);setTitulo(r.titulo);setData(r.data_avaliacao);setStatus(r.status);setVigente(r.vigente);setFatores(r.fatores||{});setObservacoes(r.observacoes||'');setAtivo('COG-01');setOriginal(JSON.stringify({cargoId:r.cargo_id,titulo:r.titulo,data:r.data_avaliacao,status:r.status,vigente:r.vigente,fatores:r.fatores||{},observacoes:r.observacoes||''}));setTela('form');setErro('');setSucesso('')}
 function voltar(){if(!avisoSaida())return;setTela('lista');setErro('');setSucesso('')}
 function adicionarRisco(){setErro('');setSucesso('');if(!editId){setErro('Salve a avaliação antes de adicionar riscos.');return}if(!cliente||!cargoId){setErro('Selecione um cargo.');return}const fator=catalogo.find(([codigo])=>codigo===ativo);if(!fator)return;const params=new URLSearchParams({novo:'1',cliente:cliente.id,nivel:'cliente',cargo_id:cargoId,criterio:ativo,grupo_origem:'Cognitivos',titulo_origem:fator[1],origem_cargo:'1'});window.open('/riscos-identificados?'+params.toString(),'ergobax_cadastro_risco')}
 function atualizar(k:keyof Fator,v:string){setFatores(p=>({...p,[ativo]:{...(p[ativo]||vazio()),[k]:v}}))}
 async function salvar(e:FormEvent){e.preventDefault();setErro('');setSucesso('');if(!cliente||!cargoId){setErro('Selecione uma empresa ativa e um cargo.');return}if(!titulo.trim()||!data){setErro('Informe título e data da avaliação.');return}setBusy(true);try{
 const db=supabase();const payload={consultoria_id:cliente.consultoria_id,cliente_id:cliente.id,cargo_id:cargoId,titulo:titulo.trim(),data_avaliacao:data,status,vigente,fatores,observacoes};
 // Somente uma avaliação vigente por cargo; não alterar registros anteriores automaticamente.
 if(vigente&&registros.some(r=>r.cargo_id===cargoId&&r.vigente&&r.id!==editId))throw Error('Este cargo já possui uma avaliação vigente. Desmarque a anterior antes de definir outra.');
 const res=editId?await db.from('avaliacoes_cognitivas').update(payload).eq('id',editId).eq('cliente_id',cliente.id).select('id').single():await db.from('avaliacoes_cognitivas').insert(payload).select('id').single();
 if(res.error)throw res.error;setEditId(res.data.id);await recarregar();setOriginal(snapshot());setSucesso('Avaliação cognitiva salva com sucesso.');
 }catch(e){setErro(e instanceof Error?e.message:'Erro ao salvar avaliação')}finally{setBusy(false)}}
 const f=fatores[ativo]||vazio();
 const btn:React.CSSProperties={background:'#0c2c4c',color:'#fff',border:'none',borderRadius:8,padding:'10px 16px',fontWeight:700,cursor:'pointer'};
 const campo:React.CSSProperties={width:'100%',maxWidth:680,padding:10,border:'1px solid #cbd5e1',borderRadius:8,background:'white'};
 const selecionado=catalogo.find(([cod])=>cod===ativo);
 const acoes=(local:'topo'|'rodape')=><div style={{margin:'12px 0 18px'}}>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
   <button type="button" style={{...btn,background:'#137c59'}} onClick={adicionarRisco}>+ Adicionar Risco ({ativo})</button>
   <button type="button" style={btn} onClick={voltar}>Voltar à lista</button>
   <button type="submit" form="cog-form" style={btn} disabled={busy}>{busy?'Salvando...':'Salvar avaliação'}</button>
  </div>
  {erro&&<p role="alert" style={{fontWeight:700,color:'#b91c1c',marginTop:8}}>{erro}</p>}
  {sucesso&&<p role="status" style={{fontWeight:700,color:'#137c59',marginTop:8}}>{sucesso}</p>}
 </div>;
 return <div className="ergobax-gestao-page">
  <header style={{padding:'6px 16px',minHeight:56}}><nav style={{minHeight:44}}><span className="ergobax-modulo-marca"><img style={{maxHeight:42,width:'auto'}} src="/ergobax_logo_transparente.png" alt="ERGOBAX"/><strong>Coleta Ergonômica — Cognitiva</strong></span><Link href="/" style={{marginLeft:'auto'}}>← Voltar ao painel</Link></nav></header>
  <main style={{maxWidth:1400,margin:'12px auto',padding:'12px 20px'}}>
   
   {tela==='lista'?<section>
    <h1>Coleta Cognitiva</h1>
    {erro&&<p role="alert" style={{color:'#b91c1c',fontWeight:700}}>{erro}</p>}
    <button type="button" style={btn} disabled={!cliente} onClick={novo}>+ Nova avaliação cognitiva</button>
    <h2 style={{marginTop:20}}>Avaliações por cargo</h2>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Cargo</th><th>Avaliação</th><th>Data</th><th>Status</th><th>Vigente</th><th>Ação</th></tr></thead><tbody>{registros.map(r=><tr key={r.id}><td>{cargos.find(c=>c.id===r.cargo_id)?.nome||'Cargo não encontrado'}</td><td>{r.titulo}</td><td>{r.data_avaliacao}</td><td>{r.status==='concluida'?'Concluída':'Em elaboração'}</td><td>{r.vigente?'Sim':'Não'}</td><td><button type="button" style={btn} onClick={()=>editar(r)}>Abrir</button></td></tr>)}</tbody></table></div>
    {!registros.length&&<p>Nenhuma avaliação cognitiva cadastrada.</p>}
   </section>:<section>
    <h1 style={{marginBottom:8}}>Avaliação Cognitiva</h1>
    {acoes('topo')}
    <form id="cog-form" onSubmit={salvar} style={{display:'grid',gap:12}}>
     <section style={{border:'1px solid #cbd5e1',borderRadius:10,background:'#f8fafc',padding:14}}>
      <button type="button" onClick={()=>setIdentificacaoAberta(v=>!v)} style={{...btn,background:'transparent',color:'#0c2c4c',padding:'4px 0',width:'100%',textAlign:'left'}}>Identificação — {cargos.find(c=>c.id===cargoId)?.nome||'Selecione um cargo'} · {data} <span style={{float:'right'}}>{identificacaoAberta?'▲ Recolher':'▼ Expandir'}</span></button>
      {identificacaoAberta&&<div style={{display:'grid',gap:12,marginTop:14,maxWidth:700}}>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Cargo *<select style={campo} required value={cargoId} onChange={e=>setCargoId(e.target.value)}><option value="">Selecione um cargo</option>{cargos.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.nome} ({c.tipo_cargo||'não classificado'})</option>)}</select></label>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Título *<input style={campo} required value={titulo} onChange={e=>setTitulo(e.target.value)}/></label>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Data da avaliação *<input style={campo} type="date" required value={data} onChange={e=>setData(e.target.value)}/></label>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Status<select style={campo} value={status} onChange={e=>setStatus(e.target.value as 'em_elaboracao'|'concluida')}><option value="em_elaboracao">Em elaboração</option><option value="concluida">Concluída</option></select></label>
       <label style={{display:'flex',alignItems:'center',gap:8,fontWeight:600}}><input type="checkbox" checked={vigente} onChange={e=>setVigente(e.target.checked)}/> Avaliação vigente</label>
      </div>}
     </section>
     <section style={{border:'1px solid #cbd5e1',borderRadius:10,background:'#fff',padding:16}}>
      <h2 style={{margin:'0 0 12px'}}>Fatores cognitivos</h2>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:18}}>{catalogo.map(([cod])=><button key={cod} type="button" onClick={()=>{setAtivo(cod);setErro('');setSucesso('')}} style={{...btn,padding:'9px 12px',background:ativo===cod?'#137c59':'#0c2c4c'}}>{cod}</button>)}</div>
      <h3 style={{margin:'0 0 16px'}}>{ativo} — {selecionado?.[1]}</h3>
      <div style={{display:'grid',gap:14,maxWidth:850}}>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Situação observada<select style={campo} value={f.situacao} onChange={e=>atualizar('situacao',e.target.value)}><option value="nao_avaliado">Não avaliado</option><option value="presente">Exigência presente</option><option value="ausente">Exigência não identificada</option></select></label>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Descrição das condições observadas<textarea style={campo} rows={4} value={f.descricao} onChange={e=>atualizar('descricao',e.target.value)}/></label>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Observações técnicas do fator<textarea style={campo} rows={3} value={f.observacoes} onChange={e=>atualizar('observacoes',e.target.value)}/></label>
      </div>
      <p style={{fontSize:13,color:'#64748b'}}>A presença de exigência cognitiva não determina, isoladamente, a existência de risco.</p>
     </section>
     <section style={{padding:12,background:'#f8fafc',borderRadius:8}}><label style={{display:'grid',gap:5,fontWeight:600}}>Observações gerais da avaliação<textarea style={campo} rows={3} value={observacoes} onChange={e=>setObservacoes(e.target.value)}/></label></section>
    </form>
    {acoes('rodape')}
   </section>}
  </main>
 </div>;
}
