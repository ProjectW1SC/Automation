import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const rd=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('scanner pode usar API DJEN no navegador e grava snapshot privado',()=>{
 const s=rd('app/scanner/page.jsx');
 assert.match(s,/browseOfficialDjenNumber/);
 assert.match(s,/crm_judicial_snapshots/);
 assert.match(s,/office_scan_runs/);
 assert.match(s,/comunica\.pje\.jus\.br/);
});
test('gerador pode buscar texto pelo navegador quando Vercel recebe 403',()=>{
 const s=rd('app/gerador-processos/page.jsx');
 assert.match(s,/browseOfficialDjenSearch/);
 assert.match(s,/Pesquisar DJEN pelo meu navegador/);
});
