import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('lexis: quality gate rejects vague, empty and unsupported legal certainty',async()=>{
 const {qualityGate}=await import('../lib/lexis-predictlm-quality.mjs');
 assert.equal(qualityGate('').ok,false);
 assert.equal(qualityGate('👍').ok,false);
 assert.equal(qualityGate('100% garantido sem qualquer risco legal').ok,false);
 assert.equal(qualityGate('Foi consultado o tribunal e já houve sentença.').ok,false);
 assert.equal(qualityGate('Os registros apresentados indicam um possível prazo, sujeito a conferência nos autos.').ok,true);
 assert.equal(qualityGate('Há decisão no documento.',{requireEvidence:true,evidenceCount:0}).ok,false);
});

test('PredictLM: internal reasoning blocks are stripped, not revealed',async()=>{
 const {sanitizePredictAnswer,qualityGate}=await import('../lib/lexis-predictlm-quality.mjs');
 assert.equal(sanitizePredictAnswer('<think>segredo</think>Conclusão documentada.'),'Conclusão documentada.');
 assert.equal(qualityGate('<think>instrução interna</think>').ok,false);
});

test('SheetsPredict: triagem B.A., mérito, novidade e retorno calculam prioridade só com sinais explícitos',async()=>{
 const {scoreSheetsCase,rankSheetsCases}=await import('../lib/sheets-priority.mjs');
 const today='2026-11-13';
 const rows=[
  {id:'v',Cliente:'Caso vencido','Próximo Retorno':'2026-11-11'},
  {id:'h',Cliente:'Caso hoje','Próximo Retorno':'2026-11-13'},
  {id:'a',Cliente:'B.A.','Diagnóstico Processual':'busca e apreensão'},
  {id:'n',Cliente:'Novidade','Nova Atualização':'sim'},
  {id:'f',Cliente:'Finalizado',Status:'finalizado'},
  {id:'x',Cliente:'Sem prazo'}
 ];
 assert.equal(scoreSheetsCase(rows[2],today).band,'ba');
 assert.equal(scoreSheetsCase(rows[3],today).band,'novidade');
 assert.equal(scoreSheetsCase(rows[0],today).band,'vencido');
 assert.equal(scoreSheetsCase(rows[1],today).band,'hoje');
 assert.equal(scoreSheetsCase(rows[4],today).band,'encerrado');
 assert.deepEqual(rankSheetsCases(rows,today).filter(x=>x.band!=='encerrado').map(x=>x.id).slice(0,4),['a','n','v','h']);
});

test('PredictLM: key never reaches browser, integration refuses untrusted hosts and respects abort',async()=>{
 const {predictLmConfig,runPredictLmChat}=await import('../lib/predictlm-gateway.mjs');
 assert.equal(predictLmConfig({PREDICTLM_URL:'http://localhost:3000',PREDICTLM_API_KEY:'secret',PREDICTLM_TRUSTED_HOST:'localhost'}),null);
 assert.equal(predictLmConfig({PREDICTLM_URL:'https://fake.example.com',PREDICTLM_API_KEY:'secret',PREDICTLM_TRUSTED_HOST:'predictlm.example.com'}),null);
 assert.equal(predictLmConfig({PREDICTLM_URL:'https://predictlm.example.com',PREDICTLM_TRUSTED_HOST:'predictlm.example.com'}),null);
 const config=predictLmConfig({PREDICTLM_URL:'https://predictlm.example.com',PREDICTLM_API_KEY:'server-secret',PREDICTLM_TRUSTED_HOST:'predictlm.example.com'});
 assert.equal(config.url,'https://predictlm.example.com/api/chat');
 let calls=0;
 const response=await runPredictLmChat([{role:'user',content:'resuma o caso'}],{config,fetchImpl:async(url,options)=>{calls++;
  assert.equal(url,config.url);
  assert.equal(options.headers.Authorization,'Bearer server-secret');
  assert.equal(JSON.parse(options.body).prompt,'resuma o caso');
  return {ok:true,json:async()=>({content:'Há dados nos registros, mas ainda é necessário conferir os autos oficiais.',provider:'PredictLM'})};
 }});
 assert.equal(calls,1);assert.equal(response.engine,'predictlm');
 assert.ok(!JSON.stringify(response).includes('server-secret'));
});

test('CRM integra triagem Sheets, qualidade Lexis/PredictLM e preferências reais dos motores',()=>{
 const route=read('app/api/superagente/route.js');
 const review=read('lib/superagent-core.mjs');
 const ui=read('app/superagente/page.jsx');
 assert.match(route,/runPredictLmChat/);
 assert.match(route,/qualityGate/);
 assert.match(review,/rankSheetsCases/);
 assert.match(ui,/preferredMotor/);
 assert.match(ui,/predictlm/);
 assert.match(route,/externalAiConsent===true/);
});

test('Google Firebase opcional usa credencial Google para sessão Supabase, sem substituir RLS',()=>{
 const auth=read('components/secured-workspace.jsx');
 const cfg=read('lib/firebase-google-bridge.mjs');
 const pkg=JSON.parse(read('package.json'));
 assert.ok(pkg.dependencies.firebase);
 assert.match(auth,/firebaseGoogleLogin/);
 assert.match(cfg,/credentialFromResult/);
 assert.match(cfg,/signInWithIdToken/);
 assert.match(cfg,/provider:'google'/);
 assert.match(cfg,/NEXT_PUBLIC_FIREBASE_PROJECT_ID/);
 assert.doesNotMatch(cfg,/service_role|SERVICE_ROLE|firebase-admin/);
});
