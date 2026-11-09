import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('motion design has shared tokens and no paid external library or remote stylesheet',()=>{
 const css=read('app/motion-system.css');
 assert.match(css,/--motion-fast:/);
 assert.match(css,/--motion-standard:/);
 assert.match(css,/--crm-accent:/);
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
 assert.doesNotMatch(css,/@import\s+url\(/i);
});
test('all animated controls provide visible focus and reduced-motion fallback',()=>{
 const css=read('app/motion-system.css');
 assert.match(css,/:focus-visible/);
 assert.match(css,/scroll-behavior:\s*auto/);
 assert.match(css,/animation-duration:\s*0\.01ms/);
 assert.match(css,/\.app-nav-link\[aria-current="page"\]::before/);
 assert.match(css,/\.task-queue-tabs button\.active::after/);
});
test('overview and tasks use single shared motion system and semantic real-time feedback',()=>{
 const app=read('app/layout.jsx');
 const shell=read('components/crm-shell.jsx');
 const tasks=read('app/tarefas/page.jsx');
 assert.match(app,/\.\/motion-system\.css/);
 assert.match(shell,/aria-label="Navegação principal"/);
 assert.match(tasks,/aria-live="polite"/);
 assert.match(tasks,/sales-workspace/);
 assert.match(read("app/sales-workspace.css"),/sales-contact-card/);
});
test('no decorative continuous animation on task cards or fake performance metrics',()=>{
 const css=read('app/motion-system.css');
 assert.doesNotMatch(css,/animation:\s*(?:.+\s)?infinite\s*;/i);
 assert.match(css,/\.task-metric/);
 assert.match(css,/\.task-item/);
});
