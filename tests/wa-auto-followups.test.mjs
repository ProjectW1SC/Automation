
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('superagente não grava task curta que viola office_agent_runs_task_check',()=>{const s=readFileSync(new URL('../app/superagente/page.jsx',import.meta.url),'utf8');assert.match(s,/q\.length<3\?'Pergunta: '/);});
test('audiências passadas não são exibidas na fila operacional',()=>{const s=readFileSync(new URL('../components/office-console.jsx',import.meta.url),'utf8');assert.match(s,/x\.kind==='audiencia'&&x\.due_on>=/);});
