import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Google login mantém sessão única Supabase e explica dependência do provedor',()=>{
 const secured=read('components/secured-workspace.jsx');
 assert.match(secured,/signInWithOAuth\(\{provider:'google'/);
 assert.match(secured,/googleEnabled===false/);
 assert.match(secured,/auth-google-help/);
 assert.doesNotMatch(secured,/signInWithPopup|firebase\/auth/);
});

test('um CAPTCHA judicial bloqueado nunca é relatado como consulta concluída',async()=>{
 const {classifyOfficialAccess,officialAccessHelp}=await import('../lib/official-access-guidance.mjs');
 assert.equal(classifyOfficialAccess({status:403,message:'Forbidden'}),'blocked');
 assert.equal(classifyOfficialAccess({status:429}),'rate_limited');
 assert.equal(classifyOfficialAccess({message:'CAPTCHA required'}),'human_verification');
 assert.equal(classifyOfficialAccess({status:503}),'unavailable');
 const help=officialAccessHelp({status:403},'djen');
 assert.equal(help.confirmed,false);
 assert.equal(help.action,'manual_check');
 assert.equal(help.url,'https://comunica.pje.jus.br/');
 assert.match(help.message,/acesso|validação/i);
 const normal=officialAccessHelp({status:503},'datajud');
 assert.equal(normal.action,'retry_later');
});

test('gerador de processos oferece consulta oficial assistida, não resolvedor clandestino',()=>{
 const generator=read('app/gerador-processos/page.jsx');
 assert.match(generator,/officialAccessHelp/);
 assert.match(generator,/href=\{accessHelp.url\}/);
 assert.match(generator,/target="_blank"/);
 assert.match(generator,/CAPTCHA/);
 assert.doesNotMatch(generator,/2captcha|anticaptcha|captchaBypass/i);
});

test('Kanban móvel tem abas verdadeiras para etapa e mudança por toque sem drag-and-drop',()=>{
 const board=read('components/office-kanban.jsx');
 const css=read('app/infinitum-video-motion.css');
 assert.match(board,/office-mobile-stage-tabs/);
 assert.match(board,/aria-selected=\{mobileStageSelected===stage.key\}/);
 assert.match(board,/data-mobile-current=\{stage.key===mobileStageSelected\}/);
 assert.match(board,/aria-label=\{'Mover cartão/);
 assert.match(css,/\.office-kanban-column\[data-mobile-current="true"\]/);
 assert.match(css,/\.office-mobile-stage-tabs/);
});

test('interação no celular evita modais fora da tela e oferece área de toque suficiente',()=>{
 const css=read('app/infinitum-video-motion.css');
 assert.match(css,/@media\(max-width:840px\)/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/\.reference-table-wrap/);
 assert.match(css,/\.dialog-inner/);
});
