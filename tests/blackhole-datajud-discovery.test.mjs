import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import {buildDataJudDiscoveryQuery,normalizeDataJudCandidates} from '../lib/blackhole-datajud-discovery.mjs';
const rd=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('busca DataJud exige tribunal conhecido e consulta por classe/assunto',()=>{
 const r=buildDataJudDiscoveryQuery({term:'busca e apreensão',court:'TJSP'});
 assert.equal(r.url,'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search');
 assert.equal(r.payload.size,20);
 assert.match(JSON.stringify(r.payload),/classe.nome/);assert.match(JSON.stringify(r.payload),/assuntos.nome/);
 assert.throws(()=>buildDataJudDiscoveryQuery({term:'teste',court:'https://evil.example'}),/Tribunal/i);
});
test('candidatos são CNJ exatos e sem nomes de partes',()=>{
 const rows=normalizeDataJudCandidates({hits:{hits:[{_source:{numeroProcesso:'10012183620265020040',dataAjuizamento:'2026-02-18T00:00:00',tribunal:'TRT2',classe:{nome:'Procedimento Comum'},assuntos:[{nome:'Verbas rescisórias'}],partes:[{nome:'NOME PRIVADO'}]}}]}},'Verbas rescisórias');
 assert.equal(rows.length,1);assert.equal(rows[0].source,'DataJud');
 assert.match(rows[0].process_number,/1001218-36/);
 assert.equal(rows[0].official_date,'2026-02-18');
 assert.doesNotMatch(JSON.stringify(rows),/NOME PRIVADO/);
});
test('rota DataJud autenticada e front-end oferecem escolha de fonte',()=>{
 const route=rd('app/api/gerador-processos/datajud/route.js'),ui=rd('app/gerador-processos/page.jsx');
 assert.match(route,/checkCrmAccess/);assert.match(route,/buildDataJudDiscoveryQuery/);
 assert.match(ui,/DataJud/);assert.match(ui,/fonte|sourceMode/);
});
