import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,TableOfContents,ImageRun,Header,Footer,PageNumber,BorderStyle,ShadingType,Table,TableRow,TableCell,WidthType} from 'docx';
export const runtime='nodejs';
const chapters=['Identificação da empresa e do avaliador','Demanda','Objetivos da avaliação','Referências legislativas, normativas e técnicas','Metodologia','Caracterização da empresa','Organização do trabalho','Situações de trabalho analisadas','Análise biomecânica','Mobiliário e equipamentos','Condições ambientais','Aspectos cognitivos e organizacionais','Diagnóstico ergonômico e critérios de priorização','Inventário de riscos ergonômicos','Recomendações e melhorias','Plano de ação','Conclusão e encerramento','Referências e anexos'];
const p=(value:string)=>new Paragraph({children:[new TextRun(value||'Não informado')],spacing:{after:140}});
const heading=(n:number,title:string)=>new Paragraph({text:n+'. '+title,heading:HeadingLevel.HEADING_1,spacing:{before:260,after:140}});
export async function POST(req:NextRequest){
 try{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!publicKey||!secret)return NextResponse.json({error:'Configuração indisponível.'},{status:503});
 const token=req.headers.get('authorization');if(!token?.startsWith('Bearer '))return NextResponse.json({error:'Autenticação necessária.'},{status:401});
 const auth=createClient(url,publicKey,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token.slice(7));if(authError||!user)return NextResponse.json({error:'Sessão inválida.'},{status:401});
 const body=await req.json();const clienteId=body?.clienteId;
 if(body?.tipo!=='AET'||typeof clienteId!=='string'||!/^[0-9a-f-]{36}$/i.test(clienteId))return NextResponse.json({error:'Informe uma empresa e selecione AET.'},{status:400});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:links,error:linkError}=await db.from('usuarios_consultoria').select('consultoria_id').eq('usuario_id',user.id).eq('ativo',true);
 if(linkError)throw linkError;
 const ids=(links||[]).map(x=>x.consultoria_id);
 const {data:empresa,error:ee}=await db.from('clientes').select('id,consultoria_id,razao_social,cnpj,cidade,uf,logradouro,numero,bairro').eq('id',clienteId).in('consultoria_id',ids.length?ids:['00000000-0000-0000-0000-000000000000']).maybeSingle();
 if(ee)throw ee;if(!empresa)return NextResponse.json({error:'Empresa não autorizada.'},{status:403});
 const consultoriaId=empresa.consultoria_id;
 const [co,ca,se,vi,ri,...av]=await Promise.all([
 db.from('consultorias').select('razao_social,nome_fantasia,logo_path').eq('id',consultoriaId).single(),
 db.from('cargos').select('id,nome,codigo,descricao_atribuicoes,jornada_inicio,jornada_fim').eq('cliente_id',clienteId).eq('consultoria_id',consultoriaId).order('nome'),
 db.from('setores').select('id,nome').eq('cliente_id',clienteId).eq('consultoria_id',consultoriaId).order('nome'),
 db.from('cargo_setores').select('cargo_id,setor_id').eq('cliente_id',clienteId),
 db.from('riscos_identificados').select('id,titulo,descricao,classificacao_final,medidas_recomendadas,plano_acao,cargo_id,avaliacao_bio_id,avaliacao_mobiliario_id,avaliacao_ambiental_id,avaliacao_iluminamento_id').eq('cliente_id',clienteId),
 ...(['avaliacoes_biomecanicas_bio','avaliacoes_mobiliario','avaliacoes_ambientais','avaliacoes_iluminamento'] as const).map(table=>db.from(table).select('id,estado_vigencia').eq('cliente_id',clienteId))
 ]);
 for(const result of [co,ca,se,vi,ri,...av])if(result.error)throw result.error;
 const cargos=ca.data||[],setores=se.data||[],vinculos=vi.data||[];
 const fields=['avaliacao_bio_id','avaliacao_mobiliario_id','avaliacao_ambiental_id','avaliacao_iluminamento_id'] as const;
 const vigentes=av.map(result=>new Set((result.data||[]).filter(a=>String(a.estado_vigencia||'').toLowerCase()==='vigente').map(a=>a.id)));
 const riscos=(ri.data||[]).filter(r=>fields.some((field,i)=>r[field]&&vigentes[i].has(r[field] as string)));
 const consultoria=co.data;
 const sections:(Paragraph|TableOfContents|Table)[]=[];
 const add=(n:number,items:string[])=>{sections.push(heading(n,chapters[n-1]));items.forEach(x=>sections.push(p(x)));};
 const subt=(n:number,label:string)=>sections.push(new Paragraph({text:n+'. '+label,heading:HeadingLevel.HEADING_2,indent:{left:360},spacing:{before:150,after:100}}));
 const tabela=(rows:string[][])=>new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:rows.map((cells,i)=>new TableRow({children:cells.map(value=>new TableCell({children:[new Paragraph({children:[new TextRun({text:value,bold:i===0,font:'Verdana',size:16})]})]}))}))});
 add(1,[empresa.razao_social,'CNPJ: '+(empresa.cnpj||'Não informado'),'Endereço: '+[empresa.logradouro,empresa.numero,empresa.bairro,empresa.cidade,empresa.uf].filter(Boolean).join(', '),'Consultoria: '+(consultoria?.nome_fantasia||consultoria?.razao_social||'Não informada'),'Avaliador e registro profissional: [PREENCHER E VALIDAR].']);
 add(2,['Demanda específica: [PREENCHER]. Exemplo do modelo técnico: atendimento à legislação e melhoria das condições de trabalho. Confirmar a demanda efetiva desta empresa.']);
 add(3,['Identificar, analisar e classificar fatores de risco ergonômico nas atividades avaliadas, considerando gravidade e medidas de controle, conforme escopo validado pela consultora.']);
 add(4,['Selecionar somente as referências efetivamente utilizadas, verificando edição e vigência: NR-1, NR-17, NHO-11, normas ABNT/ISO aplicáveis e métodos RULA, NIOSH, KIM, NASA-TLX e OCRA, quando utilizados.','Não presumir aplicação de método ou norma a partir da simples existência do cadastro.']);
 add(5,['Métodos, instrumentos, observações e entrevistas efetivamente realizados: [PREENCHER]. Datas de visita, participantes e evidências: [PREENCHER].']);
 add(6,['Setores cadastrados: '+setores.length+'. Cargos cadastrados: '+cargos.length+'.','Processos, instalações e unidades operacionais: [COMPLEMENTAR].']);
 sections.push(heading(7,chapters[6]));sections.push(tabela([['Setor','Cargo / função','GHEE / unidade'],...setores.flatMap(setor=>cargos.filter(c=>vinculos.some(v=>v.setor_id===setor.id&&v.cargo_id===c.id)).map(c=>[setor.nome,c.nome,'A validar'])),...cargos.filter(c=>!vinculos.some(v=>v.cargo_id===c.id)).map(c=>['Sem setor',c.nome,'A validar'])]));sections.push(p('Jornadas, turnos, pausas, ritmo e organização: [CONFERIR DADOS E COMPLEMENTAR].'));
 sections.push(heading(8,chapters[7]));
 for(const setor of setores){subt(8,'Setor — '+setor.nome);const cs=cargos.filter(c=>vinculos.some(v=>v.setor_id===setor.id&&v.cargo_id===c.id));if(!cs.length)sections.push(p('Sem cargos vinculados.'));for(const c of cs){subt(8,'Cargo — '+c.nome);sections.push(p('Atividades cadastradas: '+(c.descricao_atribuicoes||'Não descritas.')));sections.push(p('Atividade real, posto/estação, observações, entrevistas e registros fotográficos: [PENDENTE DE VALIDAÇÃO].'));}}
 for(const c of cargos.filter(c=>!vinculos.some(v=>v.cargo_id===c.id)))sections.push(p('Cargo sem setor: '+c.nome+' — situação de avaliação a confirmar.'));
 add(9,['Análises biomecânicas vigentes recuperadas: '+vigentes[0].size+'. Resultados de métodos, parâmetros e evidências: [DETALHAR E VALIDAR].']);
 add(10,['Avaliações vigentes de mobiliário: '+vigentes[1].size+'. Condições de equipamentos e recomendações específicas: [VALIDAR].']);
 add(11,['Avaliações ambientais vigentes: '+vigentes[2].size+'. Iluminamento vigente: '+vigentes[3].size+'. Medições, instrumentos e certificados: [CONFERIR E ANEXAR].']);
 add(12,['Exigências cognitivas, psicossociais e organização do trabalho: [PREENCHER SOMENTE COM BASE NAS AVALIAÇÕES REALIZADAS].']);
 sections.push(heading(13,chapters[12]));sections.push(p('O modelo de referência da consultora apresenta inventário de riscos e nível de priorização (NP), incluindo probabilidade, severidade, mitigação e risco final. A aplicação automática dessa matriz ainda depende da homologação de critérios e dados de entrada.'));sections.push(tabela([['Critério','Situação no documento'],['Probabilidade e exposição','A validar conforme metodologia aprovada'],['Severidade','A validar conforme metodologia aprovada'],['Controles e mitigação','A validar conforme evidências'],['Classificação final e prioridade','Não recalculada automaticamente nesta versão']]));
 sections.push(heading(14,chapters[13]));sections.push(p('Riscos abaixo associados a avaliações vigentes. A inexistência de registros não comprova ausência de riscos.'));if(!riscos.length)sections.push(p('Nenhum risco vinculado a avaliação vigente recuperado.'));for(const r of riscos)sections.push(p('Risco: '+(r.titulo||'Sem título')+' | Classificação cadastrada: '+(r.classificacao_final||'Não informada')+' | Descrição: '+(r.descricao||'Pendente')));
 sections.push(heading(15,chapters[14]));if(!riscos.some(r=>r.medidas_recomendadas))sections.push(p('Recomendações específicas pendentes de avaliação técnica.'));for(const r of riscos)if(r.medidas_recomendadas)sections.push(p((r.titulo||'Risco')+': '+r.medidas_recomendadas));sections.push(p('Orientações gerais somente quando pertinentes e aprovadas pelo responsável técnico.'));
 sections.push(heading(16,chapters[15]));if(!riscos.some(r=>r.plano_acao))sections.push(p('Plano de ação pendente de detalhamento.'));for(const r of riscos)if(r.plano_acao)sections.push(p((r.titulo||'Risco')+': '+r.plano_acao));
 add(17,['Conclusão técnica, encaminhamentos, identificação e assinatura do responsável: [PENDENTE DE REVISÃO E APROVAÇÃO]. Não atribuir validade ou assinatura automaticamente.']);
 add(18,['Referências efetivamente utilizadas: [CONFERIR].','Anexos, fotografias, medições e certificados de calibração: [ANEXAR DOCUMENTOS PERTINENTES].']);
 let logo:Uint8Array|null=null;
 if(consultoria?.logo_path){const download=await db.storage.from('logos-empresas').download(consultoria.logo_path);if(!download.error&&download.data){const bytes=new Uint8Array(await download.data.arrayBuffer());const mime=download.data.type;if(bytes.length<2000000&&(mime==='image/png'||mime==='image/jpeg'))logo=bytes;}}
 const nomeConsultoria=consultoria?.nome_fantasia||consultoria?.razao_social||'Consultoria responsável';
 const imagem=()=>logo?new ImageRun({data:logo,transformation:{width:105,height:44},type:logo[0]===0x89?'png':'jpg'}):null;
 const cabecalho:Paragraph[]=[];
 const logoCabecalho=imagem();
 if(logoCabecalho)cabecalho.push(new Paragraph({children:[logoCabecalho],alignment:AlignmentType.LEFT,spacing:{after:60}}));
 cabecalho.push(new Paragraph({children:[new TextRun({text:nomeConsultoria,font:'Verdana',bold:true,color:'173B65',size:16}),new TextRun({text:'   |   AET — Análise Ergonômica do Trabalho',font:'Verdana',color:'64748B',size:16})],border:{bottom:{color:'B9D8CB',style:BorderStyle.SINGLE,size:8}},spacing:{after:100}}));
 const cover:Paragraph[]=[
 new Paragraph({text:'RELATÓRIO TÉCNICO ERGONÔMICO',alignment:AlignmentType.CENTER,spacing:{before:1100,after:240},run:{font:'Verdana',color:'176F5B',bold:true,size:22}}),
 new Paragraph({text:'AET',alignment:AlignmentType.CENTER,spacing:{before:350,after:100},run:{font:'Verdana',color:'173B65',bold:true,size:64}}),
 new Paragraph({text:'ANÁLISE ERGONÔMICA DO TRABALHO',alignment:AlignmentType.CENTER,spacing:{after:750},run:{font:'Verdana',color:'173B65',bold:true,size:28}}),
 new Paragraph({text:'EMPRESA AVALIADA',alignment:AlignmentType.CENTER,spacing:{after:160},run:{font:'Verdana',color:'64748B',bold:true,size:18}}),
 new Paragraph({text:empresa.razao_social,alignment:AlignmentType.CENTER,spacing:{after:650},run:{font:'Verdana',color:'173B65',bold:true,size:30}}),
 new Paragraph({text:'Consultoria responsável',alignment:AlignmentType.CENTER,spacing:{after:90},run:{font:'Verdana',color:'64748B',size:18}}),
 new Paragraph({text:nomeConsultoria,alignment:AlignmentType.CENTER,spacing:{after:400},run:{font:'Verdana',bold:true,size:22}}),
 new Paragraph({text:'Emissão da sugestão: '+new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'America/Sao_Paulo'}).format(new Date()),alignment:AlignmentType.CENTER,spacing:{after:550}}),
 new Paragraph({children:[new TextRun({font:'Verdana',text:'SUGESTÃO PRELIMINAR — NÃO CONSTITUI LAUDO FINAL APROVADO',bold:true,color:'9A3412',size:18})],alignment:AlignmentType.CENTER,shading:{type:ShadingType.CLEAR,fill:'FFF7ED'},spacing:{before:160,after:240}})
 ];
 const doc=new Document({features:{updateFields:true},styles:{default:{document:{run:{font:'Verdana',size:16}},heading1:{run:{font:'Verdana',size:18,bold:true,color:'173B65'}},heading2:{run:{font:'Verdana',size:16,bold:true,color:'176F5B'}},title:{run:{font:'Verdana',size:16,bold:true,color:'173B65'}}}},sections:[{properties:{titlePage:false,page:{margin:{top:1700,bottom:1100,left:1100,right:1100}}},headers:{default:new Header({children:cabecalho})},footers:{default:new Footer({children:[new Paragraph({children:[new TextRun({text:'ERGOBAX · Sugestão preliminar · Página ',font:'Verdana',size:16}),new TextRun({children:[PageNumber.CURRENT]})],alignment:AlignmentType.RIGHT})]})},children:[...cover,new Paragraph({pageBreakBefore:true,text:'ÍNDICE',heading:HeadingLevel.TITLE}),new TableOfContents('Sumário',{hyperlink:true,headingStyleRange:'1-2'}),new Paragraph({text:'No Word, atualize o índice para recalcular as páginas.',spacing:{after:240}}),new Paragraph({pageBreakBefore:true,text:'CONTEÚDO TÉCNICO',heading:HeadingLevel.TITLE}),...sections]}]});
 const buffer=await Packer.toBuffer(doc);
 return new NextResponse(new Uint8Array(buffer),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment; filename="ERGOBAX_AET_sugestao.docx"','Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erro ao gerar sugestão.'},{status:500});}
}
