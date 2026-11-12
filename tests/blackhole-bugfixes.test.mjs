import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {createIcsEvent} from '../lib/blackhole-free-integrations.mjs';
import {requiresPortfolio} from '../lib/blackhole-chat.mjs';
const rd=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('minuta sem processo não acessa caseRecord nulo',()=>{
 const s=rd('components/office-console.jsx');
 assert.match(s,/caseRecord\?\.process_number/);
 assert.match(s,/const client=caseRecord\?/);
 assert.match(s,/caseRecord\?makePetitionSkeleton/);
 assert.match(s,/makeStandalonePetition/);
});
test('carregamento de páginas tem prazo e erro em vez de infinito',()=>{
 assert.match(rd('components/office-console.jsx'),/withAuthDeadline/);
 assert.match(rd('components/office-kanban.jsx'),/withAuthDeadline/);
});
test('exportação de calendário rejeita 30 de fevereiro',()=>{
 assert.throws(()=>createIcsEvent({title:'Audiência',date:'2026-02-30'}),/data válida/);
});
test('saudação casual não consulta a carteira jurídica',()=>{
 assert.equal(requiresPortfolio('oi'),false);
 assert.equal(requiresPortfolio('analise esse processo'),true);
});
