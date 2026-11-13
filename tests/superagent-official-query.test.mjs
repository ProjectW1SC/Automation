import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedOfficialQuery,reportOfficialQuery} from '../lib/superagent-official-query.mjs';
const cnj='00012345620248260100';
test('pedido explicitamente consulta DJEN/DataJud usando numero CNJ',()=>{
 assert.deepEqual(requestedOfficialQuery('Consulte DJEN do processo 0001234-56.2024.8.26.0100'),{number:cnj,source:'djen'});
 assert.deepEqual(requestedOfficialQuery('Busque DJEN e DataJud 0001234-56.2024.8.26.0100'),{number:cnj,source:'auto'});
 assert.deepEqual(requestedOfficialQuery('Analise o processo '+cnj),{number:cnj,source:'auto'});
 assert.equal(requestedOfficialQuery('Qual o status do DJEN?'),null);
 assert.equal(requestedOfficialQuery('Consulte processo 123'),null);
});
test('retorno nao confunde publicacao anotada no DataJud com documento DJEN',()=>{
 const r=reportOfficialQuery({number:'0001234-56.2024.8.26.0100',source:'auto',result:{
  ok:true,sourceStatus:{djen:'ok',datajud:'ok'},items:[{id:'d1',source:'DataJud',date:'2026-06-09',title:'Publicação'}]
 }});
 assert.equal(r.review.counts.djen,0);assert.equal(r.review.counts.datajud,1);
 assert.match(r.reply,/NAO sao documentos DJEN/);
 assert.match(r.reply,/09\/06\/2026/);
});
test('consulta bloqueada ou parcial nao e apresentada como atualizada',()=>{
 const r=reportOfficialQuery({number:'0001234-56.2024.8.26.0100',source:'auto',
 result:{ok:true,partial:true,sourceStatus:{djen:'blocked_403',datajud:'ok'},sourceErrors:{djen:'HTTP 403'},
 items:[{id:'1',source:'DataJud',date:'2026-06-09',title:'Publicacao'}]}});
 assert.match(r.reply,/HTTP 403/);assert.match(r.reply,/parcial/);
});
