import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeStandalonePetition} from '../lib/blackhole-petitions.mjs';
import {makePetitionSkeleton} from '../lib/office-core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sample='Poder Judiciário do Estado do Rio de Janeiro\nComarca de Vassouras\n1ª Vara da Comarca de Vassouras\nSENTENÇA\nProcesso: 0801760-42.2023.8.19.0065\nAUTOR: Maria Modelo\nRÉU: Banco Exemplo\nTrata-se de AÇÃO REVISIONAL. É o relatório. Decido.';
test('fluxo da UI mantem fonte separada de orientacoes e sem corte de 1500 caracteres',()=>{
 const s=read('components/office-console.jsx'),panel=read('components/office-document-workspace.jsx');
 assert.match(panel,/maxLength=\{40000\}/);
 assert.match(panel,/maxLength=\{6000\}/);
 assert.match(s,/sourceDocument:docSourceDocument/);
 assert.match(s,/appealType:docAppealType/);
 assert.match(panel,/docResult.evidence.sourceDocument/);
 assert.doesNotMatch(s,/maxLength=\{1500\}/);
 assert.doesNotMatch(s,/A IA externa exige processo cadastrado/);
});
test('registro de consentimento so acusa IA quando o modelo respondeu',()=>{
 const s=read('components/office-console.jsx');
 assert.match(s,/usedRemoteAi=true/);
 assert.match(s,/external_ai_consent:usedRemoteAi/);
 const route=read('app/api/office/ai/route.js');
 assert.match(route,/p\?\.externalAiConsent!==true/);
 assert.match(route,/isDemoUserCompany/);
 assert.match(route,/makeStandalonePetition\(options\)/);
});
test('recurso avulso usa CNJ e partes do documento colado e mantem dispositivo a conferir',()=>{
 const r=makeStandalonePetition({kind:'recurso',sourceDocument:sample,appealType:'apelacao'});
 assert.match(r.title,/Apelação/);
 assert.match(r.body,/0801760-42.2023.8.19.0065/);
 assert.match(r.body,/Maria Modelo/);
 assert.match(r.body,/DISPOSITIVO NÃO IDENTIFICADO/);
 assert.doesNotMatch(r.body,/apresentar a presente RECURSO/);
 assert.equal(r.evidence.sourceDocument,sample);
});
test('minuta vinculada bloqueia uso de CNJ diferente do documento',()=>{
 assert.throws(()=>makePetitionSkeleton({kind:'recurso',caseRecord:{id:'1',process_number:'0000000-00.2026.8.26.0001'},sourceDocument:sample}),/não corresponde/);
});
test('exportadores Word e PDF permanecem conectados ao editor',()=>{
 const s=read('components/office-console.jsx');
 for(const term of ['downloadLegalDocx','printLegalPdf'])assert.match(s,new RegExp(term));
 const panel=read('components/office-document-workspace.jsx');
 for(const term of ['<LegalStationery','Salvar revisão'])assert.match(panel,new RegExp(term));
});
