import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('rotas financeiras anteriores não aparecem no painel do escritório jurídico',()=>{
 const config=read('next.config.mjs');
 for(const p of ['/tarefas','/report','/finalizados','/minhas-atividades'])assert.ok(config.includes("source:'"+p+"'"),p);
 const nav=read('lib/crm-navigation.mjs');
 for(const label of ['Painel jurídico','Clientes','Processos','Peças e petições','WhatsApp','Mini Agentes'])assert.match(nav,new RegExp(label));
 assert.doesNotMatch(nav,/Quitações|Finalizados|Instituições/);
});
test('guia não declara como configurados provedores que dependem de chaves',()=>{
 const guide=read('docs/ESCRITORIO-JURIDICO.md');
 for(const t of ['LEGAL_AI_API_KEY','WHATSAPP_APP_SECRET','TURNSTILE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','RLS','consentimento'])assert.ok(guide.includes(t),t);
});
