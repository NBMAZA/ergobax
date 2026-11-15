'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../lib/supabase';
type Cargo={id:string;nome:string;codigo:string|null};
type Setor={id:string;nome:string};
type Vinculo={cargo_id:string;setor_id:string};
export default function Laudos(){
 const [tipo,setTipo]=useState<'AEP'|'AET'>('AEP');
 const [cliente,setCliente]=useState('');const [nome,setNome]=useState('');
 const [cargos,setCargos]=useState<Cargo[]>([]);const [setores,setSetores]=useState<Setor[]>([]);const [vinculos,setVinculos]=useState<Vinculo[]>([]);
 const [totalRiscos,setTotalRiscos]=useState(0);const [erro,setErro]=useState('');const [carregando,setCarregando]=useState(true);
 useEffect(()=>{let ativo=true;async function carregar(){
 setCarregando(true);setErro('');
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
 db.from('riscos_identificados').select('id',{count:'exact',head:true}).eq('cliente_id',id)
 ]);
 for(const r of [rc,rs,rv,rr])if(r.error)throw r.error;
 if(ativo){setCliente(id);setNome(empresa.razao_social);setCargos(rc.data||[]);setSetores(rs.data||[]);setVinculos(rv.data||[]);setTotalRiscos(rr.count||0);}
 }catch(e){if(ativo)setErro(e instanceof Error?e.message:'Erro ao consultar dados.')}finally{if(ativo)setCarregando(false);}
 }
 void carregar();const atualizar=()=>void carregar();window.addEventListener('portal-nr17:empresa-ativa',atualizar);return()=>{ativo=false;window.removeEventListener('portal-nr17:empresa-ativa',atualizar)};
 },[]);
 const semSetor=cargos.filter(c=>!vinculos.some(v=>v.cargo_id===c.id));
 return <main style={{maxWidth:1100,margin:'32px auto',padding:'0 20px 60px'}}>
 <p><Link href="/">← Voltar ao painel da consultoria</Link></p>
 <h1>Laudos AEP e AET</h1><p>Preparação de sugestão de laudo consolidado por empresa. A versão técnica final será validada e enviada pela consultora.</p>
 <section style={{padding:20,border:'1px solid #cbd5e1',borderRadius:12,marginTop:18}}>
 <h2>Prévia da composição do laudo</h2>
 <label>Tipo de documento <select value={tipo} onChange={e=>setTipo(e.target.value as 'AEP'|'AET')} style={{marginLeft:12,padding:8}}><option value="AEP">AEP — Avaliação Ergonômica Preliminar</option><option value="AET">AET — Análise Ergonômica do Trabalho</option></select></label>
 {carregando?<p>Consultando dados da empresa...</p>:erro?<p role="alert" style={{color:'#b42318'}}>{erro}</p>:<>
 <h3 style={{marginTop:20}}>{nome}</h3><p><strong>{setores.length}</strong> setores · <strong>{cargos.length}</strong> cargos cadastrados · <strong>{totalRiscos}</strong> riscos registrados (sem filtro de vigência nesta prévia)</p>
 {setores.map(s=><section key={s.id} style={{marginTop:16,padding:14,background:'#f1f5f9',borderRadius:8}}><h4 style={{margin:0}}>Setor: {s.nome}</h4><ul>{cargos.filter(c=>vinculos.some(v=>v.cargo_id===c.id&&v.setor_id===s.id)).map(c=><li key={c.id}>{c.nome}{c.codigo?' — '+c.codigo:''}</li>)}</ul></section>)}
 {semSetor.length>0&&<section style={{marginTop:16,padding:14,background:'#fff7ed',borderRadius:8}}><h4>Cargos sem setor vinculado</h4><ul>{semSetor.map(c=><li key={c.id}>{c.nome}</li>)}</ul></section>}
 <p style={{marginTop:20}}><strong>Estrutura prevista:</strong> Identificação; Objetivo; Metodologia; Caracterização; Cargos e atividades; Avaliações; Riscos; Ausência de riscos; Recomendações; Plano de ação; Conclusão; Anexos.</p>
 <p><strong>Modelo:</strong> padrão ERGOBAX, com identidade visual da consultoria. <Link href="/documentos/configuracao">Configuração de documentos</Link>.</p>
 <p style={{padding:12,background:'#eff6ff',borderRadius:8}}>Esta é uma prévia cadastral inicial. A recuperação das avaliações vigentes, a geração do Word e o upload do laudo final ainda serão implementados. Nenhum documento técnico foi emitido.</p>
 </>}
 </section></main>;
}
