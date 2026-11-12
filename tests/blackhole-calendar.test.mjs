import test from 'node:test';import assert from 'node:assert/strict';
import{createIcsEvent}from'../lib/blackhole-free-integrations.mjs';
test('agenda sem API gera ICS com evento de dia inteiro',()=>{
 const content=createIcsEvent({title:'Audiência de teste',date:'2026-11-18',uid:'teste'});
 assert.match(content,/BEGIN:VCALENDAR/);assert.match(content,/DTSTART;VALUE=DATE:20261118/);
 assert.match(content,/DTEND;VALUE=DATE:20261119/);assert.match(content,/SUMMARY:Audiência de teste/);
});
test('evento inválido não gera arquivo',()=>{assert.throws(()=>createIcsEvent({title:'',date:'2026-11-18'}));assert.throws(()=>createIcsEvent({title:'R',date:'wrong'}))});
