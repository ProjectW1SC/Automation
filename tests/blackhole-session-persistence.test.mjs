import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('sessão Supabase persiste no layout enquanto Next Link troca abas',()=>{
 const layout=read('app/layout.jsx'),provider=read('components/workspace-session-provider.jsx');
 assert.match(layout,/WorkspaceSessionProvider/);
 assert.match(provider,/onAuthStateChange/);
 assert.match(provider,/useCrmAccess/);
 assert.match(provider,/getSession/);
});
test('abas compartilham o contexto, sem revalidar o acesso a cada montagem',()=>{
 const ui=read('components/secured-workspace.jsx');
 assert.match(ui,/useWorkspaceSession/);
 assert.doesNotMatch(ui,/onAuthStateChange/);
 assert.doesNotMatch(ui,/useCrmAccess/);
});
