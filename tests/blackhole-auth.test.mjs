import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {withAuthDeadline} from '../lib/auth-deadline.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('sessão não trava a interface indefinidamente',async()=>{
 await assert.rejects(withAuthDeadline(new Promise(()=>{}),25),e=>e?.code==='AUTH_TIMEOUT');
 assert.equal(await withAuthDeadline(Promise.resolve('ok'),25),'ok');
});
test('auth chama getSession antes de onAuthStateChange e mostra opção de tentar novamente',()=>{
 const provider=read('components/workspace-session-provider.jsx');
 const effect=provider.slice(provider.indexOf('useEffect(()=>{'));
 assert.ok(effect.indexOf('auth.getSession()')>=0);
 assert.ok(effect.indexOf('auth.getSession()')<effect.indexOf('auth.onAuthStateChange('));
 assert.match(provider,/withAuthDeadline/);
 assert.match(read('components/secured-workspace.jsx'),/Tentar novamente/);
});
test('verificação de membro tem prazo e relata falha separada de acesso negado',()=>{
 const s=read('lib/use-crm-access.js');assert.match(s,/withAuthDeadline/);assert.match(s,/error:/);
});
