import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isClosedLexisStatus,normalizeLexisJudicialTimeline,decorateLexisWork,normalizeCaseNumber} from '../lib/lexis-operator-data.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('ENCERRADO exibido na aba dedicada, com status exato e sem arquivamento indevido',()=>{
 assert.equal(isClosedLexisStatus('ENCERRADO'),true);
 assert.equal(isClosedLexisStatus('encerrado'),true);
 assert.equal(isClosedLexisStatus('FINALIZADO'),true);
 assert.equal(isClosedLexisStatus('EM ANDAMENTO'),false);
 assert.equal(isClosedLexisStatus('EXCLUIDO'),false);
});
test('movimentos DJEN e decisões DataJud mantêm origem, data, link e aviso de cache',()=>{
 const process={protocolo_ref:'0000000-00.2026.8.26.0001',djen_ultima_data:'2026-11-12',djen_ultimo_resumo:'Publicação de intimação',djen_ultimo_link:'https://comunica.pje.jus.br/consulta/1',
  datajud_ultimo_nome:'Sentença',datajud_ultimo_movimento:'2026-11-11'};
 const snapshots=[
  {source:'djen',checked_at:'2026-11-13T12:00:00Z',payload:{ok:true,items:[{source:'DJEN',date:'2026-11-12',title:'Publicação de intimação',link:'https://comunica.pje.jus.br/consulta/1'}]}},
  {source:'datajud',checked_at:'2026-11-13T11:00:00Z',payload:{ok:true,items:[{source:'DataJud',date:'2026-11-11',title:'Sentença proferida'}],fromCache:true}}
 ];
 const rows=normalizeLexisJudicialTimeline({process,snapshots,live:null});
 assert.ok(rows.some(x=>x.kind==='publicacao'&&x.source==='DJEN'&&x.url));
 assert.ok(rows.some(x=>x.kind==='decisao'&&x.source==='DataJud'));
 assert.ok(rows.every(x=>x.date&&x.evidence));
 assert.equal(rows.filter(x=>x.kind==='publicacao'&&x.title==='Publicação de intimação').length,1);
});
test('resposta indisponível não gera decisão fictícia e preserva histórico',()=>{
 const rows=normalizeLexisJudicialTimeline({process:{djen_ultimo_resumo:null},snapshots:[{source:'djen',checked_at:'2026-11-10',payload:{ok:false,error:'403'}}],live:{ok:false,items:[]}});
 assert.deepEqual(rows,[]);
});
test('análises e atividades identificam executor real sem presumir atendimento ao cliente',()=>{
 const rows=decorateLexisWork([{responsavel_auth_user_id:'a',categoria:'auditoria',descricao:'Checagem'}, {responsavel_auth_user_id:'b',categoria:'atendimento',contato_cliente_confirmado:true}], [{auth_user_id:'a',nome:'Maria'}]);
 assert.equal(rows[0].responsible,'Maria');
 assert.equal(rows[0].contactConfirmed,false);
 assert.equal(rows[1].responsible,'Não identificado');
 assert.equal(rows[1].contactConfirmed,true);
});
test('consulta exige CNJ completo',()=>{
 assert.equal(normalizeCaseNumber('00000000020268260001'),'0000000-00.2026.8.26.0001');
 assert.equal(normalizeCaseNumber('0'),null);
});
test('rotas dedicadas e navegação exigem login e mantêm o tema existente',()=>{
 for(const p of ['app/analises-internas/page.jsx','app/atividades/page.jsx','app/encerrados/page.jsx','app/consulta-judicial/page.jsx']){
  const s=source(p);assert.match(s,/SecuredWorkspace/);
 }
 const nav=source('lib/crm-navigation.mjs');
 assert.match(nav,/path:'\/encerrados'/);assert.match(nav,/path:'\/analises-internas'/);assert.match(nav,/path:'\/atividades'/);
 const ui=source('components/lexis-shared-office.jsx');
 assert.match(ui,/\/consulta-judicial\?numero=/);
});
