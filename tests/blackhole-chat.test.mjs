import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {offlineBlackholeReply,validateBlackholePrompt} from '../lib/blackhole-chat.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('mensagens livres curtas são aceitas',()=>{
 assert.equal(validateBlackholePrompt('oi'),'oi');assert.equal(validateBlackholePrompt('x'),'x');
 assert.throws(()=>validateBlackholePrompt(''),/mensagem/i);
});
test('saudação não gera relatório vazio da carteira',()=>{
 const s=offlineBlackholeReply('oi');
 assert.match(s,/Olá|Oi/);assert.doesNotMatch(s,/Escopo: 0 processos/);
});
test('perguntas genéricas sem modelo não fingem raciocínio ou fonte',()=>{
 const s=offlineBlackholeReply('Qual é a capital de Marte?');
 assert.match(s,/modelo|configurad|consulta/i);assert.doesNotMatch(s,/Escopo: 0 processos/);
});
test('endpoint do agente recebe mensagens livres e responde com texto',()=>{
 const route=read('app/api/superagente/route.js'),ui=read('app/superagente/page.jsx');
 assert.match(route,/validateBlackholePrompt/);assert.match(route,/offlineBlackholeReply/);
 assert.match(ui,/payload\.reply/);assert.match(ui,/minLength=\{1\}/);
 assert.doesNotMatch(ui,/prompt\.trim\(\)\.length<6/);
});
