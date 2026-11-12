import test from 'node:test';import assert from 'node:assert/strict';
import {createOfficeAuthStorage,getRememberOfficeSession,setRememberOfficeSession} from '../lib/supabase-office-storage.mjs';
const area=()=>{const store=new Map();return {getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};
test('lembrar sessão guarda token no armazenamento persistente',()=>{
 const w={localStorage:area(),sessionStorage:area()};
 assert.equal(getRememberOfficeSession(w),true);
 const s=createOfficeAuthStorage(w);s.setItem('session','abc');
 assert.equal(w.localStorage.getItem('session'),'abc');
});
test('sem lembrar: token fica só até a sessão terminar e remove token antigo',()=>{
 const w={localStorage:area(),sessionStorage:area()};const s=createOfficeAuthStorage(w);
 s.setItem('session','legacy');setRememberOfficeSession(false,w);s.setItem('session','ephemeral');
 assert.equal(w.localStorage.getItem('session'),null);
 assert.equal(w.sessionStorage.getItem('session'),'ephemeral');
 assert.equal(s.getItem('session'),'ephemeral');s.removeItem('session');assert.equal(s.getItem('session'),null);
});
