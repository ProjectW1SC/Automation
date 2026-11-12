import {OFFICE_DOC_TYPES} from './office-core.mjs';
const clean=(x,n=3000)=>String(x||'').replace(/[<>]/g,'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
export function makeStandalonePetition({kind='manifestacao',instructions='' }={}){
 const type=OFFICE_DOC_TYPES.find(x=>x.id===kind);
 if(!type)throw new Error('Tipo de peça inválido.');
 const text=clean(instructions,3000);
 const title=type.label+' · rascunho avulso';
 const sections=[
  'AO JUÍZO COMPETENTE — [CONFERIR VARA, COMARCA E ÓRGÃO JULGADOR]',
  '',
  'Processo nº [NÚMERO DO PROCESSO — CONFERIR]',
  'Parte requerente: [NOME E QUALIFICAÇÃO A CONFERIR]',
  'Parte requerida: [NOME E QUALIFICAÇÃO A CONFERIR]',
  '',
  type.label.toLocaleUpperCase('pt-BR'),
  '',
  '[PARTE], por intermédio de seu(sua) advogado(a) legalmente habilitado(a), vem, respeitosamente, à presença de Vossa Excelência, apresentar a presente '+type.label.toLocaleUpperCase('pt-BR')+', nos termos a serem conferidos nos autos, pelos fundamentos seguintes.',
  '',
  'I — DOS FATOS',
  text?'Informações fornecidas pelo operador (CONFERIR NOS AUTOS):\n'+text:'[DESCREVER OS FATOS CONFORME DOCUMENTOS E MOVIMENTAÇÕES DOS AUTOS.]',
  '',
  'II — DOS FUNDAMENTOS JURÍDICOS',
  '[INSERIR FUNDAMENTAÇÃO LEGAL E JURISPRUDÊNCIA AUTENTICADAS, ADEQUADAS AO CASO E À FASE PROCESSUAL.]',
  '',
  'III — DOS PEDIDOS',
  '[ESPECIFICAR PEDIDOS, REQUERIMENTOS E, SE CABÍVEL, VALORES CONFORME A DOCUMENTAÇÃO.]',
  '',
  'IV — DOS DOCUMENTOS',
  '[RELACIONAR OS DOCUMENTOS CONFERIDOS E OS ANEXOS DISPONÍVEIS.]',
  '',
  'Nestes termos,',
  'Pede deferimento.',
  '',
  '[CIDADE], [DATA].',
  '',
  '[ADVOGADO(A) RESPONSÁVEL]',
  'OAB [UF/NÚMERO]',
  '',
  '— MINUTA INTERNA. REVISÃO PROFISSIONAL OBRIGATÓRIA. NÃO PROTOCOLADA —'
 ];
 return {title,kind,body:sections.join('\n'),evidence:{sourceCount:0,checkedSources:[],cnj:null}};
}
