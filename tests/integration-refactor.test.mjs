import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{parseCSV,parseLeadImport,normalizeLead,LEAD_SOURCES}from'../lib/lead-fusion.mjs';
import{buildSuperAgentReview,superAgentTask}from'../lib/superagent-core.mjs';
import{buildDjenSearchURL,parseDjenCandidates}from'../lib/djen-generator.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('W1/W2 import de CSV/JSON com deduplicação e não mistura organizações',()=>{
 const csv='nome,empresa,email,origem\n"Escritório, Centro",W1,a@empresa.test,site\n"Escritório, Centro",W1,a@empresa.test,site';
 assert.equal(parseCSV(csv)[0].nome,'Escritório, Centro');
 assert.equal(parseLeadImport(csv,'leads.csv','w1').valid.length,1);
 assert.equal(parseLeadImport(JSON.stringify([{name:'Clínica X',email:'b@empresa.test'}]),'w2.json','w2').valid[0].source,'w2');
 assert.throws(()=>normalizeLead({name:'Sem origem'},'w3'),/URL|contato|organização/i);
 assert.equal(LEAD_SOURCES.length,4);
});
test('superagente do Lexis classifica tarefas sem inventar consultas ou envios',()=>{
 assert.equal(superAgentTask('mensagem de atendimento cliente'),'atendimento');
 const r=buildSuperAgentReview('Revisar processo 1001218-36.2026.5.02.0040',{processes:[],snapshots:[]});
 assert.equal(r.stats.processes,0);assert.equal(r.performedActions.length,0);
 assert.match(r.answer,/não foi encontrado/i);
});
test('superagente só relata evidência armazenada do processo selecionado',()=>{
 const num='1001218-36.2026.5.02.0040';
 const r=buildSuperAgentReview('processo '+num,{processes:[{process_number:num}],
 snapshots:[{process_number:num,source:'djen',checked_at:'2026-11-12T10:00:00Z',payload:{items:[{source:'DJEN',date:'2026-11-10',title:'Sentença registrada'}]}}],
 clients:[]});
 assert.equal(r.events.length,1);assert.match(r.answer,/Sentença registrada/);assert.equal(r.requiresReview,true);
});
test('gerador por DJEN impõe janela, tribunal e somente CNJ oficial',()=>{
 assert.match(buildDjenSearchURL({term:'busca e apreensão',start:'2026-11-01',end:'2026-11-12',court:'TJSP'}),/siglaTribunal=TJSP/);
 assert.throws(()=>buildDjenSearchURL({term:'teste',start:'2026-01-01',end:'2026-11-12'}),/31 dias/);
 const r=parseDjenCandidates({items:[{numeroProcesso:'10012183620265020040',texto:'Publicação oficial',id:1},{texto:'00000000000000000000',id:2}]},'busca e apreensão');
 assert.equal(r.length,1);assert.equal(r[0].process_number,'1001218-36.2026.5.02.0040');
});
test('novas áreas têm navegação funcional, RLS e layout compatível com referência',()=>{
 const nav=read('lib/crm-navigation.mjs');for(const p of ['/leads','/gerador-processos','/superagente'])assert.ok(nav.includes(p));
 const sql=read('supabase/migrations/20261112_017_refactor_crm_leads.sql');
 assert.match(sql,/crm_leads[\s\S]*enable row level security/i);
 assert.match(sql,/crm_process_candidates[\s\S]*enable row level security/i);
 assert.match(read('app/layout.jsx'),/infinitum-reference\.css/);
});
