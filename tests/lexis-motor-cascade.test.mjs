import test from 'node:test';import assert from 'node:assert/strict';import{configuredLexisMotors,runLexisCascade}from'../lib/lexis-motor-cascade.mjs';
test('configured server engines follow Lexis order and omit missing credentials',()=>{
 const a=configuredLexisMotors({OPENROUTER_API_KEY:'or',MINIMAX_API_KEY:'mm',MINIMAX_MODEL:'MiniMax-M3',GROQ_API_KEY:'gr',GROQ_MODEL:'test'});
 assert.deepEqual(a.map(x=>x.id),['minimax','groq','openrouter']);
});
test('engine key stays on server and provider used is identified',async()=>{
 const motors=configuredLexisMotors({OPENROUTER_API_KEY:'secret'});
 const r=await runLexisCascade([{role:'user',content:'Resumo'}],{motors,fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify({choices:[{message:{content:'Resposta.'}}]})})});
 assert.equal(r.engine,'openrouter');assert.equal(r.reply,'Resposta.');assert.ok(!JSON.stringify(r).includes('secret'));
});
test('fallback is forbidden without explicit consent and allowed after rate limit when authorized',async()=>{
 const motors=configuredLexisMotors({MINIMAX_API_KEY:'mm',MINIMAX_MODEL:'MiniMax-M3',OPENROUTER_API_KEY:'or'});
 let calls=0;const fetchImpl=async()=>{calls++;return calls===1?{ok:false,status:429}:{ok:true,text:async()=>JSON.stringify({choices:[{message:{content:'OK'}}]})}};
 await assert.rejects(runLexisCascade([{role:'user',content:'Teste'}],{motors,fetchImpl}),/429/);assert.equal(calls,1);
 const r=await runLexisCascade([{role:'user',content:'Teste'}],{motors,allowFallback:true,fetchImpl});
 assert.equal(r.engine,'minimax');
});
test('private or insecure custom provider URLs are rejected',()=>assert.deepEqual(configuredLexisMotors({COLIBRI_API_KEY:'x',COLIBRI_MODEL:'m',COLIBRI_BASE_URL:'http://127.0.0.1:8000/v1/chat/completions'}),[]));
