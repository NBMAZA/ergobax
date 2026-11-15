'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../lib/supabase';
type Cargo={id:string;nome:string;codigo:string|null};
type Setor={id:string;nome:string};
type Vinculo={cargo_id:string;setor_id:string};
type Risco={id:string;avaliacao_bio_id:string|null;avaliacao_mobiliario_id:string|null;avaliacao_ambiental_id:string|null;avaliacao_iluminamento_id:string|null};
const fontes=[['avaliacao_bio_id','BIO'],['avaliacao_mobiliario_id','MOB'],['avaliacao_ambiental_id','AMB'],['avaliacao_iluminamento_id','Iluminamento']] as const;
export default function Laudos(){
 const [tipo,setTipo]=useState<'AEP'|'AET'>('AEP');const [gerando,setGerando]=useState(false);const [erroGeracao,setErroGeracao]=useState('');
 const [cliente,setCliente]=useState('');const [nome,setNome]=useState('');
 const [cargos,setCargos]=useState<Cargo[]>([]);const [setores,setSetores]=useState<Setor[]>([]);const [vinculos,setVinculos]=useState<Vinculo[]>([]);
 const [totalRiscos,setTotalRiscos]=useState(0);const [vigentes,setVigentes]=useState<Record<string,Set<string>>>({});const [riscosVigentes,setRiscosVigentes]=useState(0);const [pendencias,setPendencias]=useState<string[]>([]);const [erro,setErro]=useState('');const [carregando,setCarregando]=useState(true);
 useEffect(()=>{let ativo=true;async function carregar(){
 setCarregando(true);setErro('');setCargos([]);setSetores([]);setVinculos([]);setRiscosVigentes(0);setVigentes({});setPendencias([]);
 try{
 const db=supabase();const {data:{user}}=await db.auth.getUser();if(!user)throw Error('Entre no portal para acessar os laudos.');
 const {data:links,error:el}=await db.from('usuarios_consultoria').select('consultoria_id').eq('usuario_id',user.id).eq('ativo',true).limit(1);
 if(el)throw el;if(!links?.length)throw Error('Consultoria não identificada.');
 const consultoria=links[0].consultoria_id;
 const id=window.localStorage.getItem('portal-nr17:empresa-ativa:'+user.id+':'+consultoria)||'';
 if(!id)throw Error('Selecione um Cliente Ativo no painel para preparar o laudo.');
 const {data:empresa,error:ee}=await db.from('clientes').select('razao_social').eq('id',id).eq('consultoria_id',consultoria).single();if(ee)throw ee;
 const [rc,rs,rv,rr]=await Promise.all([
 db.from('cargos').select('id,nome,codigo').eq('cliente_id',id).eq('consultoria_id',consultoria).order('nome'),
 db.from('setores').select('id,nome').eq('cliente_id',id).eq('consultoria_id',consultoria).order('nome'),
 db.from('cargo_setores').select('cargo_id,setor_id').eq('cliente_id',id),
 db.from('riscos_identificados').select('id,avaliacao_bio_id,avaliacao_mobiliario_id,avaliacao_ambiental_id,avaliacao_iluminamento_id').eq('cliente_id',id)
 ]);
 for(const r of [rc,rs,rv,rr])if(r.error)throw r.error;
 const tabelas=[['BIO','avaliacoes_biomecanicas_bio'],['MOB','avaliacoes_mobiliario'],['AMB','avaliacoes_ambientais'],['Iluminamento','avaliacoes_iluminamento']] as const;
 const resultados=await Promise.all(tabelas.map(async ([chave,tabela])=>{const {data,error}=await db.from(tabela).select('id,estado_vigencia').eq('cliente_id',id);if(error)throw error;return [chave,data||[]] as const;}));
 const porFonte:Record<string,Set<string>>={};for(const [chave,avaliacoes] of resultados)porFonte[chave]=new Set(avaliacoes.filter(a=>String(a.estado_vigencia||'').toLowerCase()==='vigente').map(a=>a.id));
 const registros=(rr.data||[]) as Risco[];
 const atuais=registros.filter(r=>fontes.some(([campo,chave])=>r[campo]&&porFonte[chave]?.has(r[campo] as string)));
 const avisos:string[]=[];if(!(rc.data||[]).length)avisos.push('Não existem cargos cadastrados.');if(!(rs.data||[]).length)avisos.push('Não existem setores cadastrados.');if((rc.data||[]).some(c=>!(rv.data||[]).some(v=>v.cargo_id===c.id)))avisos.push('Existem cargos sem setor vinculado.');if(registros.length>atuais.length)avisos.push('Há riscos sem avaliação vigente confirmada, excluídos do total técnico.');
 if(ativo){setVigentes(porFonte);setRiscosVigentes(atuais.length);setPendencias(avisos);}
 if(ativo){setCliente(id);setNome(empresa.razao_social);setCargos(rc.data||[]);setSetores(rs.data||[]);setVinculos(rv.data||[]);setTotalRiscos(registros.length);}
 }catch(e){if(ativo)setErro(e instanceof Error?e.message:'Erro ao consultar dados.')}finally{if(ativo)setCarregando(false);}
 }
 void carregar();const atualizar=()=>void carregar();window.addEventListener('portal-nr17:empresa-ativa',atualizar);return()=>{ativo=false;window.removeEventListener('portal-nr17:empresa-ativa',atualizar)};
 },[]);
 async function gerar(){setGerando(true);setErroGeracao('');try{if(tipo!=='AEP')throw Error('A geração de AET ainda não está disponível.');const {data:{session}}=await supabase().auth.getSession();if(!session)throw Error('Sessão expirada.');const response=await fetch('/api/laudos/gerar',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({clienteId:cliente,tipo})});if(!response.ok){const data=await response.json();throw Error(data.error||'Falha na geração do Word.');}const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ERGOBAX_AEP_sugestao.docx';a.click();URL.revokeObjectURL(url);}catch(e){setErroGeracao(e instanceof Error?e.message:'Falha ao gerar documento.')}finally{setGerando(false);}}
 const semSetor=cargos.filter(c=>!vinculos.some(v=>v.cargo_id===c.id));
 return <><header className="ergobax-modulo-header" style={{padding:'6px 16px',minHeight:56}}><nav style={{minHeight:44,display:'flex',alignItems:'center',gap:12}}><span className="ergobax-modulo-marca"><img style={{maxHeight:42,width:'auto'}} src="/ergobax_logo_transparente.png" alt="ERGOBAX"/><strong>Laudos AEP e AET</strong></span><Link href="/" style={{marginLeft:'auto',padding:'8px 12px',borderRadius:8,background:'#eef4fa',color:'#15324d',fontWeight:600,textDecoration:'none'}}>← Voltar ao painel</Link></nav></header><main style={{maxWidth:1100,margin:'16px auto',padding:'0 20px 60px'}}>
 
 <h1>Laudos AEP e AET</h1><p>Preparação de sugestão de laudo consolidado por empresa. A versão técnica final será validada e enviada pela consultora.</p>
 <section style={{padding:20,border:'1px solid #cbd5e1',borderRadius:12,marginTop:18}}>
 <h2>Prévia da composição do laudo</h2>
 <label>Tipo de documento <select value={tipo} onChange={e=>setTipo(e.target.value as 'AEP'|'AET')} style={{marginLeft:12,padding:8}}><option value="AEP">AEP — Avaliação Ergonômica Preliminar</option><option value="AET">AET — Análise Ergonômica do Trabalho</option></select></label>
 {carregando?<p>Consultando dados da empresa...</p>:erro?<p role="alert" style={{color:'#b42318'}}>{erro}</p>:<>
 <h3 style={{marginTop:20}}>{nome}</h3><p><strong>{setores.length}</strong> setores · <strong>{cargos.length}</strong> cargos cadastrados · <strong>{riscosVigentes}</strong> riscos associados a avaliações vigentes · {totalRiscos} riscos cadastrados</p>
 <section style={{padding:14,background:'#eef7f4',border:'1px solid #b9d8cb',borderLeft:'4px solid #239b65',borderRadius:8,marginTop:14}}><strong>EMPRESA EM ANÁLISE</strong><div style={{fontSize:18,fontWeight:700}}>{nome}</div></section>
 <h3>Avaliações vigentes por módulo</h3><ul>{Object.entries(vigentes).map(([fonte,ids])=><li key={fonte}>{fonte}: <strong>{ids.size}</strong> avaliações vigentes</li>)}</ul>
 <h3>Pendências de cadastro</h3>{pendencias.length?<ul>{pendencias.map(p=><li key={p}>{p}</li>)}</ul>:<p>Nenhuma pendência cadastral básica identificada.</p>}
 <h3>Cargos por setor</h3>
 {setores.map(s=><section key={s.id} style={{marginTop:16,padding:14,background:'#f1f5f9',borderRadius:8}}><h4 style={{margin:0}}>Setor: {s.nome}</h4><ul>{cargos.filter(c=>vinculos.some(v=>v.cargo_id===c.id&&v.setor_id===s.id)).map(c=><li key={c.id}>{c.nome}{c.codigo?' — '+c.codigo:''}</li>)}</ul></section>)}
 {semSetor.length>0&&<section style={{marginTop:16,padding:14,background:'#fff7ed',borderRadius:8}}><h4>Cargos sem setor vinculado</h4><ul>{semSetor.map(c=><li key={c.id}>{c.nome}</li>)}</ul></section>}
 <p style={{marginTop:20}}><strong>Estrutura prevista:</strong> Identificação; Objetivo; Metodologia; Caracterização; Cargos e atividades; Avaliações; Riscos; Ausência de riscos; Recomendações; Plano de ação; Conclusão; Anexos.</p>
 <button type="button" onClick={gerar} disabled={gerando||tipo!=='AEP'} style={{padding:'11px 18px',borderRadius:8,background:'#176f5b',color:'white',fontWeight:700,border:0,cursor:'pointer'}}>{gerando?'Gerando Word...':tipo==='AEP'?'Gerar sugestão AEP em Word':'AET — geração em desenvolvimento'}</button>{erroGeracao&&<p role="alert" style={{color:'#b42318'}}>{erroGeracao}</p>}<p><strong>Modelo:</strong> padrão ERGOBAX, com identidade visual da consultoria. <Link href="/documentos/configuracao">Configuração de documentos</Link>.</p>
 <p style={{padding:12,background:'#eff6ff',borderRadius:8}}>Esta é uma prévia cadastral inicial. Esta prévia considera riscos vinculados a avaliações vigentes de BIO, MOB, AMB e Iluminamento. A cobertura de cada cargo, outras avaliações e a ausência comprovada de risco ainda exigem validação técnica. A sugestão de AEP em Word está disponível para revisão técnica; a geração de AET e o upload do laudo final ainda serão implementados. Nenhum documento técnico foi emitido.</p>
 </>}
 </section></main></>;
}
