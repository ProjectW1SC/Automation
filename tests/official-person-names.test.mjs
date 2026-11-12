import test from 'node:test';import assert from 'node:assert/strict';
import {candidateOfficialName,parseDjenCandidates} from '../lib/djen-generator.mjs';
import {normalizeDataJudCandidates} from '../lib/blackhole-datajud-discovery.mjs';
const process='10012183620265020040';
test('DJEN structured lone party name persists with source provenance',()=>{
 const item={numeroProcesso:process,hash:'abc',destinatarios:[{nome:'MARIA DA SILVA',polo:'A'}],texto:'Intimação'};
 const r=parseDjenCandidates({items:[item]},'busca e apreensão')[0];
 assert.equal(r.person_name,'MARIA DA SILVA');assert.equal(r.person_name_source,'DJEN_parte');
});
test('DJEN recipient name may be proposed, not mistaken for client party',()=>{
 const r=candidateOfficialName({nomeDestinatario:'João de Souza'});
 assert.equal(r.person_name,'João de Souza');assert.equal(r.person_name_source,'DJEN_destinatario');
});
test('ambiguous parties and malicious XML are not fabricated as a single client',()=>{
 const a=candidateOfficialName({destinatarios:[{nome:'Maria Pereira',polo:'A'},{nome:'João Pereira',polo:'P'}]});
 assert.equal(a.person_name,null);
 assert.equal(candidateOfficialName({nomeDestinatario:'<script>alert(1)</script>'}).person_name,null);
});
test('DataJud public endpoint has no client identity',()=>{
 const rows=normalizeDataJudCandidates({hits:{hits:[{_source:{numeroProcesso:process,classe:{nome:'Busca e apreensão'},partes:[{nome:'SEGREDO'}]}}]}},'busca e apreensão');
 assert.equal(rows[0].person_name,undefined);assert.doesNotMatch(JSON.stringify(rows),/SEGREDO/);
});
