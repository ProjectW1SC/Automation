import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {makeStandalonePetition} from '../lib/blackhole-petitions.mjs';
const rd=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('minuta avulsa funciona sem processo cadastrado e indica lacunas',()=>{
 const v=makeStandalonePetition({kind:'manifestacao',instructions:'O cliente pediu juntada de comprovante bancário.'});
 assert.match(v.body,/comprovante bancário/);assert.match(v.body,/CONFIRMAR|CONFERIR/);
 assert.match(v.body,/JUÍZO/);assert.match(v.body,/DOS FATOS/);
});
test('não inventa lei ou processo para uma minuta avulsa',()=>{
 const v=makeStandalonePetition({kind:'contestacao',instructions:''});
 assert.match(v.body,/NÚMERO DO PROCESSO/);assert.doesNotMatch(v.body,/art\.\s*\d+\s*da/i);
});
test('editor permite minuta avulsa, impressão e salvamento real',()=>{
 const ui=rd('components/office-console.jsx'),panel=rd('components/office-document-workspace.jsx');
 assert.match(ui,/makeStandalonePetition/);
 assert.match(ui,/printLegalPdf/);assert.match(ui,/downloadLegalDocx/);assert.match(panel,/LegalStationery/);assert.match(rd('components/legal-stationery.jsx'),/office-document-preview/);
 assert.match(ui,/office_documents/);
});
