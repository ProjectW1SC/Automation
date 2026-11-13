import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildOperationalFocus} from '../lib/operational-focus.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('quadro operacional conta somente registros abertos com datas cadastradas e nunca inventa movimentos judiciais',()=>{
 const today='2026-11-13';
 const deadlines=[
  {id:'v',title:'Prazo vencido',due_on:'2026-11-12',status:'aberto',kind:'prazo'},
  {id:'h',title:'Prazo hoje',due_on:'2026-11-13',status:'aberto',kind:'tarefa'},
  {id:'f',title:'Audiência futura',due_on:'2026-11-16',status:'aberto',kind:'audiencia'},
  {id:'c',title:'Prazo já concluído',due_on:'2026-11-10',status:'concluido',kind:'prazo'},
  {id:'bad',title:'Sem data',due_on:'',status:'aberto',kind:'prazo'},
 ];
 const clients=[
  {id:'c1',name:'Cliente A',status:'ativo',next_return:'2026-11-13'},
  {id:'c2',name:'Cliente B',status:'ativo',next_return:'2026-11-10'},
  {id:'c3',name:'Cliente encerrado',status:'encerrado',next_return:'2026-11-09'},
 ];
 const cases=[
  {id:'p1',title:'Processo A',status:'ativo',next_review:'2026-11-12'},
  {id:'p2',title:'Processo encerrado',status:'encerrado',next_review:'2026-11-11'},
 ];
 const focus=buildOperationalFocus({deadlines,clients,cases},today);
 assert.equal(focus.overdue.length,1);
 assert.equal(focus.today.length,1);
 assert.equal(focus.returns.length,2);
 assert.equal(focus.reviews.length,1);
 assert.equal(focus.futureHearings.length,1);
 assert.equal(focus.overdue[0].id,'v');
 assert.deepEqual(focus.returns.map(x=>x.id),['c2','c1']);
 assert.equal(focus.today[0].id,'h');
});

test('clientes e processos mostram lista mobile, carregam progressivamente e fecham ficha via Escape',()=>{
 const ui=read('components/prestige-office-lists.jsx');
 for(const pattern of [/pr-mobile-case-list/,/pr-show-more/,/aria-modal="true"/,/keydown/,/Escape/,/pr-drawer-backdrop/,/matchMedia/,/useMemo/])assert.match(ui,pattern);
 assert.doesNotMatch(ui,/\.slice\(0,300\)/);
});

test('agenda agrupa eventos uma única vez por data, privilegia lista no celular e nunca reativa audiências passadas',()=>{
 const agenda=read('app/agenda/page.jsx');
 assert.match(agenda,/eventsByDay/);
 assert.match(agenda,/matchMedia/);
 assert.match(agenda,/view==='list'/);
 assert.match(agenda,/x\.kind==='audiencia'&&x\.due_on<today\(\)/);
 assert.doesNotMatch(agenda,/visible\.filter\(row=>row\.due_on===day\)/);
});

test('uma única camada responsiva final ajusta toque, contraste, modais e WhatsApp sem cortar a tela',()=>{
 const layout=read('app/layout.jsx');
 const responsive=read('app/crm-responsive-themes.css');
 assert.ok(layout.lastIndexOf("import './crm-responsive-themes.css'")>layout.lastIndexOf("import './infinitum-video-motion.css'"));
 for(const pattern of [/--crm-touch/,/pr-detail-drawer/,/pr-mobile-case-list/,/wa-chat-layout/,/pr-list-table/,/prefers-reduced-motion/,/focus-visible/])assert.match(responsive,pattern);
 assert.doesNotMatch(responsive,/\.wa-chat-layout\{height:calc\(100dvh - 235px\)!important/);
});

test('navegação móvel identifica a rota ativa para leitores de tela',()=>{
 const shell=read('components/crm-shell.jsx');
 assert.match(shell,/aria-current=\{pathname===href\?'page':undefined\}/);
 assert.match(shell,/setMobileMenuOpen\(false\)/);
});
