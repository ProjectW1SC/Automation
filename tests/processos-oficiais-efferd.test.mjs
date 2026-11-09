import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {CRM_AREAS} from '../lib/crm-navigation.mjs';
import {formatProcessNumber,resolveCourtAlias,normalizeDataJud,normalizeDjen,mergeEvents,onlyExactProcess} from '../lib/processos-oficiais.mjs';
import {getInstitutionBrand} from '../lib/institution-brands.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const number='1001218-36.2026.5.02.0040';
test('Processos is a single route in the existing CRM sidebar',()=>{
 assert.equal(CRM_AREAS.filter(a=>a.label==='Processos').length,1);
 assert.equal(CRM_AREAS.find(a=>a.label==='Processos').path,'/processos');
 assert.match(read('app/processos/page.jsx'),/CrmShell/);
 assert.match(read('app/processos/page.jsx'),/crm_completed_activities/);
 assert.match(read('app/processos/page.jsx'),/crm_processes/);
});
test('CNJ is validated and tribunal is resolved from its official identifier',()=>{
 assert.equal(formatProcessNumber(number),number);
 assert.equal(formatProcessNumber('10012183620265020040'),number);
 assert.equal(resolveCourtAlias(number),'trt2');
 assert.equal(resolveCourtAlias('1001218-36.2026.8.26.0040'),'tjsp');
 assert.throws(()=>resolveCourtAlias('123'),/CNJ/);
 assert.throws(()=>resolveCourtAlias('1001218-36.2026.8.99.0040'),/tribunal/i);
});
test('DataJud maps the exact process and preserves dated court movements',()=>{
 const doc={numeroProcesso:'10012183620265020040',tribunal:'TRT2',classe:{nome:'Ação'},orgaoJulgador:{nome:'40ª Vara'},movimentos:[{codigo:100,nome:'Publicado despacho',dataHora:'2026-11-08T09:15:00.000Z'},{codigo:200,nome:'Decisão',dataHora:'2026-11-07T12:00:00Z'}]};
 const data=normalizeDataJud(doc,number);
 assert.equal(data.found,true);assert.equal(data.movements.length,2);
 assert.equal(data.movements[0].source,'DataJud');
 assert.equal(data.movements[0].title,'Publicado despacho');
 assert.equal(normalizeDataJud({...doc,numeroProcesso:'00000000000000000000'},number).found,false);
});
test('DJEN records only official matching CNJ and strips unsafe HTML',()=>{
 const json={items:[{id:2,numeroProcesso:number,texto:'<b>Intimação</b> &amp; despacho',data_disponibilizacao:'2026-11-08',tipoComunicacao:'Intimação'},{id:3,numeroProcesso:'00000000000000000000',texto:'Outros',data_disponibilizacao:'2026-11-08'}]};
 const events=normalizeDjen(json,number);
 assert.equal(events.length,1);assert.match(events[0].description,/Intimação & despacho/);assert.doesNotMatch(events[0].description,/<b>/);
 assert.equal(events[0].source,'DJEN');
 assert.equal(onlyExactProcess({numeroProcesso:number},number),true);
});
test('timeline joins both sources without treating failed requests as empty',()=>{
 const merged=mergeEvents([{source:'DataJud',id:'A',date:'2026-11-07',title:'Movimento'},{source:'DJEN',id:'B',date:'2026-11-09',title:'Publicação'}]);
 assert.deepEqual(merged.map(x=>x.source),['DJEN','DataJud']);
 const page=read('app/processos/page.jsx');
 assert.match(page,/DataJud/);assert.match(page,/DJEN/);assert.match(page,/movimentaç/i);
 assert.match(page,/sourceStatus/);
});
test('official lookup endpoint requires user token and saved CNJ',()=>{
 const route=read('app/api/processos/consulta/route.js');
 assert.match(route,/auth\.getUser/);
 assert.match(route,/crm_completed_activities/);
 assert.match(route,/crm_processes/);
 assert.match(route,/api-publica\.datajud\.cnj\.jus\.br/);
 assert.match(read('lib/processos-oficiais.mjs'),/comunicaapi\.pje\.jus\.br/);
 assert.match(route,/cache:\s*'no-store'/);
 assert.doesNotMatch(route,/service_role|SUPABASE_SERVICE_ROLE_KEY/);
});
test('known real logos mapped without guessing ambiguous law firms',()=>{
 assert.equal(getInstitutionBrand('CREDITAS')?.domain,'creditas.com');
 assert.equal(getInstitutionBrand('DIGI+')?.domain,'bancodigimais.com.br');
 assert.equal(getInstitutionBrand('ASSESSORIA J.A')?.domain,'jaassessoria.com.br');
 assert.equal(getInstitutionBrand('BRUNO VANDERLEI')?.domain,'brunovanderlei.adv.br');
 assert.equal(getInstitutionBrand('CARDOSO CORREA')?.domain,'cardosoecorrea.com.br');
});
test('Efferd KPIs use restrained semantic styles in all CRM themes',()=>{
 const comp=read('components/efferd-kpi.jsx'),styles=read('app/efferd-crm.css');
 assert.match(comp,/data-efferd-kpi/);
 assert.match(comp,/aria-label/);
 assert.match(styles,/--ui-ink/);
 assert.match(styles,/prefers-reduced-motion/);
 assert.match(read('components/reference-pages.jsx'),/EfferdKpi/);
});
test('Process registry has private RLS and no anonymous access',()=>{
 const sql=read('supabase/migrations/20261109_012_processos.sql');
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/actor_id\s*=\s*\(select auth\.uid\(\)\)/i);
 assert.match(sql,/with check/i);
 assert.match(sql,/authenticated/i);
});
