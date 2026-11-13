import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectJudicialDocument,looksLikeJudicialDocument,createLegalDraft,normalizeReferenceCnj} from '../lib/legal-draft-engine.mjs';
const sample=['Poder Judiciário do Estado do Rio de Janeiro','Comarca de Vassouras',
'1ª Vara da Comarca de Vassouras','SENTENÇA','Processo: 0801760-42.2023.8.19.0065',
'Classe: PROCEDIMENTO COMUM CÍVEL (7)','AUTOR: Parte Exemplo Fictícia','RÉU: Banco Exemplo S.A.',
'Trata-se de AÇÃO DE REVISÃO DE RELAÇÃO CREDITÍCIA c/c INDENIZATÓRIA.',
'Narra a parte autora que contratou financiamento e questiona a taxa de juros.',
'Decisão proferida no id 123456, deferindo gratuidade e indeferindo tutela.',
'Contestação no id 987654.','É o relatório. Decido. De início'].join('\n');
test('extrai CNJ, vara, partes e avisa dispositivo ausente em sentenca truncada',()=>{
 const p=inspectJudicialDocument(sample);
 assert.equal(p.cnj,'0801760-42.2023.8.19.0065');
 assert.equal(p.unit,'1ª Vara da Comarca de Vassouras');
 assert.equal(p.claimant,'Parte Exemplo Fictícia');
 assert.equal(p.defendant,'Banco Exemplo S.A.');
 assert.equal(p.docType,'sentença');
 assert.equal(p.deviceIdentified,false);
 assert.ok(p.warnings.some(w=>/dispositivo/i.test(w)));
});
test('recurso nao despeja a sentenca nos fatos nem inventa julgamento ou prazo',()=>{
 const r=createLegalDraft({kind:'recurso',label:'Recurso',instructions:'Avaliar cabimento do recurso após leitura do inteiro teor.',sourceDocument:sample});
 assert.match(r.title,/0801760-42/);
 assert.match(r.body,/DA DECISÃO IMPUGNADA E DO CABIMENTO/);
 assert.match(r.body,/RAZÕES RECURSAIS/);
 assert.match(r.body,/DISPOSITIVO NÃO IDENTIFICADO/);
 assert.match(r.body,/Parte Exemplo Fictícia/);
 assert.doesNotMatch(r.body,/apresentar a presente RECURSO/);
 assert.doesNotMatch(r.body,/É o relatório\. Decido\. De início/);
 assert.match(r.body,/ORIENTAÇÕES DO ADVOGADO/);
 assert.equal(r.evidence.sourceDocument,sample);
 assert.equal(r.evidence.sourceCount,0);
});
test('documento judicial colado no campo legado e reconhecido sem confundir orientacao com fato',()=>{
 assert.equal(looksLikeJudicialDocument(sample),true);
 const r=createLegalDraft({kind:'recurso',label:'Recurso',instructions:sample});
 assert.equal(r.evidence.autoDetected,true);
 assert.equal(r.evidence.importedDocument,true);
 assert.doesNotMatch(r.body,/ORIENTAÇÕES DO ADVOGADO/);
});
test('processo selecionado diferente do documento interrompe a minuta',()=>{
 assert.throws(()=>createLegalDraft({kind:'recurso',label:'Recurso',caseRecord:{id:'a',process_number:'0000000-00.2026.8.26.0100'},sourceDocument:sample}),/não corresponde/);
});
test('pecas nao-processuais nao herdam enderecamento judicial',()=>{
 for(const kind of ['procuracao','contrato','relatorio']){
  const r=createLegalDraft({kind,label:kind,sourceDocument:sample});
  assert.doesNotMatch(r.body,/AO JUÍZO/);
  assert.match(r.body,/REVISÃO/);
 }
});
test('normalizacao exige numero CNJ com 20 digitos',()=>{
 assert.equal(normalizeReferenceCnj('08017604220238190065'),'0801760-42.2023.8.19.0065');
 assert.equal(normalizeReferenceCnj('12345'),null);
});
