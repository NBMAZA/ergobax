import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,TableOfContents,ImageRun,Header,Footer,PageNumber,BorderStyle,ShadingType,Table,TableRow,TableCell,WidthType,TableLayoutType} from 'docx';
export const runtime='nodejs';
const chapters=['Identificação da empresa e da consultoria','Demanda','Objetivos','Considerações legislativas, normativas e técnicas','Metodologia e etapas da avaliação','Caracterização da empresa','Quadro de setores, GHEE e funções analisadas','Descrição das atividades e condições de trabalho','Avaliações ergonômicas','Riscos ergonômicos identificados','Ausência de riscos — quando tecnicamente comprovada','Recomendações e medidas preventivas','Plano de ação','Conclusão técnica','Referências e anexos'];
const p=(value:string)=>new Paragraph({children:[new TextRun(value||'Não informado')],alignment:AlignmentType.JUSTIFIED,spacing:{after:160,line:260}});
const heading=(n:number,title:string)=>new Paragraph({text:n+'. '+title,heading:HeadingLevel.HEADING_1,spacing:{before:320,after:160},keepNext:true,border:{bottom:{color:'C7D8E8',style:BorderStyle.SINGLE,size:5}}});
export async function POST(req:NextRequest){
 try{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!publicKey||!secret)return NextResponse.json({error:'Configuração indisponível.'},{status:503});
 const token=req.headers.get('authorization');if(!token?.startsWith('Bearer '))return NextResponse.json({error:'Autenticação necessária.'},{status:401});
 const auth=createClient(url,publicKey,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token.slice(7));if(authError||!user)return NextResponse.json({error:'Sessão inválida.'},{status:401});
 const body=await req.json();const clienteId=body?.clienteId;
 if(body?.tipo!=='AEP'||typeof clienteId!=='string'||!/^[0-9a-f-]{36}$/i.test(clienteId))return NextResponse.json({error:'Informe uma empresa e selecione AEP.'},{status:400});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:links,error:linkError}=await db.from('usuarios_consultoria').select('consultoria_id').eq('usuario_id',user.id).eq('ativo',true);
 if(linkError)throw linkError;
 const ids=(links||[]).map(x=>x.consultoria_id);
 const {data:empresa,error:ee}=await db.from('clientes').select('id,consultoria_id,razao_social,cnpj,cidade,uf,logradouro,numero,bairro').eq('id',clienteId).in('consultoria_id',ids.length?ids:['00000000-0000-0000-0000-000000000000']).maybeSingle();
 if(ee)throw ee;if(!empresa)return NextResponse.json({error:'Empresa não autorizada.'},{status:403});
 const consultoriaId=empresa.consultoria_id;
 const [co,ca,se,vi,ri,fa,...av]=await Promise.all([
 db.from('consultorias').select('razao_social,nome_fantasia,logo_path').eq('id',consultoriaId).single(),
 db.from('cargos').select('id,nome,codigo,descricao_atribuicoes,jornada_inicio,jornada_fim').eq('cliente_id',clienteId).eq('consultoria_id',consultoriaId).order('nome'),
 db.from('setores').select('id,nome').eq('cliente_id',clienteId).eq('consultoria_id',consultoriaId).order('nome'),
 db.from('cargo_setores').select('cargo_id,setor_id').eq('cliente_id',clienteId),
 db.from('riscos_identificados').select('id,titulo,descricao,classificacao_final,medidas_recomendadas,plano_acao,cargo_id,fator_catalogo_id,avaliacao_bio_id,avaliacao_mobiliario_id,avaliacao_ambiental_id,avaliacao_iluminamento_id').eq('cliente_id',clienteId),
 db.from('catalogo_fatores_risco').select('id,codigo,grupo,fator').eq('ativo',true).or('consultoria_id.is.null,consultoria_id.eq.'+consultoriaId).order('codigo'),
 ...(['avaliacoes_biomecanicas_bio','avaliacoes_mobiliario','avaliacoes_ambientais','avaliacoes_iluminamento'] as const).map(table=>db.from(table).select('id,estado_vigencia').eq('cliente_id',clienteId))
 ]);
 for(const result of [co,ca,se,vi,ri,fa,...av])if(result.error)throw result.error;
 const cargos=ca.data||[],setores=se.data||[],vinculos=vi.data||[];
 const fields=['avaliacao_bio_id','avaliacao_mobiliario_id','avaliacao_ambiental_id','avaliacao_iluminamento_id'] as const;
 const vigentes=av.map(result=>new Set((result.data||[]).filter(a=>String(a.estado_vigencia||'').toLowerCase()==='vigente').map(a=>a.id)));
 const riscos=(ri.data||[]).filter(r=>fields.some((field,i)=>r[field]&&vigentes[i].has(r[field] as string)));
 const fatores=Array.from(new Map((fa.data||[]).map(f=>[f.codigo,f])).values());
 const matrizPorCargo=()=>{const linhas:string[][]=[['Cargo','Código / fator ergonômico','Situação técnica']];for(const cargo of cargos){for(const fator of fatores){const identificados=riscos.filter(r=>r.cargo_id===cargo.id&&r.fator_catalogo_id===fator.id);linhas.push([cargo.nome,fator.codigo+' — '+fator.fator,identificados.length?'Risco identificado — '+identificados.map(r=>r.classificacao_final||'Classificação pendente').join('; '):'Ausência não confirmada — avaliação/conclusão pendente']);}}if(!fatores.length)linhas.push(['Todos os cargos','Catálogo não disponível','Não foi possível determinar fatores']);if(!cargos.length)linhas.push(['Nenhum cargo cadastrado','—','Cadastro pendente']);return linhas;};
 const consultoria=co.data;
 const sections:(Paragraph|TableOfContents|Table)[]=[];
 const add=(n:number,paragraphs:string[])=>{sections.push(heading(n,chapters[n-1]));paragraphs.forEach(t=>sections.push(p(t)));};
 add(1,[empresa.razao_social,'CNPJ: '+(empresa.cnpj||'Não informado'),'Endereço: '+[empresa.logradouro,empresa.numero,empresa.bairro,empresa.cidade,empresa.uf].filter(Boolean).join(', '),'Consultoria responsável: '+(consultoria?.nome_fantasia||consultoria?.razao_social||'Não informada')]);
 add(2,['Esta AEP foi solicitada para atendimento à NR-17, que estabelece diretrizes e requisitos para adaptar as condições de trabalho às características psicofisiológicas dos trabalhadores, visando conforto, segurança, saúde e desempenho eficiente.','Motivo específico da demanda: [PREENCHER E VALIDAR PELA CONSULTORA].']);
 add(3,['A Avaliação Ergonômica Preliminar busca identificar e avaliar situações de trabalho e fatores de risco ergonômico, oferecendo subsídios para medidas preventivas e corretivas.','A avaliação contempla, conforme aplicável, postos, funções, tarefas e atividades, incluindo aspectos mobiliários, posturais, organizacionais, ambientais e cognitivos.','Os resultados podem subsidiar a gestão de riscos ocupacionais (GRO/PGR) e contribuir para o planejamento de ações relacionadas ao PCMSO. O escopo deve ser confirmado pela consultora.']);
 add(4,['Referências a verificar quanto à edição vigente e à aplicabilidade efetiva: Lei nº 6.514/1977; Portaria nº 3.214/1978; NR-1; NR-17.','Referências técnicas candidatas, somente quando efetivamente empregadas: ABNT NBR 13966 (mesas de escritório), ABNT NBR 13962 (cadeiras de escritório), NHO-11 (iluminamento), ABNT NBR ISO 11226 (posturas estáticas), ISO 11228-1 (levantamento e transporte), ISO 11228-2 (empurrar e puxar), ISO 11228-3 (tarefas repetitivas) e método NIOSH.','[VALIDAÇÃO OBRIGATÓRIA] Selecionar apenas normas, edições e métodos realmente utilizados; conferir referências e vigência antes da emissão final.']);
 sections.push(heading(5,chapters[4]));
 sections.push(p('As etapas abaixo representam o roteiro metodológico proposto; a execução efetiva de cada atividade deve ser confirmada.'));
 const tabela=(rows:string[][])=>new Table({width:{size:100,type:WidthType.PERCENTAGE},layout:TableLayoutType.FIXED,rows:rows.map((cells,i)=>new TableRow({children:cells.map(value=>new TableCell({shading:{fill:i===0?'DCEAF5':i%2===0?'F3F7FA':'FFFFFF'},margins:{top:100,bottom:100,left:110,right:110},children:[new Paragraph({children:[new TextRun({text:value,bold:i===0,font:'Verdana',size:16,color:i===0?'134068':'263445'})],spacing:{after:60}})]}))}))});
 sections.push(tabela([['Fase','Atividades previstas'],['1 — Coleta','Visitas e inspeções, entrevistas, registros de atividades, jornadas, pausas e queixas, conforme efetivamente realizados.'],['2 — Avaliação','Identificação e análise de fatores biomecânicos, ambientais, organizacionais, cognitivos e outros pertinentes.'],['3 — Documento','Diagnósticos, riscos, recomendações, plano de ação, conclusões e referências.']]));
 sections.push(p('Data(s) de visita: [INFORMAR]. Acompanhante(s) e função(ões): [INFORMAR]. Entrevistas, fotos e vídeos: [CONFIRMAR EXECUÇÃO].'));
 add(6,['Setores cadastrados: '+setores.length+'. Cargos cadastrados: '+cargos.length+'.','Caracterização das instalações, processos e organização: [COMPLEMENTAR COM DADOS VERIFICADOS].']);
 sections.push(heading(7,chapters[6]));
 sections.push(p('GHEE/unidade operacional depende de cadastro ou validação técnica; não é inferido automaticamente a partir do setor.'));
 const linhas=[['Unidade operacional / GHEE','Setor','Função / Cargo']];
 for(const setor of setores){const cs=cargos.filter(c=>vinculos.some(v=>v.setor_id===setor.id&&v.cargo_id===c.id));if(!cs.length)linhas.push(['A definir',setor.nome,'Nenhum cargo vinculado']);for(const c of cs)linhas.push(['A definir',setor.nome,c.nome+(c.codigo?' ('+c.codigo+')':'')]);}
 const semSetor=cargos.filter(c=>!vinculos.some(v=>v.cargo_id===c.id));for(const c of semSetor)linhas.push(['A definir','Sem setor vinculado',c.nome+(c.codigo?' ('+c.codigo+')':'')]);
 if(linhas.length===1)linhas.push(['A definir','Não cadastrado','Não cadastrado']);
 sections.push(tabela(linhas));
 sections.push(heading(8,chapters[7]));
 for(const setor of setores){sections.push(new Paragraph({text:'Setor: '+setor.nome,heading:HeadingLevel.HEADING_2}));const cs=cargos.filter(c=>vinculos.some(v=>v.setor_id===setor.id&&v.cargo_id===c.id));if(!cs.length)sections.push(p('Nenhum cargo vinculado.'));for(const c of cs)sections.push(p('Cargo: '+c.nome+(c.codigo?' ('+c.codigo+')':'')+' — Atividades cadastradas: '+(c.descricao_atribuicoes||'Não descritas. Revisar atividade prescrita e real, jornadas e pausas.')));}
 for(const c of semSetor)sections.push(p('Cargo sem setor vinculado: '+c.nome+' — Conferir atividades e situação de avaliação.'));
 add(9,['Avaliações vigentes recuperadas: '+vigentes.map((set,i)=>['BIO','MOB','AMB','Iluminamento'][i]+': '+set.size).join('; ')+'.','A cobertura técnica por cargo, posto e estação ainda exige conferência individual. Cargo sem risco associado não significa ausência de risco.']);
 sections.push(heading(10,chapters[9]));
 if(!riscos.length)sections.push(p('Nenhum risco vinculado a avaliação vigente foi recuperado. Isso não comprova ausência de risco.'));
 for(const r of riscos)sections.push(p('Risco: '+(r.titulo||'Sem título')+' | Classificação: '+(r.classificacao_final||'Pendente')+' | Descrição: '+(r.descricao||'Pendente')));
 sections.push(heading(11,chapters[10]));sections.push(p('Todos os cargos e fatores ativos do catálogo são relacionados. Sem confirmação técnica registrada, a ausência de risco permanece pendente e não pode ser afirmada.'));sections.push(tabela(matrizPorCargo()));
 sections.push(heading(12,chapters[11]));if(!riscos.length)sections.push(p('Recomendações pendentes de avaliação técnica.'));for(const r of riscos)if(r.medidas_recomendadas)sections.push(p((r.titulo||'Risco')+': '+r.medidas_recomendadas));
 sections.push(heading(13,chapters[12]));if(!riscos.length)sections.push(p('Plano de ação pendente.'));for(const r of riscos)if(r.plano_acao)sections.push(p((r.titulo||'Risco')+': '+r.plano_acao));
 add(14,['Conclusão técnica pendente de elaboração, conferência e aprovação pela consultora. Este arquivo não é um laudo final.']);
 add(15,['Referências efetivamente utilizadas: [CONFERIR E PREENCHER].','Fotografias, medições, entrevistas e demais documentos de apoio: [ANEXAR APÓS CONFERÊNCIA].']);
 let logo:Uint8Array|null=null;
 if(consultoria?.logo_path){const download=await db.storage.from('logos-empresas').download(consultoria.logo_path);if(!download.error&&download.data){const bytes=new Uint8Array(await download.data.arrayBuffer());const mime=download.data.type;if(bytes.length<2000000&&(mime==='image/png'||mime==='image/jpeg'))logo=bytes;}}
 const nomeConsultoria=consultoria?.nome_fantasia||consultoria?.razao_social||'Consultoria responsável';
 const imagem=()=>logo?new ImageRun({data:logo,transformation:{width:105,height:44},type:logo[0]===0x89?'png':'jpg'}):null;
 const cabecalho:Paragraph[]=[];
 const logoCabecalho=imagem();
 if(logoCabecalho)cabecalho.push(new Paragraph({children:[logoCabecalho],alignment:AlignmentType.LEFT,spacing:{after:60}}));
 cabecalho.push(new Paragraph({children:[new TextRun({text:nomeConsultoria,font:'Verdana',bold:true,color:'173B65',size:16}),new TextRun({text:'   |   AEP — Avaliação Ergonômica Preliminar',font:'Verdana',color:'64748B',size:16})],border:{bottom:{color:'B9D8CB',style:BorderStyle.SINGLE,size:8}},spacing:{after:100}}));
 const cover:Paragraph[]=[
 new Paragraph({text:'RELATÓRIO TÉCNICO ERGONÔMICO',alignment:AlignmentType.CENTER,spacing:{before:650,after:240},run:{font:'Verdana',color:'176F5B',bold:true,size:22}}),
 new Paragraph({text:'AEP',alignment:AlignmentType.CENTER,spacing:{before:350,after:100},run:{font:'Verdana',color:'173B65',bold:true,size:64}}),
 new Paragraph({text:'AVALIAÇÃO ERGONÔMICA PRELIMINAR',alignment:AlignmentType.CENTER,spacing:{after:520},run:{font:'Verdana',color:'173B65',bold:true,size:28}}),
 new Paragraph({text:'EMPRESA AVALIADA',alignment:AlignmentType.CENTER,spacing:{after:160},run:{font:'Verdana',color:'64748B',bold:true,size:18}}),
 new Paragraph({text:empresa.razao_social,alignment:AlignmentType.CENTER,spacing:{after:650},run:{font:'Verdana',color:'173B65',bold:true,size:30}}),
 new Paragraph({text:'Consultoria responsável',alignment:AlignmentType.CENTER,spacing:{after:90},run:{font:'Verdana',color:'64748B',size:18}}),
 new Paragraph({text:nomeConsultoria,alignment:AlignmentType.CENTER,spacing:{after:400},run:{font:'Verdana',bold:true,size:22}}),
 new Paragraph({text:'Emissão da sugestão: '+new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'America/Sao_Paulo'}).format(new Date()),alignment:AlignmentType.CENTER,spacing:{after:550}}),
 new Paragraph({children:[new TextRun({font:'Verdana',text:'SUGESTÃO PRELIMINAR — NÃO CONSTITUI LAUDO FINAL APROVADO',bold:true,color:'9A3412',size:18})],alignment:AlignmentType.CENTER,shading:{type:ShadingType.CLEAR,fill:'FFF7ED'},spacing:{before:160,after:240}})
 ];
 const doc=new Document({features:{updateFields:true},styles:{default:{document:{run:{font:'Verdana',size:16,color:'263445'},paragraph:{spacing:{after:160,line:260}}},heading1:{run:{font:'Verdana',size:18,bold:true,color:'134068'},paragraph:{spacing:{before:320,after:160},keepNext:true}},heading2:{run:{font:'Verdana',size:16,bold:true,color:'4F81BD'},paragraph:{indent:{left:360},spacing:{before:180,after:100},keepNext:true}},title:{run:{font:'Verdana',size:22,bold:true,color:'17365D'}}}},sections:[{properties:{titlePage:false,page:{margin:{top:1440,bottom:1440,left:1800,right:1800}}},headers:{default:new Header({children:cabecalho})},footers:{default:new Footer({children:[new Paragraph({children:[new TextRun({text:'ERGOBAX · Sugestão preliminar · Página ',font:'Verdana',size:16}),new TextRun({children:[PageNumber.CURRENT]})],alignment:AlignmentType.RIGHT})]})},children:[...cover,new Paragraph({pageBreakBefore:true,text:'ÍNDICE',heading:HeadingLevel.TITLE}),new TableOfContents('Sumário',{hyperlink:true,headingStyleRange:'1-2'}),new Paragraph({text:'No Word, atualize o índice para recalcular as páginas.',spacing:{after:240}}),new Paragraph({pageBreakBefore:true,text:'CONTEÚDO TÉCNICO',heading:HeadingLevel.TITLE}),...sections]}]});
 const buffer=await Packer.toBuffer(doc);
 return new NextResponse(new Uint8Array(buffer),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment; filename="ERGOBAX_AEP_sugestao.docx"','Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erro ao gerar sugestão.'},{status:500});}
}
