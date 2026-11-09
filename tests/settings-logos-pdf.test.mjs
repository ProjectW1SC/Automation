import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_AREAS,crmAreaHref} from '../lib/crm-navigation.mjs';
import {getInstitutionBrand,normalizeInstitutionName} from '../lib/institution-brands.mjs';
import {validateProfileName,validateAvatarFile,avatarPathFor,validatePasswordChange} from '../lib/profile-settings.mjs';
import {reportPrintSections,reportHealthNotes} from '../lib/report-print.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('the menu has one authenticated settings screen',()=>{
 assert.equal(CRM_AREAS.filter(x=>x.label==='Configurações').length,1);
 assert.equal(crmAreaHref('Configurações'),'/configuracoes');
 const page=file('app/configuracoes/page.jsx');
 assert.match(page,/CrmShell/);
 assert.match(page,/changePassword/);
 assert.match(page,/updateUser/);
 assert.match(page,/crm-profile-photos/);
 assert.match(page,/CRM_THEMES/);
});

test('bank brands are known, normalized and do not guess unrelated institutions',()=>{
 assert.equal(normalizeInstitutionName('  BANCO  ITAÚ S.A.  '),'banco itau sa');
 assert.equal(getInstitutionBrand('Itaú')?.domain,'itau.com.br');
 assert.equal(getInstitutionBrand('Banco Bradesco')?.domain,'bradesco.com.br');
 assert.equal(getInstitutionBrand('Santander')?.domain,'santander.com.br');
 assert.equal(getInstitutionBrand('Banco PAN')?.domain,'bancopan.com.br');
 assert.equal(getInstitutionBrand('Banco desconhecido'),null);
 const logo=file('components/institution-logo.jsx');
 assert.match(logo,/onError/);
 assert.match(logo,/alt=/);
 const ui=file('components/reference-pages.jsx');
 assert.match(ui,/InstitutionLogo/);
 assert.match(ui,/reference-institution-logo/);
});

test('name, photo and password validations reject unsafe input',()=>{
 assert.equal(validateProfileName('  Operador de Negociações  '),'Operador de Negociações');
 assert.throws(()=>validateProfileName('  '),/nome/i);
 assert.throws(()=>validateAvatarFile({size:4000,type:'image/svg+xml'}),/imagem/i);
 assert.throws(()=>validateAvatarFile({size:3*1024*1024,type:'image/jpeg'}),/2 MB/i);
 assert.equal(avatarPathFor('12345678-1234-1234-1234-123456789000','image/png','id1'),'12345678-1234-1234-1234-123456789000/id1.png');
 assert.throws(()=>avatarPathFor('../bad','image/png','id1'),/usuário/i);
 assert.throws(()=>validatePasswordChange('A123456789b','A123456789c'),/coincidem/i);
 assert.equal(validatePasswordChange('NovaSenha-2026!','NovaSenha-2026!'),'NovaSenha-2026!');
});

test('profile photos use a private storage bucket and own user path only',()=>{
 const sql=file('supabase/migrations/20261109_011_profile_photos.sql');
 assert.match(sql,/crm-profile-photos/);
 assert.match(sql,/public\s*,\s*file_size_limit|public\s*=\s*false/i);
 assert.match(sql,/storage\.foldername\(name\)/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/for select to authenticated/i);
 assert.match(sql,/for insert to authenticated/i);
 assert.match(sql,/for delete to authenticated/i);
 assert.doesNotMatch(sql,/security definer/i);
});

test('report PDF has dedicated A4 multi-page layout with no fictional numbers',()=>{
 const css=file('app/report-print.css'),view=file('components/report-print-document.jsx'),page=file('app/report/page.jsx');
 assert.match(css,/@page\s*\{[^}]*A4/s);
 assert.match(css,/page-break-after|break-after/);
 assert.match(css,/print-color-adjust/);
 assert.match(view,/report\.portfolio\.total/);
 assert.match(view,/report\.daily/);
 assert.match(view,/reportHealthNotes/);
 assert.match(view,/Dados restritos/);
 assert.match(page,/ReportPrintDocument/);
 assert.match(page,/window\.print/);
 assert.deepEqual(reportPrintSections(['capa','resumo','operacao','metodologia']).length,4);
 assert.ok(reportHealthNotes({incomplete:true}).some(x=>/parcial/i.test(x)));
});

test('profile in shell uses stored display name and private signed avatar',()=>{
 const shell=file('components/crm-shell.jsx');
 assert.match(shell,/display_name/);
 assert.match(shell,/avatar_path/);
 assert.match(shell,/createSignedUrl/);
 assert.match(shell,/Configurações/);
});
