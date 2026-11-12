import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const code=readFileSync(new URL('../app/api/superagente/route.js',import.meta.url),'utf8');
test('superagente acessa somente colunas existentes da nova tabela office_cases',()=>{
 assert.match(code,/from\('office_cases'\)\.select\('id,process_number,title,subject,status,client_id'\)/);
 assert.doesNotMatch(code,/process_number,process_type/);
 assert.match(code,/filter\(Boolean\)/);
});
