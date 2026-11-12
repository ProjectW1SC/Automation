import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {buildInfinitumPath,validateInfinitumApiResponse} from '../lib/infinitum-public.mjs';
import {consultJudicialWithFallback} from '../lib/judicial-source-recovery.mjs';
const rd=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('API pública: caminhos autorizados, limites e nenhuma URL arbitrária',()=>{
 assert.equal(buildInfinitumPath('organizations',{}),'/api/v1/public/organizations/my');
 assert.equal(buildInfinitumPath('pops',{organization_id:'550e8400-e29b-41d4-a716-446655440000'}),'/api/v1/public/organizations/550e8400-e29b-41d4-a716-446655440000/pops');
 assert.equal(buildInfinitumPath('cards',{organization_id:'550e8400-e29b-41d4-a716-446655440000',page:'2',limit:'900'}),'/api/v1/public/cards?organization_id=550e8400-e29b-41d4-a716-446655440000&page=2&limit=50');
 assert.throws(()=>buildInfinitumPath('cards',{organization_id:'..'}),/organiza/i);
 assert.throws(()=>buildInfinitumPath('proxy',{url:'https://example.com'}),/não permitida/i);
});
test('API pública: erro de bloqueio não equivale a lista vazia',()=>{
 assert.deepEqual(validateInfinitumApiResponse({items:[{id:'x'}]}),{items:[{id:'x'}]});
 assert.throws(()=>validateInfinitumApiResponse('<html>bloqueio</html>'),/HTML/);
});
test('DJEN 403 usa dados alternativos como origem distinta sem fabricar publicação',async()=>{
 const result=await consultJudicialWithFallback({
  djen:async()=>{const e=new Error('DJEN 403');e.status=403;throw e},
  datajud:async()=>({ok:true,source:'DataJud',found:true,items:[{title:'Movimento'}]})
 });
 assert.equal(result.ok,true);
 assert.equal(result.source,'DataJud');assert.equal(result.partial,true);
 assert.equal(result.sourceStatus.djen,'blocked_403');
 assert.match(result.notice,/não confirma publicação/i);
});
test('DJEN e DataJud indisponíveis não produzem sucesso ou dados falsos',async()=>{
 const result=await consultJudicialWithFallback({
  djen:async()=>{throw new Error('DJEN 403')},
  datajud:async()=>{throw new Error('DataJud 429')}
 });
 assert.equal(result.ok,false);assert.deepEqual(result.items,[]);
});
test('login reproduz ações reais: mostrar senha, acesso pendente, Google e lembrar sessão',()=>{
 const login=rd('components/secured-workspace.jsx'),auth=rd('components/professional-auth.jsx'),css=rd('app/infinitum-login.css');
 assert.match(login,/signInWithOAuth/);assert.match(login,/signUp/);
 assert.match(login,/setRememberOfficeSession/);
 assert.match(login,/showPassword/);
 assert.match(auth,/w1-auth-hero/);assert.match(auth,/w1-auth-panel/);
 assert.match(auth,/Transforme sua/);
 assert.match(css,/prefers-reduced-motion/);
});
test('segredos do Infinitum ficam no servidor e só existe conector público autorizado',()=>{
 const route=rd('app/api/office/infinitum/route.js');
 assert.match(route,/INFINITUM_PUBLIC_TOKEN/);
 assert.match(route,/officeAuth/);
 assert.match(route,/buildInfinitumPath/);
 assert.doesNotMatch(rd('components/office-integrations.jsx'),/process\.env\.INFINITUM_PUBLIC_TOKEN/);
});
