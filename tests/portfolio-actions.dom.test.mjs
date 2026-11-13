import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';

// Compile the real JSX through the same compiler as Next, without a second test toolchain.
const require=createRequire(import.meta.url);
const {transformSync}=require('next/dist/build/swc');
for(const ext of ['.jsx','.tsx'])require.extensions[ext]=(mod,filename)=>{
 const {code}=transformSync(readFileSync(filename,'utf8'),{
  filename,jsc:{parser:{syntax:ext==='.tsx'?'typescript':'ecmascript',tsx:ext==='.tsx',jsx:true},
   transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'},
 });
 mod._compile(code,filename);
};
const LexisSharedOffice=require('../components/lexis-shared-office.jsx').default;

function mockDatabase(){
 const user={id:'profile-a',auth_user_id:'user-a',empresa_id:'company-a',nome:'Operadora de teste'};
 const records=Array.from({length:75},(_,i)=>({id:i+1,empresa_id:'company-a',cliente:'Cliente '+(i+1),
  protocolo_ref:'0000000-00.2026.8.26.0100',status_interno:'EM ANDAMENTO',tribunal:'TJSP'}));
 const writes=[],calls=[],history=[];
 let rejectUpdate=false,rejectAttendance=false;
 return {records,writes,calls,history,
  auth:{async getSession(){return {data:{session:{access_token:'test-session'}}}}},
  failEdit(value){rejectUpdate=value},failAttendance(value){rejectAttendance=value},
  from(table){
   const filters={};let patch=null;
   const q={
    select(){return q},eq(k,v){filters[k]=v;return q},limit(){return q},order(){return q},or(){return q},range(){return q},
    update(values){patch=values;return q},
    maybeSingle(){return q},
    then(resolve,reject){
     if(table==='tarefas_realizadas')return new Promise(done=>history.push({id:filters.processo_id,done})).then(resolve,reject);
     let result;
     if(table==='usuarios')result={data:[user]};
     else if(table==='empresas')result={data:{nome:'Empresa de teste'}};
     else if(table==='crm_judicial_snapshots')result={data:[]};
     else if(table==='processos'&&patch){
      writes.push({filters:{...filters},patch});
      if(rejectUpdate)result={data:null,error:{message:'Edição bloqueada no teste'}};
      else{Object.assign(records.find(r=>r.id===filters.id),patch);result={data:{id:filters.id}}}
     }else result={data:records.map(r=>({...r})),count:records.length};
     return Promise.resolve(result).then(resolve,reject);
    }
   };return q;
  },
  async rpc(name,values){calls.push({name,values});return rejectAttendance?{error:{message:'Atendimento bloqueado no teste'}}:
   {data:{ok:true,responsavel:user.nome,ultimo_atendimento:'2026-11-13',proximo_atendimento:values.p_proximo_retorno}}}
 };
}

// JSDOM does not implement the browser's top layer. Model only open/close here;
// the test still exercises the real clicks, forms, async results and persistence payloads.
test('portfolio actions open immediately, save the correct record and retain failures in the dialog',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{url:'http://localhost/'});
 const old={window:global.window,document:global.document,HTMLElement:global.HTMLElement,self:global.self,fetch:global.fetch};
 Object.assign(global,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
 const {createRoot}=await import('react-dom/client');
 const db=mockDatabase(),root=createRoot(document.querySelector('#app'));
 const button=(name,scope=document)=>[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()===name);
 const click=async target=>{assert.ok(target);await act(async()=>target.click())};
 const change=async(el,value)=>{await act(async()=>{
  Object.getOwnPropertyDescriptor(dom.window[el.tagName==='TEXTAREA'?'HTMLTextAreaElement':'HTMLInputElement'].prototype,'value').set.call(el,value);
  el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
 })};
 const submit=async form=>{await act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})))};
 const dialog=()=>document.querySelector('dialog[open]');
 try{
  await act(async()=>root.render(React.createElement(LexisSharedOffice,{area:'cases',db,session:{user:{id:'user-a'}}})));
  assert.equal(document.querySelectorAll('.lx-process-record').length,75);
  const first=document.querySelector('.lx-process-record');
  await click(button('Editar cliente',first));
  assert.match(dialog().textContent,/Editar cliente/);
  assert.equal(document.activeElement,dialog().querySelector('input'));
  assert.equal(document.body.style.overflow,'hidden');
  const client=dialog().querySelector('input');
  // Native input events are wired before mounting; update through the React input tracker.
  await change(client,'Cliente atualizado');
  await submit(dialog().querySelector('form'));
  assert.equal(dialog(),null);
  assert.equal(db.writes[0].patch.cliente,'Cliente atualizado');
  assert.deepEqual(db.writes[0].filters,{id:1,empresa_id:'company-a'});
  assert.equal(document.body.style.overflow,'');
  await click(button('Editar processo',document.querySelector('.lx-process-record')));
  db.failEdit(true);
  await submit(dialog().querySelector('form'));
  assert.match(dialog().querySelector('[role="status"]').textContent,/Edição bloqueada/);
  assert.equal(button('Salvar alterações',dialog()).disabled,false);
  await click(button('Cancelar',dialog()));
  db.failEdit(false);
  await click(button('Editar processo',document.querySelector('.lx-process-record')));
  const tribunal=[...dialog().querySelectorAll('label')].find(el=>el.textContent==='Tribunal').querySelector('input');
  await change(tribunal,'TRT de teste');
  await submit(dialog().querySelector('form'));
  assert.equal(dialog(),null);
  assert.equal(db.writes.at(-1).patch.tribunal,'TRT de teste');
  assert.equal(db.writes.at(-1).patch.status_interno,'EM ANDAMENTO');
  assert.deepEqual(db.writes.at(-1).filters,{id:1,empresa_id:'company-a'});
  assert.equal(db.writes.at(-1).patch.telefone,undefined,'process editing does not blank client-only fields');
  await click(button('Registrar atendimento',document.querySelector('.lx-process-record')));
  assert.ok(dialog(),'opens before the history request resolves');
  assert.match(dialog().textContent,/Carregando histórico/);
  await change(dialog().querySelector('textarea'),'Atendimento de teste realizado');
  db.failAttendance(true);
  await submit(dialog().querySelector('form'));
  assert.match(dialog().querySelector('.lx-dialog-notice').textContent,/Atendimento bloqueado/);
  assert.equal(dialog().querySelector('textarea').value,'Atendimento de teste realizado');
  db.failAttendance(false);
  await submit(dialog().querySelector('form'));
  assert.equal(dialog(),null);
  assert.equal(db.calls.at(-1).name,'infinitum_registrar_atendimento');
  assert.equal(db.calls.at(-1).values.p_processo_id,1);
  assert.equal(db.calls.at(-1).values.p_descricao,'Atendimento de teste realizado');
  // A late history response from record 1 cannot appear in record 2's dialog.
  const second=document.querySelectorAll('.lx-process-record')[1];
  await click(button('Registrar atendimento',second));
  await act(async()=>db.history[0].done({data:[{id:9,descricao:'Histórico do cliente anterior',data_realizacao:'2026-11-13'}]}));
  assert.doesNotMatch(dialog().textContent,/Histórico do cliente anterior/);
  await act(async()=>db.history[1].done({data:[]}));
  const cancel=new dom.window.Event('cancel',{cancelable:true});
  await act(async()=>dialog().dispatchEvent(cancel));
  assert.equal(dialog(),null);
  // Reproduce the reported screen: empty DJEN + unavailable DataJud, but four saved attendances.
  global.fetch=async()=>new Response(JSON.stringify({ok:true,items:[],partial:true,sourceStatus:{djen:'ok',datajud:'unavailable'},
   sourceErrors:{datajud:'A função regional não foi encontrada.'}}),{status:200});
  await click(button('Consultar',document.querySelector('.lx-process-record')));
  assert.match(dialog().textContent,/Histórico judicial não confirmado/);
  assert.match(dialog().textContent,/A função regional não foi encontrada/);
  assert.match(dialog().textContent,/DJEN: publicações de/);
  await act(async()=>db.history.at(-1).done({data:Array.from({length:4},(_,i)=>({id:'att-'+i,descricao:'Atendimento salvo '+i,categoria:'atendimento',data_realizacao:'2026-11-13'}))}));
  assert.match(dialog().textContent,/Histórico de atendimentos e atividades \(4\)/);
  assert.match(dialog().textContent,/Atendimento salvo 3/);
  await click(button('Fechar',dialog()));
  assert.equal(dialog(),null);
 }finally{
  await act(async()=>root.unmount());dom.window.close();Object.assign(global,old);delete global.IS_REACT_ACT_ENVIRONMENT;
 }
});

test('judicial events retain the official calendar date, full description and only official links',async()=>{
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {JudicialEvents}=require('../components/judicial-consultation-result.jsx');
 const description='Teor completo da publicação. '.repeat(35)+'FIM DO TEOR';
 const html=renderToStaticMarkup(React.createElement(JudicialEvents,{items:[{id:'pub',source:'DJEN',date:'2026-11-13T00:00:00.000Z',title:'Intimação',description,link:'https://comunica.pje.jus.br/consulta?hash=teste'},{id:'unsafe',source:'DJEN',title:'Outro',link:'javascript:alert(1)'}]}));
 assert.match(html,/13\/11\/2026/);assert.match(html,/FIM DO TEOR/);
 assert.match(html,/href="https:\/\/comunica\.pje\.jus\.br/);assert.doesNotMatch(html,/javascript:/);
});
