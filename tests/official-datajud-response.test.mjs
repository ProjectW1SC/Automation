import test from 'node:test';import assert from 'node:assert/strict';
import {validatePublicDataJudResponse,currentPublicKey} from '../lib/official-datajud-response.mjs';
test('DataJud 200 com timeout interno nunca significa processo inexistente',()=>{
 assert.throws(()=>validatePublicDataJudResponse({timed_out:true,hits:{hits:[]}}),/Índice DataJud excedeu/);
});
test('DataJud responde incompleto com shard com falha; recusa status falsamente completo',()=>{
 assert.throws(()=>validatePublicDataJudResponse({_shards:{failed:2},hits:{hits:[]}}),/shards/);
});
test('DataJud 200 com resultado verificado e lista vazia é válido',()=>{
 const payload={timed_out:false,_shards:{failed:0},hits:{hits:[]}};
 assert.equal(validatePublicDataJudResponse(payload),payload);
});
test('DataJud header não recebe APIKey duplicado',()=>{
 assert.equal(currentPublicKey('APIKey example'),'example');
 assert.equal(currentPublicKey('','sample'),'sample');
});
