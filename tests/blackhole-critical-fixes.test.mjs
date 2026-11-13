import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import {tryArithmetic} from'../lib/blackhole-arithmetic.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('superagente responde a operações básicas sem modelo externo nem eval',()=>{
 for(const [q,a] of [['2+2','2 + 2 = 4'],['quanto é (3+5)*2?','(3 + 5) × 2 = 16'],['10/4','10 ÷ 4 = 2,5'],['2*3','2 × 3 = 6'],['3/0',null],['explique esse processo',null]])assert.equal(tryArithmetic(q),a,q);
 assert.equal(read('lib/blackhole-arithmetic.mjs').includes('eval('),false);
});
test('constraint do gerador permite DJEN e DataJud mantendo RLS e dados',()=>{
 const s=read('supabase/migrations/20261112_027_process_candidates_sources.sql');
 assert.match(s,/crm_process_candidates_source_check/);assert.match(s,/DataJud/);assert.match(s,/DJEN/);
 assert.doesNotMatch(s,/truncate|delete from|drop table/i);
});
test('o modo IA indisponível não descarta minuta baseada no processo',()=>{
 const s=read('components/office-console.jsx');
 assert.match(s,/avisoAi/);assert.match(s,/estrutura-verificavel/);assert.match(s,/Minuta estruturada salva/);
});
test('a página aplica Infinitum antes da hidratação e respeita a seleção persistente de tema',()=>{
 const a=read('app/layout.jsx'),b=read('components/crm-shell.jsx');
 assert.match(a,/data-crm-theme="infinitum"/);assert.match(b,/preferredTheme/);assert.match(b,/removeItem\('projectw1sc.crm-theme'\)/);
});
