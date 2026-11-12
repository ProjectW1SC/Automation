import test from'node:test';import assert from'node:assert/strict';
import{buildAgendaEvents,weekDates,agendaStats}from'../lib/blackhole-agenda.mjs';
const today='2026-11-12';
test('agenda consolida prazos, retornos, tarefas e audiências sem inventar horários',()=>{
 const events=buildAgendaEvents({
  today,
  deadlines:[
   {id:'d1',title:'Contestação',due_on:'2026-11-13',kind:'prazo',status:'aberto',priority:'alta',verified:true,source:'DJEN',case_id:'c1'},
   {id:'d2',title:'Audiência de instrução',due_on:'2026-11-15',kind:'audiencia',status:'aberto',verified:false,case_id:'c1'},
   {id:'d3',title:'Audiência passada',due_on:'2026-11-10',kind:'audiencia',status:'aberto'},
   {id:'d4',title:'Prazo vencido',due_on:'2026-11-08',kind:'prazo',status:'aberto'},
  ],
  clients:[{id:'u1',name:'Maria Silva',status:'ativo',next_return:'2026-11-14'}],
  cases:[{id:'c1',client_id:'u1',title:'Ação cível',process_number:'0001234-56.2026.8.26.0100',status:'ativo',next_review:'2026-11-16'}],
  snapshots:[]
 });
 assert.equal(events.length,5);
 assert.equal(events.filter(x=>x.kind==='audiencia').length,1);
 assert.equal(events.find(x=>x.id==='d2').time,null);
 assert.equal(events.find(x=>x.id==='d1').clientName,'Maria Silva');
 assert.equal(events.find(x=>x.id==='d4').overdue,true);
});
test('agenda usa apenas audiências futuras expressas em publicação oficial e elimina duplicatas',()=>{
 const snapshots=[
  {process_number:'0001234-56.2026.8.26.0100',source:'DJEN',checked_at:'2026-11-12T10:00:00Z',payload:{items:[
   {title:'Audiência de conciliação designada para 20/11/2026 às 14:30',description:'Comparecer à audiência.',link:'https://esaj.tjsp.jus.br/a'},
   {title:'Audiência de conciliação designada para 20/11/2026 às 14:30',description:'Comparecer à audiência.',link:'https://esaj.tjsp.jus.br/a'}
  ]}}
 ];
 const events=buildAgendaEvents({today,deadlines:[],clients:[],cases:[],snapshots});
 assert.equal(events.length,1);assert.equal(events[0].kind,'audiencia');assert.equal(events[0].verified,false);
});
test('semana inicia na segunda e KPIs separam vencidos de prazos futuros',()=>{
 const dates=weekDates('2026-11-12');assert.equal(dates[0],'2026-11-09');assert.equal(dates[6],'2026-11-15');
 const stats=agendaStats([
  {kind:'prazo',date:'2026-11-10',overdue:true},
  {kind:'prazo',date:'2026-11-13',overdue:false},
  {kind:'audiencia',date:'2026-11-14'},
  {kind:'retorno',date:'2026-11-15'}
 ],'2026-11-12');
 assert.equal(stats.prazos,2);assert.equal(stats.vencidos,1);assert.equal(stats.audiencias,1);assert.equal(stats.retornos,1);
});
