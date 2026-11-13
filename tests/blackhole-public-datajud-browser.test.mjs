import test from 'node:test';
import assert from 'node:assert/strict';
import {browseOfficialDataJudNumber} from '../lib/blackhole-public-datajud-browser.mjs';

const cnj='3002816-74.2026.8.06.0154';
const digits='30028167420268060154';
const response=(payload,status=200)=>({
 ok:status>=200&&status<300,status,
 headers:{get:()=>null},
 json:async()=>payload
});
const official=number=>({timed_out:false,_shards:{failed:0},
 hits:{hits:[{_source:{numeroProcesso:number,tribunal:'TJCE',movimentos:[{codigo:132,nome:'Distribuição',dataHora:'2026-11-12T12:00:00'}]}}]}});

test('DataJud consulta endpoint do tribunal correto no navegador, sem cookies',async()=>{
 let url,options;
 const result=await browseOfficialDataJudNumber({number:cnj,fetchImpl:async(u,o)=>{url=u;options=o;return response(official(digits))}});
 assert.equal(result.ok,true);assert.equal(result.source,'DataJud');assert.equal(result.via,'navegador');
 assert.equal(result.items.length,1);assert.equal(result.court,'TJCE');
 assert.equal(url,'https://api-publica.datajud.cnj.jus.br/api_publica_tjce/_search');
 assert.equal(options.method,'POST');assert.equal(options.mode,'cors');assert.equal(options.credentials,'omit');
 assert.match(options.headers.Authorization,/^APIKey /);
 assert.equal(JSON.parse(options.body).query.match.numeroProcesso,digits);
 assert.equal(options.cache,'no-store');
});

test('DataJud rejeita CNJ diferente do solicitado mesmo quando há hit',async()=>{
 const result=await browseOfficialDataJudNumber({number:cnj,fetchImpl:async()=>response(official('00000000000000000000'))});
 assert.equal(result.ok,false);assert.equal(result.reason,'cnj_mismatch');
});

test('DataJud não transforma timeout interno, shard falho ou índice vazio em consulta confirmada',async()=>{
 const payloads=[
  {timed_out:true,hits:{hits:[]}},
  {_shards:{failed:1},hits:{hits:[]}},
  {timed_out:false,_shards:{failed:0},hits:{hits:[]}}
 ];
 const results=[];
 for(const payload of payloads)results.push(await browseOfficialDataJudNumber({number:cnj,fetchImpl:async()=>response(payload)}));
 assert.equal(results[0].reason,'index_timeout');
 assert.equal(results[1].reason,'shard_failure');
 assert.equal(results[2].reason,'not_indexed');
 assert.ok(results.every(x=>x.ok===false&&x.found===false));
});

test('HTTP 429 suspende a mesma corte e não dispara nova chamada',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;return response({},429)};
 const first=await browseOfficialDataJudNumber({number:cnj,fetchImpl});
 const second=await browseOfficialDataJudNumber({number:cnj,fetchImpl});
 assert.equal(first.reason,'rate_limited');assert.equal(first.status,429);
 assert.equal(second.reason,'rate_limited');assert.equal(calls,1);
});

test('limite 429 de uma corte não bloqueia outro tribunal',async()=>{
 const blockedNumber='1001218-36.2026.5.02.0040';
 const other='0411964-57.2026.3.00.0000',otherDigits='04119645720263000000';
 let calls=0;
 const fetchImpl=async(url)=>{calls++;return calls===1?response({},429):response(official(otherDigits))};
 const blocked=await browseOfficialDataJudNumber({number:blockedNumber,fetchImpl});
 const allowed=await browseOfficialDataJudNumber({number:other,fetchImpl});
 assert.equal(blocked.reason,'rate_limited');assert.equal(allowed.ok,true,JSON.stringify(allowed));assert.equal(calls,2);
});

test('falha de CORS/rede ativa pausa do navegador e permite fallback identificado',async()=>{
 let calls=0;
 const other='0411964-57.2026.3.00.0000';
 const fetchImpl=async()=>{calls++;throw new TypeError('Failed to fetch')};
 const first=await browseOfficialDataJudNumber({number:other,fetchImpl});
 const second=await browseOfficialDataJudNumber({number:other,fetchImpl});
 assert.equal(first.reason,'network_error');assert.equal(second.reason,'browser_cooldown');
 assert.equal(calls,1);
});
