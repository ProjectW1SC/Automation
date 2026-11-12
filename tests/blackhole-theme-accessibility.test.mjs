import test from'node:test';import assert from'node:assert/strict';import{CRM_THEMES,contrastRatio}from'../lib/crm-themes.mjs';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('todos os temas mantêm WCAG AA nos pares de texto e superfície e botões',()=>{
 const pairs=[['ink','surface'],['muted','surface'],['accentInk','accent'],['navInk','nav'],['tintInk','tint'],['warningInk','warningBg'],['successInk','successBg'],['dangerInk','dangerBg'],['neutralInk','neutralBg']];
 const failures=[];
 for(const theme of CRM_THEMES)for(const pair of pairs){const fg=pair[0],bg=pair[1],ratio=contrastRatio(theme[fg],theme[bg]);if(ratio<4.5)failures.push(theme.id+'.'+fg+'/'+bg+'='+ratio.toFixed(2))}
 assert.deepEqual(failures,[]);
});
test('shell respeita tema salvo e não força blackhole em toda autenticação',()=>{
 const shell=read('components/crm-shell.jsx');
 assert.match(shell,/projectw1sc\.crm-theme/);
 assert.doesNotMatch(shell,/setTheme\('blackhole'\)/);
 assert.doesNotMatch(shell,/data-crm-theme='blackhole'/);
});
test('sistema de contraste usa tokens semânticos em telas, formulários, tabelas e estados',()=>{
 const css=read('app/contrast-system.css');
 for(const x of ['--ui-page','--ui-surface','--ui-ink','--ui-muted','--ui-border','--ui-accent','--ui-accent-ink','color-scheme','inf-studio','office-ai-message-body','inf-table','office-login-form'])assert.ok(css.includes(x),x);
});
