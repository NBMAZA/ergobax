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
type Registro={id:string;cliente_id:string;cargo_id:string;titulo:string;data_avaliacao:string;status:'em_elaboracao'|'concluida';vigente:boolean;historica:boolean;fatores:Record<string,Fator>;observacoes:string|null};
type Cargo={id:string;codigo:string;nome:string;tipo_cargo:string|null};
type Cliente={id:string;razao_social:string;consultoria_id:string};
const vazio=():Fator=>({situacao:'nao_avaliado',descricao:'',observacoes:''});
type RiscoCOG={id:string;titulo:string;descricao:string;observacoes:string;classificacao:string;status:string;perfil_exposicao:string;medidas_existentes:string;medidas_recomendadas:string;plano_acao:string;responsavel_acao:string;conclusao_tecnica:string;grupo_risco:string;probabilidade:string;severidade:string;risco_puro:string;nivel_mitigacao:string;classificacao_final:string;lesoes_agravos:string;prazo:string};
const riscoVazio=():RiscoCOG=>({id:'',titulo:'',descricao:'',observacoes:'',classificacao:'nao_classificado',status:'aberto',perfil_exposicao:'',medidas_existentes:'',medidas_recomendadas:'',plano_acao:'',responsavel_acao:'',conclusao_tecnica:'',grupo_risco:'Cognitivos',probabilidade:'',severidade:'',risco_puro:'',nivel_mitigacao:'',classificacao_final:'',lesoes_agravos:'',prazo:''});
export default function ColetaCognitiva(){
 const {clienteAtivo}=useClienteAtivo();
 const [clientes,setClientes]=useState<Cliente[]>([]),[cargos,setCargos]=useState<Cargo[]>([]),[registros,setRegistros]=useState<Registro[]>([]);
 const [editId,setEditId]=useState<string|null>(null),[tela,setTela]=useState<'lista'|'form'>('lista'),[identificacaoAberta,setIdentificacaoAberta]=useState(false);
 const [cargoId,setCargoId]=useState(''),[titulo,setTitulo]=useState('Avaliação cognitiva'),[data,setData]=useState(new Date().toISOString().slice(0,10));
 const [status,setStatus]=useState<'em_elaboracao'|'concluida'>('em_elaboracao'),[vigente,setVigente]=useState(false),[historica,setHistorica]=useState(false);
 const [fatores,setFatores]=useState<Record<string,Fator>>({}),[ativo,setAtivo]=useState('COG-01'),[observacoes,setObservacoes]=useState('');
 const [erro,setErro]=useState(''),[sucesso,setSucesso]=useState(''),[busy,setBusy]=useState(false),[original,setOriginal]=useState('');
 const [riscoInline,setRiscoInline]=useState<RiscoCOG|null>(null),[riscosFator,setRiscosFator]=useState<{id:string;titulo:string;classificacao:string;status:string}[]>([]),[salvandoRisco,setSalvandoRisco]=useState(false),[versaoRisco,setVersaoRisco]=useState(0);
 const cliente=clientes.find(c=>c.id===clienteAtivo);
 const snapshot=()=>JSON.stringify({cargoId,titulo,data,status,vigente,fatores,observacoes});
 function avisoSaida(){return tela!=='form'||snapshot()===original||window.confirm('Existem alterações não salvas. Deseja descartá-las?')}
 useEffect(()=>{(async()=>{const db=supabase();const {data:{user}}=await db.auth.getUser();if(!user){setErro('Entre no Portal para acessar a Coleta Cognitiva.');return}const r=await db.from('clientes').select('id,razao_social,consultoria_id');if(r.error)setErro(r.error.message);else setClientes(r.data||[])})()},[]);
 useEffect(()=>{setTela('lista');setEditId(null);setErro('');setSucesso('');if(!clienteAtivo){setCargos([]);setRegistros([]);return}let cancel=false;(async()=>{const db=supabase();const [a,b]=await Promise.all([db.from('cargos').select('id,codigo,nome,tipo_cargo').eq('cliente_id',clienteAtivo).order('nome'),db.from('avaliacoes_cognitivas').select('*').eq('cliente_id',clienteAtivo).order('created_at',{ascending:false})]);if(cancel)return;if(a.error||b.error)setErro(a.error?.message||b.error?.message||'Falha ao carregar dados');else{setCargos(a.data||[]);setRegistros(b.data||[])}})();return()=>{cancel=true}},[clienteAtivo]);
 async function recarregar(){if(!clienteAtivo)return;const r=await supabase().from('avaliacoes_cognitivas').select('*').eq('cliente_id',clienteAtivo).order('created_at',{ascending:false});if(r.error)throw r.error;setRegistros(r.data||[])}
 function novo(){if(!avisoSaida())return;setEditId(null);setCargoId('');setTitulo('Avaliação cognitiva');const hoje=new Date().toISOString().slice(0,10);setData(hoje);setStatus('em_elaboracao');setVigente(false);setHistorica(false);setFatores({});setObservacoes('');setAtivo('COG-01');setRiscoInline(null);setIdentificacaoAberta(true);setOriginal(JSON.stringify({cargoId:'',titulo:'Avaliação cognitiva',data:hoje,status:'em_elaboracao',vigente:false,fatores:{},observacoes:''}));setTela('form');setErro('');setSucesso('')}
 function editar(r:Registro){if(!avisoSaida())return;setEditId(r.id);setCargoId(r.cargo_id);setTitulo(r.titulo);setData(r.data_avaliacao);setStatus(r.status);setVigente(r.vigente);setHistorica(r.historica);setFatores(r.fatores||{});setObservacoes(r.observacoes||'');setAtivo('COG-01');setOriginal(JSON.stringify({cargoId:r.cargo_id,titulo:r.titulo,data:r.data_avaliacao,status:r.status,vigente:r.vigente,fatores:r.fatores||{},observacoes:r.observacoes||''}));setTela('form');setErro('');setSucesso('')}
 async function concluirAvaliacao(r:Registro){if(!clienteAtivo||r.historica||r.status!=='em_elaboracao')return;if(!window.confirm('Concluir esta avaliação cognitiva? Ela permanecerá não vigente até a definição manual.'))return;setBusy(true);setErro('');setSucesso('');try{const {data,error}=await supabase().from('avaliacoes_cognitivas').update({status:'concluida',updated_at:new Date().toISOString()}).eq('id',r.id).eq('cliente_id',clienteAtivo).eq('status','em_elaboracao').eq('historica',false).select('id');if(error)throw error;if(!data?.length)throw Error('A avaliação não pôde ser concluída. Atualize a lista e tente novamente.');await recarregar();setSucesso('Avaliação concluída. Utilize Tornar vigente quando desejar ativá-la.')}catch(e){setErro(e instanceof Error?e.message:'Erro ao concluir avaliação')}finally{setBusy(false)}}
 async function definirVigente(r:Registro){if(!clienteAtivo||r.historica||r.status!=='concluida')return;if(!window.confirm('Definir esta avaliação como vigente? A avaliação vigente anterior passará a histórica e ficará somente para consulta.'))return;setBusy(true);setErro('');setSucesso('');try{const {error}=await supabase().rpc('cog_definir_vigente',{p_avaliacao:r.id});if(error)throw error;await recarregar();setSucesso('Avaliação vigente atualizada. A anterior foi preservada como histórica.')}catch(e){setErro(e instanceof Error?e.message:'Não foi possível alterar a vigência')}finally{setBusy(false)}}
 function voltar(){if(!avisoSaida())return;setTela('lista');setErro('');setSucesso('')}
 function adicionarRisco(){if(historica)return;setErro('');setSucesso('');if(!editId||snapshot()!==original){setErro('Salve a avaliação antes de adicionar riscos.');return}if(!cliente||!cargoId){setErro('Selecione um cargo.');return}setRiscoInline(riscoVazio())}
 async function editarRisco(id:string){if(!cliente||!cargoId||!editId)return;setErro('');const {data,error}=await supabase().from('riscos_identificados').select('*').eq('id',id).eq('cliente_id',cliente.id).eq('cargo_id',cargoId).eq('criterio_codigo',ativo).maybeSingle();if(error||!data){setErro(error?.message||'Risco não encontrado');return}const base=riscoVazio();setRiscoInline(Object.fromEntries(Object.keys(base).map(k=>[k,String(data[k]??base[k as keyof RiscoCOG])])) as RiscoCOG)}
 async function salvarRisco(){if(historica)return;if(!riscoInline||!cliente||!cargoId||!editId)return;if(!riscoInline.titulo.trim()){setErro('Informe o título do risco.');return}setSalvandoRisco(true);setErro('');setSucesso('');try{const r=riscoInline;const num=(v:string)=>v.trim()===''?null:Number(v);const dados={titulo:r.titulo.trim(),descricao:r.descricao,observacoes:r.observacoes,classificacao:r.classificacao,status:r.status,perfil_exposicao:r.perfil_exposicao,medidas_existentes:r.medidas_existentes,medidas_recomendadas:r.medidas_recomendadas,plano_acao:r.plano_acao,responsavel_acao:r.responsavel_acao,conclusao_tecnica:r.conclusao_tecnica,grupo_risco:'Cognitivos',probabilidade:num(r.probabilidade),severidade:num(r.severidade),risco_puro:num(r.risco_puro),nivel_mitigacao:r.nivel_mitigacao,classificacao_final:r.classificacao_final,lesoes_agravos:r.lesoes_agravos,prazo:r.prazo||null};const db=supabase();const res=r.id?await db.from('riscos_identificados').update(dados).eq('id',r.id).eq('cliente_id',cliente.id).eq('cargo_id',cargoId).eq('criterio_codigo',ativo):await db.from('riscos_identificados').insert({...dados,cliente_id:cliente.id,nivel:'cliente',estrutura_id:null,origem:'outra',cargo_id:cargoId,criterio_codigo:ativo});if(res.error)throw res.error;setRiscoInline(null);setVersaoRisco(v=>v+1);setSucesso('Risco cognitivo salvo com sucesso.')}catch(e){setErro(e instanceof Error?e.message:'Erro ao salvar risco')}finally{setSalvandoRisco(false)}}
 useEffect(()=>{setRiscoInline(null);setRiscosFator([]);if(!clienteAtivo||!cargoId||!editId)return;let cancel=false;(async()=>{const {data,error}=await supabase().from('riscos_identificados').select('id,titulo,classificacao,status').eq('cliente_id',clienteAtivo).eq('cargo_id',cargoId).eq('criterio_codigo',ativo).eq('grupo_risco','Cognitivos').order('created_at',{ascending:false});if(!cancel){if(error)setErro(error.message);else setRiscosFator(data||[])}})();return()=>{cancel=true}},[clienteAtivo,cargoId,editId,ativo,versaoRisco]);
  function atualizar(k:keyof Fator,v:string){setFatores(p=>({...p,[ativo]:{...(p[ativo]||vazio()),[k]:v}}))}
 async function salvar(e:FormEvent){e.preventDefault();if(historica){setErro('Avaliações históricas são somente para consulta.');return}setErro('');setSucesso('');if(!cliente||!cargoId){setErro('Selecione uma empresa ativa e um cargo.');return}if(!titulo.trim()||!data){setErro('Informe título e data da avaliação.');return}setBusy(true);try{
 const db=supabase();const payload={consultoria_id:cliente.consultoria_id,cliente_id:cliente.id,cargo_id:cargoId,titulo:titulo.trim(),data_avaliacao:data,status,fatores,observacoes};
 // A vigência é definida exclusivamente pela ação controlada na lista.
 const res=editId?await db.from('avaliacoes_cognitivas').update(payload).eq('id',editId).eq('cliente_id',cliente.id).select('id').single():await db.from('avaliacoes_cognitivas').insert(payload).select('id').single();
 if(res.error)throw res.error;setEditId(res.data.id);await recarregar();setOriginal(snapshot());setSucesso('Avaliação cognitiva salva com sucesso.');
 }catch(e){setErro(e instanceof Error?e.message:'Erro ao salvar avaliação')}finally{setBusy(false)}}
 const f=fatores[ativo]||vazio();
 const somenteLeitura=historica;
 const mudarRisco=(key:keyof RiscoCOG,value:string)=>setRiscoInline(v=>v?{...v,[key]:value}:v);
 const campoRisco=(key:keyof RiscoCOG,label:string,multilinha=true)=> <label style={{display:'grid',gap:5,fontWeight:600}}><span style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>{label}<button type="button" title="Ditar texto" onClick={()=>ditarRisco(key)} style={{padding:'5px 10px',border:'1px solid #cbd5e1',borderRadius:6}}>🎤</button></span>{multilinha?<textarea rows={2} style={{...campo,maxWidth:'100%'}} value={riscoInline?.[key]||''} onChange={e=>mudarRisco(key,e.target.value)}/>:<input style={{...campo,maxWidth:'100%'}} value={riscoInline?.[key]||''} onChange={e=>mudarRisco(key,e.target.value)}/>}</label>;
 function ditarRisco(key:keyof RiscoCOG){const w=window as Window & {SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any};const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;if(!Speech){setErro('Reconhecimento de voz não disponível neste navegador.');return}const rec=new Speech();rec.lang='pt-BR';rec.onresult=(ev:any)=>{const frase=ev.results?.[0]?.[0]?.transcript||'';setRiscoInline(v=>v?{...v,[key]:[v[key],frase].filter(Boolean).join(' ')}:v)};rec.onerror=()=>setErro('Não foi possível utilizar o microfone.');rec.start()}
 const btn:React.CSSProperties={background:'#0c2c4c',color:'#fff',border:'none',borderRadius:8,padding:'10px 16px',fontWeight:700,cursor:'pointer'};
 const campo:React.CSSProperties={width:'100%',maxWidth:680,padding:10,border:'1px solid #cbd5e1',borderRadius:8,background:'white'};
 const selecionado=catalogo.find(([cod])=>cod===ativo);
 const acoes=(local:'topo'|'rodape')=><div style={{margin:'12px 0 18px'}}>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
   <button type="button" style={{...btn,background:'#137c59'}} onClick={adicionarRisco} disabled={somenteLeitura}>+ Adicionar Risco ({ativo})</button>
   <button type="button" style={btn} onClick={voltar}>Voltar à lista</button>
   <button type="submit" form="cog-form" style={btn} disabled={busy||somenteLeitura}>{busy?'Salvando...':'Salvar avaliação'}</button>
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
    <h2 style={{marginTop:20}}>Avaliações por cargo</h2><p style={{color:'#475569',margin:'4px 0 14px'}}>Fluxo: Em elaboração → Concluir avaliação → Tornar vigente. Ao substituir a vigente, a anterior torna-se histórica e fica disponível somente para consulta.</p>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Cargo</th><th>Avaliação</th><th>Data</th><th>Status</th><th>Situação da avaliação</th><th>Ação</th></tr></thead><tbody>{registros.map(r=><tr key={r.id}><td>{cargos.find(c=>c.id===r.cargo_id)?.nome||'Cargo não encontrado'}</td><td>{r.titulo}</td><td>{r.data_avaliacao}</td><td>{r.status==='concluida'?'Concluída':'Em elaboração'}</td><td><strong>{r.historica?'Histórica':r.vigente?'Vigente':r.status==='concluida'?'Concluída — não vigente':'Em elaboração'}</strong></td><td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button type="button" style={btn} onClick={()=>editar(r)}>{r.historica?'Consultar':'Abrir'}</button>{!r.historica&&r.status==='em_elaboracao'&&<button type="button" style={{...btn,background:'#245c82'}} disabled={busy} onClick={()=>concluirAvaliacao(r)}>Concluir avaliação</button>}{!r.historica&&!r.vigente&&r.status==='concluida'&&<button type="button" style={{...btn,background:'#137c59'}} disabled={busy} onClick={()=>definirVigente(r)}>Tornar vigente</button>}</div></td></tr>)}</tbody></table></div>
    {!registros.length&&<p>Nenhuma avaliação cognitiva cadastrada.</p>}
   </section>:<section>
    <h1 style={{marginBottom:8}}>Avaliação Cognitiva — {historica?'HISTÓRICA (somente consulta)':vigente?'VIGENTE':status==='concluida'?'CONCLUÍDA (não vigente)':'EM ELABORAÇÃO'}</h1>
    {acoes('topo')}
    <form id="cog-form" onSubmit={salvar} style={{display:'grid',gap:12}}>
     <section style={{border:'1px solid #cbd5e1',borderRadius:10,background:'#f8fafc',padding:14}}>
      <button type="button" onClick={()=>setIdentificacaoAberta(v=>!v)} style={{...btn,background:'transparent',color:'#0c2c4c',padding:'4px 0',width:'100%',textAlign:'left'}}>Identificação — {cargos.find(c=>c.id===cargoId)?.nome||'Selecione um cargo'} · {data} <span style={{float:'right'}}>{identificacaoAberta?'▲ Recolher':'▼ Expandir'}</span></button>
      {identificacaoAberta&&<div style={{display:'grid',gap:12,marginTop:14,maxWidth:700}}>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Cargo *<select disabled={somenteLeitura} style={campo} required value={cargoId} onChange={e=>setCargoId(e.target.value)}><option value="">Selecione um cargo</option>{cargos.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.nome} ({c.tipo_cargo||'não classificado'})</option>)}</select></label>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Título *<input disabled={somenteLeitura} style={campo} required value={titulo} onChange={e=>setTitulo(e.target.value)}/></label>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Data da avaliação *<input disabled={somenteLeitura} style={campo} type="date" required value={data} onChange={e=>setData(e.target.value)}/></label>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Status<select disabled={somenteLeitura} style={campo} value={status} onChange={e=>setStatus(e.target.value as 'em_elaboracao'|'concluida')}><option value="em_elaboracao">Em elaboração</option><option value="concluida">Concluída</option></select></label>
       <p style={{fontWeight:700}}>Situação: {historica?'Histórica — somente consulta':vigente?'Vigente':'Não vigente'}. Para definir uma avaliação concluída como vigente, utilize o botão na lista.</p>
      </div>}
     </section>
     <section style={{border:'1px solid #cbd5e1',borderRadius:10,background:'#fff',padding:16}}>
      <h2 style={{margin:'0 0 12px'}}>Fatores cognitivos</h2>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:18}}>{catalogo.map(([cod,descricao])=><button key={cod} title={`${cod} — ${descricao}`} aria-label={`${cod} — ${descricao}`} type="button" onClick={()=>{setAtivo(cod);setRiscoInline(null);setErro('');setSucesso('')}} style={{...btn,padding:'9px 12px',background:ativo===cod?'#137c59':'#0c2c4c'}}>{cod}</button>)}</div>
      <h3 style={{margin:'0 0 16px'}}>{ativo} — {selecionado?.[1]}</h3>
      <div style={{display:'grid',gap:14,maxWidth:850}}>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Situação observada<select style={campo} value={f.situacao} onChange={e=>atualizar('situacao',e.target.value)}><option value="nao_avaliado">Não avaliado</option><option value="presente">Exigência presente</option><option value="ausente">Exigência não identificada</option></select></label>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Descrição das condições observadas<textarea disabled={somenteLeitura} style={campo} rows={4} value={f.descricao} onChange={e=>atualizar('descricao',e.target.value)}/></label>
       <label style={{display:'grid',gap:5,fontWeight:600}}>Observações técnicas do fator<textarea disabled={somenteLeitura} style={campo} rows={3} value={f.observacoes} onChange={e=>atualizar('observacoes',e.target.value)}/></label>
      </div>
      <p style={{fontSize:13,color:'#64748b'}}>A presença de exigência cognitiva não determina, isoladamente, a existência de risco.</p><section style={{marginTop:18,padding:14,background:'#f1f7fa',border:'1px solid #cbd5e1',borderRadius:8}}>
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}><strong>Riscos cadastrados neste fator ({riscosFator.length})</strong><button type="button" style={{...btn,background:'#137c59'}} onClick={adicionarRisco} disabled={somenteLeitura}>+ Adicionar Risco</button></div>
 {riscoInline&&<div style={{display:'grid',gap:10,background:'white',padding:14,border:'1px solid #94a3b8',borderRadius:8,marginTop:12}}>
 <strong>{riscoInline.id?'Editar risco':'Novo risco'} — {ativo}</strong>
 {campoRisco('titulo','Título do risco',false)}
 {campoRisco('observacoes','Observações')}
 <label style={{display:'grid',gap:5,fontWeight:600}}>Situação<select style={campo} value={riscoInline.status} onChange={e=>mudarRisco('status',e.target.value)}><option value="aberto">Aberto</option><option value="em_tratamento">Em tratamento</option><option value="controlado">Controlado</option><option value="encerrado">Encerrado</option></select></label>
 <details open><summary style={{cursor:'pointer',padding:'8px 0'}}>1. Identificação do risco</summary><div style={{display:'grid',gap:10,padding:'8px 0'}}>{campoRisco('descricao','Descrição do risco')}{campoRisco('grupo_risco','Grupo do risco')}</div></details>
 <details><summary style={{cursor:'pointer',padding:'8px 0'}}>2. Exposição e prevenção</summary><div style={{display:'grid',gap:10,padding:'8px 0'}}>{campoRisco('perfil_exposicao','Perfil de exposição')}{campoRisco('medidas_existentes','Medidas existentes')}{campoRisco('medidas_recomendadas','Medidas recomendadas')}</div></details>
 <details><summary style={{cursor:'pointer',padding:'8px 0'}}>3. Avaliação do risco</summary><div style={{display:'grid',gap:10,padding:'8px 0'}}><label>Classificação técnica<select style={campo} value={riscoInline.classificacao} onChange={e=>mudarRisco('classificacao',e.target.value)}>{[['nao_classificado','Não classificado'],['baixo','Baixo'],['moderado','Moderado'],['alto','Alto'],['critico','Crítico']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>{(['probabilidade','severidade','risco_puro'] as const).map(k=><label key={k} style={{display:'grid',gap:5}}>{k==='risco_puro'?'Risco puro':k==='probabilidade'?'Probabilidade':'Severidade'}<input type="number" style={{...campo,maxWidth:180}} value={riscoInline[k]} onChange={e=>mudarRisco(k,e.target.value)}/></label>)}</div></details>
 <details><summary style={{cursor:'pointer',padding:'8px 0'}}>4. Conclusão técnica</summary><div style={{display:'grid',gap:10,padding:'8px 0'}}>{campoRisco('conclusao_tecnica','Conclusão técnica')}{campoRisco('nivel_mitigacao','Nível de mitigação')}{campoRisco('classificacao_final','Classificação final')}</div></details>
 <details><summary style={{cursor:'pointer',padding:'8px 0'}}>5. Ações e consequências</summary><div style={{display:'grid',gap:10,padding:'8px 0'}}>{campoRisco('lesoes_agravos','Possíveis agravos')}{campoRisco('plano_acao','Plano de ação')}{campoRisco('responsavel_acao','Responsável')}<label style={{display:'grid',gap:5}}>Prazo<input type="date" style={campo} value={riscoInline.prazo} onChange={e=>mudarRisco('prazo',e.target.value)}/></label></div></details>
 <div style={{display:'flex',gap:10}}><button type="button" style={{...btn,background:'#2444a4'}} disabled={salvandoRisco} onClick={salvarRisco}>{salvandoRisco?'Salvando...':'Salvar risco'}</button><button type="button" style={{...btn,background:'#e5e7eb',color:'#0c2c4c'}} onClick={()=>setRiscoInline(null)}>Cancelar</button></div>
 </div>}
 {riscosFator.map(r=><div key={r.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,borderTop:'1px solid #cbd5e1',padding:'10px 0'}}><span><strong>{r.titulo}</strong> — {r.classificacao}</span><button type="button" style={btn} onClick={()=>editarRisco(r.id)} disabled={somenteLeitura}>{somenteLeitura?'Somente consulta':'Editar risco'}</button></div>)}
 </section>
     </section>
     <section style={{padding:12,background:'#f8fafc',borderRadius:8}}><label style={{display:'grid',gap:5,fontWeight:600}}>Observações gerais da avaliação<textarea disabled={somenteLeitura} style={campo} rows={3} value={observacoes} onChange={e=>setObservacoes(e.target.value)}/></label></section>
    </form>
    {acoes('rodape')}
   </section>}
  </main>
 </div>;
}
