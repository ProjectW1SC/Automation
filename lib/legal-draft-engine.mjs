// Preparacao deterministica de minutas: fonte colada pelo operador NUNCA e uma fonte oficial confirmada.
const limit=(v,n)=>String(v??'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim().slice(0,n);
const flat=(v,n=500)=>limit(v,n).replace(/\s+/g,' ').trim();
const upper=s=>flat(s,200).toLocaleUpperCase('pt-BR');
const digits=s=>String(s??'').replace(/\D/g,'');
const CNJ=/(?:^|[^\d])(\d{7}[-.\s]?\d{2}[-.\s]?\d{4}[-.\s]?\d[-.\s]?\d{2}[-.\s]?\d{4})(?!\d)/;
export const APPEAL_TYPES=Object.freeze([
 {id:'',label:'A definir pelo advogado'},
 {id:'apelacao',label:'Apelação'},
 {id:'agravo_instrumento',label:'Agravo de instrumento'},
 {id:'embargos_declaracao',label:'Embargos de declaração'},
 {id:'recurso_inominado',label:'Recurso inominado'},
 {id:'outro',label:'Outra modalidade (especificar na revisão)'}
]);
export function normalizeReferenceCnj(value){
 const match=String(value??'').match(CNJ);
 if(!match)return null;
 const n=digits(match[1]);if(n.length!==20)return null;
 return n.slice(0,7)+'-'+n.slice(7,9)+'.'+n.slice(9,13)+'.'+n.slice(13,14)+'.'+n.slice(14,16)+'.'+n.slice(16);
}
export function looksLikeJudicialDocument(input){
 const s=flat(input,4500);
 return s.length>=140&&(/poder judici[aá]rio|comarca de|tribunal de justi[cç]a|PROCESSO\s*:|classe\s*:|[ÉE] o relat[oó]rio[.]?\s*decido|SENTEN[CÇ]A\b/i.test(s)&&/processo|autor|r[eé]u|senten[cç]a|a[cç][aã]o/i.test(s));
}
const linesOf=s=>s.split('\n').map(x=>x.trim()).filter(Boolean);
function tagged(lines,pattern){
 for(const line of lines){const m=line.match(pattern);if(m?.[1])return flat(m[1],200)}
 return null;
}
function extractFromProse(s,re,max=480){
 const oneLine=s.replace(/\s+/g,' ');
 const m=oneLine.match(re);
 return m?.[0]?flat(m[0],max):null;
}
export function inspectJudicialDocument(input){
 const source=limit(input,40000),lines=linesOf(source);
 const cnj=normalizeReferenceCnj(source);
 const court=lines.find(x=>/^poder judici[aá]rio|^tribunal de justi[cç]a|^justi[cç]a federal|^justi[cç]a do trabalho/i.test(x));
 const district=lines.find(x=>/^comarca de\b|^subse[cç][aã]o judici[aá]ria/i.test(x));
 const unit=lines.find(x=>/^\d+[ªºa]?\s+vara\b|^juizado especial\b|^vara [^\n]+|^turma recursal\b/i.test(x));
 const claimant=tagged(lines,/^(?:AUTOR(?:A)?|REQUERENTE|RECLAMANTE|EXEQUENTE|IMPETRANTE)\s*:\s*(.+)$/i);
 const defendant=tagged(lines,/^(?:R[EÉ]U|R[EÉ]|REQUERIDO(?:A)?|RECLAMADO(?:A)?|EXECUTADO(?:A)?)\s*:\s*(.+)$/i);
 const legalClass=tagged(lines,/^CLASSE\s*:\s*(.+)$/i);
 const docType=lines.some(x=>/^SENTEN[CÇ]A\b/i.test(x))?'sentença':
  lines.some(x=>/^AC[ÓO]RD[ÃA]O\b/i.test(x))?'acórdão':
  lines.some(x=>/^DECIS[ÃA]O\b/i.test(x))?'decisão':'documento não classificado';
 const claim=extractFromProse(source,/\bTrata-se de\b.{0,380}?(?=\bNarra\b|\bDecis[aã]o proferida\b|\bContesta[cç][aã]o\b|\b[ÉE] o relat[oó]rio\b|$)/i,430);
 const allegation=extractFromProse(source,/\bNarra (?:a parte autora|o autor|a autora|a requerente)\b.{0,510}?(?=\bAssim\b|\bDecis[aã]o proferida\b|\bContesta[cç][aã]o\b|\b[ÉE] o relat[oó]rio\b|$)/i,520);
 const earlier=extractFromProse(source,/\bDecis[aã]o proferida\b.{0,200}?(?=\bContesta[cç][aã]o\b|\bEm provas\b|\b[ÉE] o relat[oó]rio\b|$)/i,230);
 const response=extractFromProse(source,/\bContesta[cç][aã]o no id\s*\d+[^.]{0,95}\./i,170);
 const device=/\b(ANTE O EXPOSTO|ISTO POSTO|JULGO (?:PROCEDENTES?|IMPROCEDENTES?|PARCIALMENTE)|DISPOSITIVO)\b/i.test(source);
 const warnings=[];
 if(docType==='sentença'&&!device)warnings.push('Dispositivo e resultado da sentença não identificados no trecho. Não presumir procedência nem cabimento de recurso.');
 if(!cnj)warnings.push('Número CNJ não identificado no documento.');
 if(!claimant||!defendant)warnings.push('Qualificação e posição de uma ou ambas as partes devem ser conferidas nos autos.');
 return {cnj,court:flat(court||'',180)||null,district:flat(district||'',180)||null,unit:flat(unit||'',180)||null,
  claimant,defendant,legalClass,docType,deviceIdentified:device,claim,allegation,earlier,response,
  sourceLength:source.length,sourceComplete:source.length<40000,warnings};
}
function section(lines,title,body){lines.push('',title,...(Array.isArray(body)?body:[body]).filter(Boolean))}
function summaryParts(info){
 const rows=[];
 if(info.claim)rows.push('Objeto descrito no documento fornecido (a conferir): '+info.claim);
 if(info.allegation)rows.push('Alegações transcritas da fonte (não constituem fatos comprovados): '+info.allegation);
 if(info.earlier)rows.push('Histórico mencionado no documento (a conferir): '+info.earlier);
 if(info.response)rows.push('Peça/ato processual mencionado (a conferir): '+info.response);
 return rows.length?rows:['[DESCREVER, APÓS CONFERÊNCIA NOS AUTOS, OS FATOS RELEVANTES À PEÇA.]'];
}
function checkedEvidence(evidence=[]){
 return (Array.isArray(evidence)?evidence:[]).filter(e=>e?.source&&e?.checked_at&&e?.simulated!==true).slice(0,8);
}
export function createLegalDraft({kind='manifestacao',label='Manifestação',instructions='',sourceDocument='',caseRecord=null,client=null,evidence=[],appealType=''}={}){
 let operatorInstructions=limit(instructions,6000),source=limit(sourceDocument,40000),autoDetected=false;
 if(!source&&looksLikeJudicialDocument(operatorInstructions)){
  source=operatorInstructions;operatorInstructions='';autoDetected=true;
 }
 const info=inspectJudicialDocument(source);
 const caseNumber=caseRecord?.process_number?normalizeReferenceCnj(caseRecord.process_number):null;
 if(caseNumber&&info.cnj&&digits(caseNumber)!==digits(info.cnj))
  throw new Error('O número CNJ do documento não corresponde ao processo selecionado. Confira o vínculo antes de gerar.');
 const number=caseNumber||info.cnj||'[NÚMERO DO PROCESSO — CONFERIR]';
 const name=info.claimant||null,defendant=info.defendant||null;
 const clientName=flat(client?.name||'',180);
 const unit=info.unit&&info.district?[info.unit,info.district].join(' — '):info.unit||info.district;
 const court=unit?upper(unit):'[CONFERIR VARA, COMARCA E ÓRGÃO JULGADOR]';
 const firmName=caseRecord?.tribunal?flat(caseRecord.tribunal,100):null;
 const appeal=APPEAL_TYPES.find(x=>x.id===appealType);
 if(!appeal)throw Error('Modalidade recursal inválida.');
 const appealName=appealType?appeal.label:'RECURSO [MODALIDADE A DEFINIR]';
 const titleLabel=kind==='recurso'?appealName:label;
 const title=titleLabel+' · '+(caseNumber||info.cnj||'rascunho avulso');
 const lines=[];
 const courtBound=!['procuracao','contrato','relatorio'].includes(kind);
 if(courtBound){
  lines.push('MINUTA DE '+upper(titleLabel)+' — REVISÃO OBRIGATÓRIA','');
  lines.push('AO JUÍZO '+court);
  lines.push('Processo nº '+number);
  if(name)lines.push('Parte autora (conforme texto fornecido): '+name);
  else if(clientName)lines.push('Cliente vinculado: '+clientName+' — [CONFERIR POSIÇÃO PROCESSUAL]');
  else lines.push('Parte requerente/recorrente: [IDENTIFICAR E QUALIFICAR]');
  lines.push('Parte contrária: '+(defendant||'[IDENTIFICAR E QUALIFICAR]'));
  if(info.legalClass)lines.push('Classe indicada na fonte: '+info.legalClass);
  if(firmName)lines.push('Tribunal cadastrado: '+firmName+' — [CONFERIR COMPETÊNCIA]');
  lines.push('',upper(titleLabel),'');
 }else{
  lines.push(upper(titleLabel)+' — MINUTA PARA REVISÃO','');
  if(number&&!number.startsWith('['))lines.push('Referência processual: '+number);
  if(clientName||name)lines.push('Cliente/parte informada: '+(clientName||name));
 }
 if(source){
  lines.push('REFERÊNCIA DOCUMENTAL (NÃO VERIFICADA): '+upper(info.docType)+'. A fonte foi colada pelo operador e não foi consultada nem autenticada pelo sistema.');
  if(info.warnings.length)lines.push('PENDÊNCIAS DA FONTE: '+info.warnings.join(' '));
 }
 if(kind==='recurso'){
  section(lines,'I — DA DECISÃO IMPUGNADA E DO CABIMENTO',[
   'Peça pretendida: '+appealName+'. [CONFERIR MODALIDADE, COMPETÊNCIA, LEGITIMIDADE, CABIMENTO E PREPARO.]',
   info.docType!=='documento não classificado'?'Documento indicado: '+info.docType+'. [CONFIRMAR DATA, INTEIRO TEOR E DISPOSITIVO.]':'[INDICAR DECISÃO OU ATO IMPUGNADO, ID E INTEIRO TEOR CONFERIDOS NOS AUTOS.]',
   !info.deviceIdentified?'[DISPOSITIVO NÃO IDENTIFICADO NA FONTE. NÃO DEDUZIR RESULTADO OU PEDIDO DE REFORMA.]':null,
   '[CONFERIR INTIMAÇÃO, TERMO INICIAL E FINAL, TEMPESTIVIDADE, REPRESENTAÇÃO E REQUISITOS DE ADMISSIBILIDADE.]'
  ]);
  section(lines,'II — DA SÍNTESE DO PROCESSO E DA DECISÃO',summaryParts(info));
  section(lines,'III — DAS RAZÕES RECURSAIS',[
   '[IDENTIFICAR OS CAPÍTULOS IMPUGNADOS E REFUTAR ESPECIFICAMENTE OS FUNDAMENTOS DA DECISÃO, APÓS LEITURA COMPLETA.]',
   '[INSERIR LEGISLAÇÃO E PRECEDENTES VERIFICADOS, SEM CRIAR REFERÊNCIAS INEXISTENTES.]'
  ]);
  section(lines,'IV — DOS PEDIDOS RECURSAIS','[DEFINIR PEDIDOS DE CONHECIMENTO, REFORMA, ANULAÇÃO OU INTEGRAÇÃO CONFORME A MODALIDADE, A DECISÃO E A ESTRATÉGIA VALIDADA.]');
  section(lines,'V — DOS DOCUMENTOS E PEÇAS OBRIGATÓRIAS','[VERIFICAR DOCUMENTOS DO PROCESSO, PROCURAÇÃO, COMPROVANTES E PREPARO, QUANDO APLICÁVEIS.]');
 }else if(kind==='contrato'){
  section(lines,'I — DAS PARTES','[IDENTIFICAR E QUALIFICAR CORRETAMENTE AS PARTES CONTRATANTES.]');
  section(lines,'II — DO OBJETO','[DESCREVER OBJETO, ESCOPO E OBRIGAÇÕES COM BASE EM INSTRUÇÕES CONFIRMADAS.]');
  section(lines,'III — DAS CONDIÇÕES','[DEFINIR PRAZOS, REMUNERAÇÃO, RESPONSABILIDADES E HIPÓTESES DE RESCISÃO.]');
  section(lines,'IV — DAS DISPOSIÇÕES FINAIS','[CONFERIR LEGISLAÇÃO, FORO E ASSINATURAS.]');
 }else if(kind==='procuracao'){
  section(lines,'I — OUTORGANTE','[IDENTIFICAR E QUALIFICAR O OUTORGANTE.]');
  section(lines,'II — OUTORGADO(A)','[IDENTIFICAR ADVOGADO(A), INSCRIÇÃO NA OAB E DADOS PROFISSIONAIS.]');
  section(lines,'III — PODERES','[DELIMITAR PODERES GERAIS E ESPECIAIS CONFORME AUTORIZAÇÃO EXPRESSA.]');
  section(lines,'IV — VIGÊNCIA E ASSINATURA','[CONFERIR DATA, LOCAL E FORMA DE ASSINATURA.]');
 }else if(kind==='relatorio'){
  section(lines,'I — IDENTIFICAÇÃO E OBJETO',info.legalClass?'Classe mencionada: '+info.legalClass:'[IDENTIFICAR OBJETO E FINALIDADE DO RELATÓRIO.]');
  section(lines,'II — SÍNTESE DOCUMENTAL',summaryParts(info));
  section(lines,'III — PONTOS DE ATENÇÃO',info.warnings.length?info.warnings:['[IDENTIFICAR PENDÊNCIAS E RISCOS COM DADOS VERIFICADOS.]']);
  section(lines,'IV — PRÓXIMAS PROVIDÊNCIAS','[DEFINIR AÇÕES E RESPONSÁVEIS APÓS CONFERÊNCIA.]');
 }else{
  section(lines,'I — DOS FATOS E DO CONTEXTO DOCUMENTAL',summaryParts(info));
  if(kind==='contestacao')section(lines,'II — DAS PRELIMINARES E DA DEFESA','[VERIFICAR A PETIÇÃO INICIAL, ARGUMENTOS DA PARTE CONTRÁRIA E PRELIMINARES CABÍVEIS.]');
  else section(lines,'II — DOS FUNDAMENTOS JURÍDICOS','[INSERIR LEGISLAÇÃO, FUNDAMENTAÇÃO JURÍDICA E JURISPRUDÊNCIA AUTENTICADAS, ADEQUADAS AO CASO E À FASE PROCESSUAL.]');
  section(lines,'III — DOS PEDIDOS','[ESPECIFICAR PEDIDOS E PROVIDÊNCIAS APÓS CONFERIR O CONTEÚDO DOS AUTOS.]');
  section(lines,'IV — DOS DOCUMENTOS','[RELACIONAR DOCUMENTOS AUTENTICADOS E ANEXOS A SEREM APRESENTADOS.]');
 }
 if(operatorInstructions) section(lines,'ORIENTAÇÕES DO ADVOGADO — APLICAR APÓS CONFERÊNCIA',operatorInstructions);
 const refs=checkedEvidence(evidence);
 if(refs.length)section(lines,'HISTÓRICO DE REFERÊNCIAS DO SISTEMA',refs.map(e=>'- '+flat(e.source,30)+' · '+flat(e.checked_at,40)+' · '+flat(e.summary,190)));
 else if(caseRecord)section(lines,'HISTÓRICO DE FONTES','[NENHUMA CONSULTA OFICIAL COMPROVADA NO HISTÓRICO]');
 if(courtBound)lines.push('','Nestes termos,','Pede deferimento.');
 lines.push('','[CIDADE], [DATA].','[ADVOGADO(A) RESPONSÁVEL]','OAB [UF/NÚMERO]','',
 '— MINUTA INTERNA. REVISÃO PROFISSIONAL OBRIGATÓRIA. NÃO PROTOCOLADA —');
 const evidencePayload={cnj:caseNumber||info.cnj||null,court:info.unit||firmName||null,sourceCount:refs.length,
  checkedSources:refs.map(e=>({source:e.source,checked_at:e.checked_at})),
  importedDocument:!!source,sourceDocument:source||null,sourceClassification:'DOCUMENTO_COLADO_NAO_VERIFICADO',
  extracted:{cnj:info.cnj,claimant:info.claimant,defendant:info.defendant,legalClass:info.legalClass,
   docType:info.docType,deviceIdentified:info.deviceIdentified,warnings:info.warnings},
  autoDetected,appealType:kind==='recurso'?appealType:null};
 return {title,kind,body:lines.join('\n'),evidence:evidencePayload,needsReview:true};
}
