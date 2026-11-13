import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {buildLegalPrintHtml} from '../lib/legal-document-export.mjs';
import {CRM_THEMES,contrastRatio} from '../lib/crm-themes.mjs';
test('DOM real da peça mantém timbre, texto sem scripts e A4',()=>{
 const source=buildLegalPrintHtml('AO JUÍZO COMPETENTE\n\nI — DOS FATOS\n<svg onload=alert(1)>',{firm:'Infinitum Jurídico',lawyer:'Teste OAB',oab:'1234',state:'SP'});
 const doc=new JSDOM(source).window.document;
 assert.match(doc.querySelector('style')?.textContent||'',/@page\{size:A4/);
 assert.equal(doc.querySelectorAll('script,svg[onload]').length,0);
 assert.match(doc.querySelector('header strong')?.textContent||'',/Infinitum/);
 assert.equal(doc.querySelector('.paper .heading')?.textContent,'AO JUÍZO COMPETENTE');
 assert.match(doc.body.textContent,/OAB\/SP/);
});
test('DOM de painel responsivo respeita identificação Infinitum e contraste',()=>{
 const p=CRM_THEMES[0];const dom=new JSDOM('<!doctype html><html data-crm-theme="infinitum"><body><aside aria-label="Navegação">Infinitum</aside><main id="dashboard"></main></body></html>');
 assert.equal(dom.window.document.documentElement.dataset.crmTheme,'infinitum');
 assert.equal(dom.window.document.querySelectorAll('main').length,1);
 for(const [fg,bg] of [['ink','surface'],['navInk','nav'],['accentInk','accent']])assert.ok(contrastRatio(p[fg],p[bg])>=4.5);
});
