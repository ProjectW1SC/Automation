import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBrowserOfficialResult,browserResultNeedsServerFallback} from '../lib/blackhole-browser-official-result.mjs';

const number='3002816-74.2026.8.06.0154';
const datajud={ok:true,source:'DataJud',number,court:'TJCE',via:'navegador',
 checkedAt:'2026-11-13T12:00:00.000Z',found:true,
 items:[{id:'dj-132',source:'DataJud',date:'2026-11-12T12:00:00.000Z',title:'Distribuição',description:'',link:null}]};

test('scanner aceita resultado DataJud do navegador somente para o CNJ e tribunal corretos',()=>{
 const value=validateBrowserOfficialResult(datajud,{source:'datajud',number});
 assert.equal(value.ok,true);assert.equal(value.via,'navegador');assert.equal(value.court,'TJCE');
 assert.equal(value.items[0].source,'DataJud');
});
test('scanner rejeita resposta do navegador de outro processo ou outra corte',()=>{
 assert.equal(validateBrowserOfficialResult({...datajud,number:'1001218-36.2026.5.02.0040'},{source:'datajud',number}),null);
 assert.equal(validateBrowserOfficialResult({...datajud,court:'TST'},{source:'datajud',number}),null);
});
test('scanner rejeita itens sem origem e payloads não verificáveis',()=>{
 assert.equal(validateBrowserOfficialResult({...datajud,items:[{title:'falso'}]},{source:'datajud',number}),null);
 assert.equal(validateBrowserOfficialResult({...datajud,via:'servidor'},{source:'datajud',number}),null);
 assert.equal(validateBrowserOfficialResult({...datajud,checkedAt:'data inválida'},{source:'datajud',number}),null);
});
test('resposta pública validada permite persistência limitada sem link externo arbitrário',()=>{
 const value=validateBrowserOfficialResult({...datajud,items:[{...datajud.items[0],link:'https://evil.example/track'}]},{source:'datajud',number});
 assert.equal(value.items[0].link,null);
 assert.equal(value.items.length,1);
});
test('403 e 429 do navegador não acionam fallback do servidor; CORS e timeout permitem fallback',()=>{
 assert.equal(browserResultNeedsServerFallback({ok:false,status:403}),false);
 assert.equal(browserResultNeedsServerFallback({ok:false,status:429}),false);
 assert.equal(browserResultNeedsServerFallback({ok:false,reason:'network_error'}),true);
 assert.equal(browserResultNeedsServerFallback({ok:false,reason:'timeout'}),true);
});
