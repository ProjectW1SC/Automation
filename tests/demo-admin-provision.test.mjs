import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const src=readFileSync(new URL('../supabase/functions/infinitum-demo-activate/index.ts',import.meta.url),'utf8');
test('demonstracao so ativa apos validacao de JWT e Superadmin',()=>{
 assert.match(src,/admin\.auth\.getUser\(jwt\)/);assert.match(src,/superadmin/i);
 assert.ok(src.indexOf('auth.getUser(jwt)')<src.indexOf('auth.admin.createUser('));
 assert.match(src,/auth\.admin\.createUser/);
 assert.match(src,/email_confirm:true/);
 assert.match(src,/crypto\.getRandomValues/);
 assert.doesNotMatch(src,/password\s*:\s*['"][^'"]{8,}['"]/);
});
test('operacoes so reatribuem dados da empresa ficticia',()=>{
 assert.match(src,/\.eq\("empresa_id",ORG\)/);
 assert.match(src,/\.eq\(column,STUB\)/);
 assert.match(src,/\.eq\("id",profiles\[0\]\.id\)/);
});

test('ativacao administrativa so e disparada por clique consciente, nunca na montagem',()=>{
 const page=readFileSync(new URL('../app/demo-admin/page.jsx',import.meta.url),'utf8');
 assert.match(page,/window.confirm/);
 assert.match(page,/db.functions.invoke\('infinitum-demo-activate'/);
 assert.match(page,/setCredentials\(null\)/);
 assert.match(page,/role/);
 assert.doesNotMatch(page,/localStorage|sessionStorage|console\.log/);
});
test('funcao de provisionamento verifica todas as paginas e usa comparacao exata de privilegio',()=>{
 assert.match(src,/for\(let page=1;page<=50;page\+\+\)/);
 assert.match(src,/perPage:200/);
 assert.match(src,/toLowerCase\(\)==="superadmin"/);
 assert.match(src,/return respond\(\{ok:false,error:"Lista de identidades excede/);
});
