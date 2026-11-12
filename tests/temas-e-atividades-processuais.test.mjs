import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCompletedActivity,toActivityUpdate,formatCNJ} from '../lib/minhas-atividades.mjs';
import {CRM_THEMES,resolveTheme,contrastRatio} from '../lib/crm-themes.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

const example={title:'Atividade processual realizada',category:'analise_processual',date:'2026-11-09'};

test('o numero do processo CNJ pode ser digitado com ou sem mascara e tipo definido',()=>{
 assert.equal(formatCNJ('10012183620265020040'),'1001218-36.2026.5.02.0040');
 assert.equal(formatCNJ('1001218-36.2026.5.02.0040'),'1001218-36.2026.5.02.0040');
 const activity=validateCompletedActivity({...example,processNumber:'10012183620265020040',processType:'busca_apreensao'},'2026-11-09');
 assert.deepEqual({process_number:activity.process_number,process_type:activity.process_type},{process_number:'1001218-36.2026.5.02.0040',process_type:'busca_apreensao'});
 assert.equal(validateCompletedActivity({...example,processNumber:'',processType:''},'2026-11-09').process_number,null);
});

test('nao aceita classificacao sem processo nem numero CNJ incorreto',()=>{
 assert.throws(()=>validateCompletedActivity({...example,processNumber:'1001218-36',processType:'comum'},'2026-11-09'),/CNJ/i);
 assert.throws(()=>validateCompletedActivity({...example,processNumber:'1001218-36.2026.5.02.0040'},'2026-11-09'),/tipo/i);
 assert.throws(()=>validateCompletedActivity({...example,processType:'comum'},'2026-11-09'),/número/i);
 assert.throws(()=>validateCompletedActivity({...example,processNumber:'10012183620265020040',processType:'criminal'},'2026-11-09'),/tipo/i);
});

test('editar mantem os mesmos campos validos e nao altera autor, origem ou data de criacao',()=>{
 const result=toActivityUpdate({...example,description:'Revisei o processo',processNumber:'1001218-36.2026.5.02.0040',processType:'comum',minutes:20,durationSeconds:1200},'2026-11-09');
 assert.equal(result.process_type,'comum');
 assert.equal(result.process_number,'1001218-36.2026.5.02.0040');
 for(const forbidden of ['actor_id','origin','created_at','deleted_at','id'])assert.ok(!(forbidden in result));
});

test('todos os temas possuem contraste WCAG AA para texto, legenda, botoes, menus e etiquetas',()=>{
 assert.ok(CRM_THEMES.length>=5);
 assert.ok(new Set(CRM_THEMES.map(x=>x.id)).size===CRM_THEMES.length);
 assert.equal(resolveTheme('tema-inexistente'),'blackhole');
 for(const theme of CRM_THEMES){
  for(const [text,bg] of [['ink','surface'],['muted','surface'],['accentInk','accent'],['navInk','nav'],['tintInk','tint'],['dangerInk','dangerBg'],['successInk','successBg'],['warningInk','warningBg']]){
   assert.ok(contrastRatio(theme[text],theme[bg])>=4.5,theme.id+': '+text+'/'+bg+' has '+contrastRatio(theme[text],theme[bg]).toFixed(2));
  }
 }
});

test('tema aparece no shell e nos estilos globais com opcao de movimento reduzido',()=>{
 const shell=file('components/crm-shell.jsx');
 const css=file('app/crm-themes.css');
 const layout=file('app/layout.jsx');
 assert.match(shell,/O tema escolhido permanece/);assert.match(shell,/crm-theme-picker/);
 assert.match(shell,/localStorage/);
 assert.match(shell,/crmTheme/);
 assert.match(layout,/crm-themes\.css/);
 assert.match(css,/\.task-board/);
 assert.match(css,/\.reference-activity-form/);
 assert.match(css,/prefers-reduced-motion/);
});

test('atividades com numero e tipo, edicao e exclusao na mesma pagina e verificadas por dono',()=>{
 const ui=file('app/minhas-atividades/page.jsx');
 assert.match(ui,/Número do processo/);
 assert.match(file('lib/minhas-atividades.mjs'),/Busca e apreensão/);
 assert.match(ui,/Editar/);
 assert.match(ui,/Excluir/);
 assert.match(ui,/deleted_at/);
 assert.match(ui,/\.eq\('actor_id',session\.user\.id\)/);
 assert.match(ui,/window\.confirm|confirm\(/);
 const report=file('app/report/page.jsx');
 assert.match(report,/\.is\('deleted_at',null\)/);
});

test('Supabase protege edicao e exclusao logica por responsavel e preserva registros antigos',()=>{
 const sql=file('supabase/migrations/20261109_009_temas_e_atividades_processuais.sql');
 assert.match(sql,/add column if not exists process_number/i);
 assert.match(sql,/add column if not exists process_type/i);
 assert.match(sql,/add column if not exists deleted_at/i);
 assert.match(sql,/for update to authenticated/i);
 assert.match(sql,/actor_id\s*=\s*\(select auth\.uid\(\)\)/i);
 assert.match(sql,/with check/i);
 assert.doesNotMatch(sql,/security definer/i);
});
