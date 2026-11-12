import test from'node:test';import assert from'node:assert/strict';import{parseDjenCandidates}from'../lib/djen-generator.mjs';import{dedupeCandidateUpserts}from'../lib/blackhole-candidate-dedupe.mjs';
test('DJEN elimina o mesmo CNJ mesmo quando o portal retorna hashes diferentes',()=>{
 const items=parseDjenCandidates({items:[
  {numeroProcesso:'00012345620268260100',hash:'a',texto:'Publicação A'},
  {numeroProcesso:'00012345620268260100',hash:'b',texto:'Publicação B'}
 ]},'execução');
 assert.equal(items.length,1);
});
test('upsert elimina duplicatas pela chave real do índice e preserva o item mais recente',()=>{
 const rows=dedupeCandidateUpserts([
  {process_number:'0001234-56.2026.8.26.0100',query_term:'execução',headline:'Antigo',official_date:'2026-11-10',external_ref:'a'},
  {process_number:'0001234-56.2026.8.26.0100',query_term:'execução',headline:'Novo',official_date:'2026-11-12',external_ref:'b'},
  {process_number:'0001234-56.2026.8.26.0100',query_term:'penhora',headline:'Outra busca'}
 ]);
 assert.equal(rows.length,2);assert.equal(rows.find(x=>x.query_term==='execução').headline,'Novo');
});
