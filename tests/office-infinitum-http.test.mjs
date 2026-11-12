import test from 'node:test';import assert from 'node:assert/strict';
import {getInfinitumPublicResource} from '../lib/infinitum-public.mjs';
test('cliente Infinitum usa somente API pública GET e token em header no servidor',async()=>{
 let captured={};
 const fetchImpl=async(url,opts)=>{captured={url,opts};return {
  ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify([{id:'public-org',name:'Organização autorizada'}])
 }};
 const data=await getInfinitumPublicResource({token:'dummy-test-token',resource:'organizations',fetchImpl});
 assert.equal(Array.isArray(data),true);
 assert.equal(captured.url,'https://public.infinitum.app.br/api/v1/public/organizations/my');
 assert.equal(captured.opts.method,'GET');
 assert.equal(captured.opts.headers['X-Public-Token'],'dummy-test-token');
 assert.equal(captured.url.includes('dummy-test-token'),false);
});
test('recusa upstream 403 sem devolver dados privados',async()=>{
 const fetchImpl=async()=>({ok:false,status:403});
 await assert.rejects(()=>getInfinitumPublicResource({token:'dummy-test-token',resource:'organizations',fetchImpl}),e=>e.status===403);
});
