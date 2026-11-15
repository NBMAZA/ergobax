import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,TableOfContents,ImageRun,Header,Footer,PageNumber} from 'docx';
export const runtime='nodejs';
const chapters=['Identificação da empresa','Objetivo','Metodologia','Caracterização da empresa','Setores, cargos e atividades','Avaliações ergonômicas','Riscos ergonômicos identificados','Ausência de riscos','Recomendações','Plano de ação','Conclusão técnica','Anexos'];
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
 if(body?.tipo!=='AEP'||typeof clienteId!=='string'||!/^[0-9a-f-]{36}$/i.test(clienteId))return NextResponse.json({error:'Informe uma empresa e selecione AEP.'},{status:400});
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
 const sections:(Paragraph|TableOfContents)[]=[];
 const add=(n:number,paragraphs:string[])=>{sections.push(heading(n,chapters[n-1]));paragraphs.forEach(t=>sections.push(p(t)));};
 add(1,[empresa.razao_social,'CNPJ: '+(empresa.cnpj||'Não informado'),'Endereço: '+[empresa.logradouro,empresa.numero,empresa.bairro,empresa.cidade,empresa.uf].filter(Boolean).join(', '),'Consultoria responsável: '+(consultoria?.nome_fantasia||consultoria?.razao_social||'Não informada')]);
 add(2,['Sugestão preliminar de AEP gerada a partir dos cadastros do ERGOBAX. Escopo e objetivo técnico devem ser revisados pelo responsável.']);
 add(3,['Dados obtidos de registros cadastrados no ERGOBAX. Apenas avaliações marcadas como vigentes foram consideradas nos módulos BIO, MOB, AMB e Iluminamento. A metodologia técnica precisa de validação.']);
 add(4,['Setores cadastrados: '+setores.length+'. Cargos cadastrados: '+cargos.length+'.']);
 sections.push(heading(5,chapters[4]));
 for(const setor of setores){sections.push(new Paragraph({text:'Setor: '+setor.nome,heading:HeadingLevel.HEADING_2}));const cs=cargos.filter(c=>vinculos.some(v=>v.setor_id===setor.id&&v.cargo_id===c.id));if(!cs.length)sections.push(p('Nenhum cargo vinculado.'));for(const c of cs)sections.push(p('Cargo: '+c.nome+(c.codigo?' ('+c.codigo+')':'')+' — Atividades: '+(c.descricao_atribuicoes||'Pendente de descrição.')));}
 const semSetor=cargos.filter(c=>!vinculos.some(v=>v.cargo_id===c.id));if(semSetor.length){sections.push(new Paragraph({text:'Cargos sem setor vinculado',heading:HeadingLevel.HEADING_2}));semSetor.forEach(c=>sections.push(p(c.nome+' — Avaliação pendente de conferência.')));}
 add(6,['Avaliações vigentes: '+vigentes.map((set,i)=>['BIO','MOB','AMB','Iluminamento'][i]+': '+set.size).join('; ')+'.','A cobertura das avaliações por cargo, posto e estação deverá ser confirmada pela consultora.']);
 sections.push(heading(7,chapters[6]));
 if(!riscos.length)sections.push(p('Nenhum risco vinculado a avaliação vigente foi recuperado. Isso não comprova ausência de risco.'));
 for(const r of riscos)sections.push(p('Risco: '+(r.titulo||'Sem título')+' | Classificação: '+(r.classificacao_final||'Pendente')+' | Descrição: '+(r.descricao||'Pendente')));
 add(8,['Não declarar ausência de riscos sem avaliação técnica suficiente. Preenchimento pendente de validação pela consultora.']);
 sections.push(heading(9,chapters[8]));if(!riscos.length)sections.push(p('Recomendações pendentes de avaliação técnica.'));for(const r of riscos)if(r.medidas_recomendadas)sections.push(p((r.titulo||'Risco')+': '+r.medidas_recomendadas));
 sections.push(heading(10,chapters[9]));if(!riscos.length)sections.push(p('Plano de ação pendente.'));for(const r of riscos)if(r.plano_acao)sections.push(p((r.titulo||'Risco')+': '+r.plano_acao));
 add(11,['Conclusão técnica pendente de elaboração, conferência e aprovação pela consultora. Este arquivo não é um laudo final.']);
 add(12,['Fotografias, medições e documentos de apoio deverão ser anexados após conferência técnica.']);
 let logo:Uint8Array|null=null;
 if(consultoria?.logo_path){const download=await db.storage.from('logos-empresas').download(consultoria.logo_path);if(!download.error&&download.data){const bytes=new Uint8Array(await download.data.arrayBuffer());const mime=download.data.type;if(bytes.length<2000000&&(mime==='image/png'||mime==='image/jpeg'))logo=bytes;}}
 const logoRun=logo?new ImageRun({data:logo,transformation:{width:165,height:75},type:'png'}):null;
 const cover:Paragraph[]=[new Paragraph({text:'ERGOBAX — SUGESTÃO DE LAUDO',alignment:AlignmentType.CENTER,spacing:{after:700}})];
 if(logoRun)cover.push(new Paragraph({children:[logoRun],alignment:AlignmentType.CENTER,spacing:{after:450}}));
 cover.push(new Paragraph({text:consultoria?.nome_fantasia||consultoria?.razao_social||'Consultoria',alignment:AlignmentType.CENTER,spacing:{after:600}}),new Paragraph({text:'AEP — AVALIAÇÃO ERGONÔMICA PRELIMINAR',alignment:AlignmentType.CENTER,heading:HeadingLevel.TITLE,spacing:{after:500}}),new Paragraph({text:empresa.razao_social,alignment:AlignmentType.CENTER,spacing:{after:400}}),p('DOCUMENTO PRELIMINAR — SUJEITO À REVISÃO TÉCNICA'));
 const doc=new Document({features:{updateFields:true},sections:[{properties:{},headers:{default:new Header({children:[new Paragraph({text:(consultoria?.nome_fantasia||consultoria?.razao_social||'Consultoria')+' | AEP — Sugestão preliminar'})]})},footers:{default:new Footer({children:[new Paragraph({children:[new TextRun('ERGOBAX · Documento preliminar · Página '),new TextRun({children:[PageNumber.CURRENT]})]})]})},children:[...cover,new Paragraph({pageBreakBefore:true,text:'ÍNDICE',heading:HeadingLevel.HEADING_1}),new TableOfContents('Sumário',{hyperlink:true,headingStyleRange:'1-2'}),new Paragraph({text:'No Word, atualize o índice para recalcular as páginas.',spacing:{after:240}}),new Paragraph({pageBreakBefore:true,text:'CONTEÚDO TÉCNICO',heading:HeadingLevel.TITLE}),...sections]}]});
 const buffer=await Packer.toBuffer(doc);
 return new NextResponse(new Uint8Array(buffer),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment; filename="ERGOBAX_AEP_sugestao.docx"','Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erro ao gerar sugestão.'},{status:500});}
}
