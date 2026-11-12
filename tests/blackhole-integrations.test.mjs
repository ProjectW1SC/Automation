import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('central gratuita exibe apenas ações reais, sem maquiar provedores pagos',()=>{
 const s=read('components/office-integrations.jsx');
 assert.match(s,/WhatsApp Web/);assert.match(s,/web\.whatsapp\.com/);
 assert.match(s,/Wechaty/);assert.match(s,/Qwen 0\.5B/);assert.match(s,/OpenRouter/);
 assert.match(s,/Scanner judicial/);assert.match(s,/createIcsEvent/);
 assert.doesNotMatch(s,/\{name:'Asaas'|\{name:'Meta'/);
});
test('gerador aceita criação direta de CNJ com acesso Supabase',()=>{
 const s=read('app/gerador-processos/page.jsx');
 assert.match(s,/Cadastrar CNJ manualmente/);assert.match(s,/office_cases/);
});
