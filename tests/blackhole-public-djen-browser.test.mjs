import test from 'node:test';import assert from 'node:assert/strict';
import {browseOfficialDjenNumber,browseOfficialDjenSearch,fetchPublicDjenBrowser} from '../lib/blackhole-public-djen-browser.mjs';
const fetchOK=(url,opts)=>({ok:true,status:200,text:async()=>JSON.stringify({items:[{numeroProcesso:'1001218-36.2026.5.02.0040',texto:'Audiência designada para 18/11/2026 às 14h',data_disponibilizacao:'2026-11-12'}]})});
test('DJEN via navegador usa somente domínio oficial público, sem token privado',async()=>{
 let url,options;const f=async(u,o)=>{url=u;options=o;return fetchOK(u,o)};
 const r=await browseOfficialDjenNumber({number:'1001218-36.2026.5.02.0040',start:'2026-11-01',end:'2026-11-13',fetchImpl:f});
 assert.equal(r.ok,true);assert.equal(r.source,'DJEN');assert.equal(r.number,'1001218-36.2026.5.02.0040');assert.equal(r.via,'navegador');assert.equal(r.items.length,1);
 assert.match(url,/^https:\/\/comunicaapi\.pje\.jus\.br\/api\/v1\/comunicacao\?/);
 assert.equal(options.credentials,'omit');assert.equal(options.method,'GET');
 assert.ok(!('Authorization'in options.headers));
});
test('bloqueios não são apresentados como consulta sem publicações',async()=>{
 let blocked;try{await fetchPublicDjenBrowser('https://comunicaapi.pje.jus.br/api/v1/comunicacao',
  async()=>({ok:false,status:403}))}catch(error){blocked=error}
 assert.match(blocked.message,/403/);assert.equal(blocked.status,403);
 await assert.rejects(()=>fetchPublicDjenBrowser('https://evil.test/api/v1/comunicacao',fetchOK),/não pertence/);
});
test('gerador por texto pode usar o DJEN público do navegador',async()=>{
 const r=await browseOfficialDjenSearch({term:'audiência designada',start:'2026-11-01',end:'2026-11-12',court:'TRT2'},fetchOK);
 assert.equal(r.items.length,1);
 assert.equal(r.items[0].source,'DJEN');
});
