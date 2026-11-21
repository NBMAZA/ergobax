'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';

export type CamposRiscoCompleto = {
 titulo:string; grupo_risco:string; perfil_exposicao:string; medidas_existentes:string;
 probabilidade:string; severidade:string; risco_puro:string; nivel_mitigacao:string;
 classificacao_final:string; conclusao_tecnica:string; lesoes_agravos:string;
 medidas_recomendadas:string; plano_acao:string; responsavel_acao:string;
 prazo:string; observacoes:string; classificacao:string; status:string;
};
export const riscoCompletoVazio:CamposRiscoCompleto={
 titulo:'',grupo_risco:'Ergonômicos',perfil_exposicao:'',medidas_existentes:'',
 probabilidade:'',severidade:'',risco_puro:'',nivel_mitigacao:'',
 classificacao_final:'',conclusao_tecnica:'',lesoes_agravos:'',
 medidas_recomendadas:'',plano_acao:'',responsavel_acao:'',prazo:'',
 observacoes:'',classificacao:'nao_classificado',status:'aberto'
};
const grupos=[
 {titulo:'Identificação e exposição',campos:[['titulo','Título'],['grupo_risco','Grupo de risco'],['perfil_exposicao','Perfil de exposição'],['medidas_existentes','Medidas existentes']]},
 {titulo:'Avaliação técnica',campos:[['probabilidade','Probabilidade'],['severidade','Severidade'],['risco_puro','Risco puro'],['nivel_mitigacao','Nível de mitigação']]},
 {titulo:'Conclusão e consequências',campos:[['classificacao_final','Classificação final'],['conclusao_tecnica','Conclusão técnica'],['lesoes_agravos','Lesões e agravos']]},
 {titulo:'Plano de ação',campos:[['medidas_recomendadas','Medidas recomendadas'],['plano_acao','Plano de ação'],['responsavel_acao','Responsável'],['prazo','Prazo'],['observacoes','Observações']]}
] as const;
const campo:CSSProperties={display:'grid',gap:5,fontSize:13,fontWeight:600};
const entrada:CSSProperties={width:'100%',boxSizing:'border-box',padding:9,border:'1px solid #cbd5e1',borderRadius:7};
export default function FormularioRiscoCompleto({valor,alterar,desabilitado=false}:{
 valor:CamposRiscoCompleto;alterar:(proximo:CamposRiscoCompleto)=>void;desabilitado?:boolean;
}){
 const [gravando,setGravando]=useState<keyof CamposRiscoCompleto|null>(null);
 const reconhecimento=useRef<{stop:()=>void}|null>(null);
 const valorRef=useRef(valor);const alterarRef=useRef(alterar);
 useEffect(()=>{valorRef.current=valor;alterarRef.current=alterar},[valor,alterar]);
 useEffect(()=>()=>{reconhecimento.current?.stop()},[]);
 const mudar=(chave:keyof CamposRiscoCompleto,v:string)=>alterar({...valor,[chave]:v});
 function ditar(chave:keyof CamposRiscoCompleto){
  if(gravando){reconhecimento.current?.stop();reconhecimento.current=null;setGravando(null);if(gravando===chave)return}
  const api=window as unknown as {SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any};
  const Speech=api.SpeechRecognition||api.webkitSpeechRecognition;
  if(!Speech){window.alert('Reconhecimento de voz indisponível neste navegador.');return}
  const rec=new Speech();rec.lang='pt-BR';rec.interimResults=false;
  rec.onresult=(evento:{results:{[n:number]:{[n:number]:{transcript:string}}}})=>{
   const transcricao=evento.results[0][0].transcript;
   const atual=valorRef.current;alterarRef.current({...atual,[chave]:[atual[chave],transcricao].filter(Boolean).join(' ')});
  };
  rec.onerror=()=>setGravando(null);rec.onend=()=>setGravando(null);
  reconhecimento.current=rec;setGravando(chave);try{rec.start()}catch{setGravando(null)}
 }
 function rotuloComMicrofone(chave:keyof CamposRiscoCompleto,nome:string){return <span style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}><span>{nome}</span><button type="button" aria-label={'Ditar '+nome} title={'Ditar '+nome} disabled={desabilitado} onClick={e=>{e.preventDefault();ditar(chave)}} style={{border:'1px solid #cbd5e1',borderRadius:6,padding:'4px 8px',background:'#eef4fa'}}>{gravando===chave?'■ Parar':'🎤'}</button></span>}

 return <div style={{display:'grid',gap:12}}>
 {grupos.map(grupo=><details key={grupo.titulo} open={grupo.titulo==='Identificação e exposição'} style={{border:'1px solid #cbd5e1',borderRadius:9,padding:12}}>
 <summary style={{cursor:'pointer',fontWeight:700}}>{grupo.titulo}</summary>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginTop:12}}>
 {grupo.campos.map(([chave,rotulo])=><label key={chave} style={campo}>{rotuloComMicrofone(chave,rotulo)}
 {(['probabilidade','severidade','risco_puro'].includes(chave))?
 <input style={entrada} type="number" min="0" step="any" disabled={desabilitado} value={valor[chave]} onChange={e=>mudar(chave,e.target.value)}/>:
 (['titulo','grupo_risco','nivel_mitigacao','responsavel_acao','prazo','classificacao_final'].includes(chave))?
 <input style={entrada} disabled={desabilitado} value={valor[chave]} onChange={e=>mudar(chave,e.target.value)}/>:
 <textarea style={entrada} rows={3} disabled={desabilitado} value={valor[chave]} onChange={e=>mudar(chave,e.target.value)}/>}
 </label>)}</div></details>)}
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
 <label style={campo}>Classificação<select style={entrada} disabled={desabilitado} value={valor.classificacao} onChange={e=>mudar('classificacao',e.target.value)}>{[['nao_classificado','Não classificado'],['baixo','Baixo'],['moderado','Moderado'],['alto','Alto'],['critico','Crítico']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <label style={campo}>Situação<select style={entrada} disabled={desabilitado} value={valor.status} onChange={e=>mudar('status',e.target.value)}>{[['aberto','Aberto'],['em_tratamento','Em tratamento'],['controlado','Controlado'],['encerrado','Encerrado']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 </div><small>A avaliação e a classificação são informadas pelo profissional; nenhum cálculo automático é aplicado.</small>
 </div>;
}
