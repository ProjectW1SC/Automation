import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('a sidebar expande ao entrar e recolhe ao sair sem depender de foco preso num link',()=>{
 const shell=read('components/crm-shell.jsx');
 assert.match(shell,/onPointerEnter=\{[^}]*setSidebarExpanded\(true\)/);
 assert.match(shell,/onPointerLeave=\{[^}]*setSidebarExpanded\(false\)/);
 assert.doesNotMatch(shell,/if\(!sidebarRef\.current\?\.contains\(document\.activeElement\)\)setSidebarExpanded\(false\)/);
 assert.match(shell,/aria-expanded=\{sidebarExpanded\}/);
});

test('animações visíveis ocorrem na navegação e no rail no tema principal',()=>{
 const src=read('components/crm-shell.jsx');
 const style=read('app/infinitum-video-motion.css');
 assert.match(src,/usePathname/);
 assert.match(src,/data-route=/);
 assert.match(style,/\.app-sidebar\s*\{/);
 assert.match(style,/transition:\s*width\s+(?:2|3)\d\dms/);
 assert.match(style,/\.app-nav-link span/);
 assert.match(style,/opacity/);
 assert.match(style,/video-route-enter/);
 assert.match(style,/prefers-reduced-motion:reduce/);
});

test('kanban da referência mantém barra colorida fina e cartões reais editáveis e móveis',()=>{
 const style=read('app/infinitum-video-motion.css');
 const board=read('components/office-kanban.jsx');
 assert.match(style,/office-kanban-column\[data-stage=/);
 assert.match(style,/border-top:3px solid var\(--phase\)/);
 assert.match(style,/office-kanban-card/);
 assert.match(board,/onDragStart/);
 assert.match(board,/onDrop/);
 assert.match(board,/office-kanban-quickadd/);
});
