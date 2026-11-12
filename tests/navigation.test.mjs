import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_AREAS,crmAreaHref,areaFromQuery} from '../lib/crm-navigation.mjs';

test('uma única navegação, com Tarefas como aba de primeiro nível',()=>{
 assert.deepEqual(CRM_AREAS.map(x=>x.label),['Visão geral','Tarefas','Clientes','Processos','Audiências','Veredito','Finalizados','Instituições','Minhas atividades','Relatórios','Configurações']);
 assert.equal(CRM_AREAS.filter(x=>x.label==='Tarefas').length,1);
 assert.equal(crmAreaHref('Tarefas'),'/tarefas');
 assert.equal(crmAreaHref('Clientes'),'/?aba=clientes');
});
test('abas da carteira mantêm o endereço e a seleção ao voltar das tarefas',()=>{
 assert.equal(areaFromQuery('?aba=clientes'),'Clientes');
 assert.equal(areaFromQuery('?aba=revisar'),'Finalizados');
 assert.equal(areaFromQuery('?aba=instituicoes'),'Instituições');
 assert.equal(areaFromQuery(''),'Visão geral');
 assert.equal(areaFromQuery('?aba=naoexiste'),'Visão geral');
});
test('páginas autenticadas compartilham uma única estrutura',()=>{
 const home=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
 const tasks=readFileSync(new URL('../app/tarefas/page.jsx',import.meta.url),'utf8');
 const sidebar=readFileSync(new URL('../components/crm-shell.jsx',import.meta.url),'utf8');
 assert.match(home,/<CrmShell\b/);
 assert.match(tasks,/<CrmShell\b/);
 assert.doesNotMatch(home,/className="layout"><aside/);
 assert.doesNotMatch(tasks,/<aside className="task-sidebar"/);
 assert.match(sidebar,/aria-label="Navegação principal"/);
});
test('filas vencidos e finalizados são filtros internos e não outro menu lateral',()=>{
 const tasks=readFileSync(new URL('../app/tarefas/page.jsx',import.meta.url),'utf8');
 assert.match(tasks,/className="task-queue-tabs"/);
 assert.match(tasks,/go\('vencidos'\)/);
 assert.doesNotMatch(tasks,/task-side-item/);
});
