import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('alternativas gratuitas sem afirmar conexões inexistentes',()=>{
 const s=read('components/office-integrations.jsx');
 assert.match(s,/Alternativas gratuitas/);
 assert.match(s,/wa\.me/);
 assert.match(s,/Wechaty/);
 assert.match(s,/OpenRouter/);
});
test('gerador aceita criação direta de CNJ com acesso Supabase',()=>{
 const s=read('app/gerador-processos/page.jsx');
 assert.match(s,/Cadastrar CNJ manualmente/);
 assert.match(s,/office_cases/);
});
