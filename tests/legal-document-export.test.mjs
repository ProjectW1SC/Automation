import test from 'node:test';import assert from 'node:assert/strict';
import {createLegalDocx,buildLegalPrintHtml,petitionParagraphs,readStationery} from '../lib/legal-document-export.mjs';
test('exportacao DOCX inicia com arquivo ZIP Office Open XML, sem TXT WordPad',()=>{
 const doc=createLegalDocx('AO JUÍZO COMPETENTE\n\nI — DOS FATOS\nTexto com acento: São Paulo & ação.',{firm:'W1 CAPITAL',lawyer:'Dra. Teste',state:'SP',oab:'12345',accent:'#5b2639'});
 assert.equal(String.fromCharCode(...doc.slice(0,4)),'PK\x03\x04');
 const raw=new TextDecoder().decode(doc);
 for(const x of ['[Content_Types].xml','word/document.xml','word/styles.xml','word/header1.xml','word/footer1.xml','AO JUÍZO COMPETENTE','DOS FATOS','W1 CAPITAL','OAB/SP'])assert.ok(raw.includes(x),'Ausente: '+x);
});
test('o PDF A4 tem layout autonomo, texto escapado e quebra de pagina',()=>{
 const h=buildLegalPrintHtml('I — DOS PEDIDOS\n\nNão inserir <script>alert(1)</script>',{firm:'W1',accent:'#111111'});
 assert.match(h,/@page\{size:A4/);assert.match(h,/break-after:avoid/);
 assert.ok(h.includes('&lt;script&gt;'));assert.ok(!h.includes('<script>'));
});
test('secoes e lacunas mantem texto e estilos juridicos',()=>{
 const p=petitionParagraphs('AO JUÍZO\n\nI — DOS FATOS\nDescrição.\n\nPede deferimento.');
 assert.equal(p[0].type,'heading');assert.equal(p.find(x=>x.text==='Descrição.').type,'normal');
 assert.equal(p.at(-1).type,'center');
});
test('preferencias nao usam conteudo malicioso para CSS',()=>{
 const prefs=readStationery({getItem:()=>JSON.stringify({font:'url(javascript:x)',accent:'red',size:75})});
 assert.equal(prefs.accent,'#5b2639');assert.equal(prefs.font,'Georgia');assert.equal(prefs.size,16);
});
