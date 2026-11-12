import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import {configuredCourtSources,validatePublicCourtURL,OFFICIAL_COURT_SOURCE_KEYS} from '../lib/blackhole-court-links.mjs';
const rd=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('somente links públicos oficiais HTTPS são expostos; nunca chaves privadas',()=>{
 assert.equal(validatePublicCourtURL('https://esaj.tjsp.jus.br/cpopg/'), 'https://esaj.tjsp.jus.br/cpopg/');
 assert.equal(validatePublicCourtURL('https://evil.example/'),null);
 assert.equal(validatePublicCourtURL('http://esaj.tjsp.jus.br/'),null);
 assert.equal(validatePublicCourtURL('https://user:pass@tjsp.jus.br/'),null);
 assert.ok(OFFICIAL_COURT_SOURCE_KEYS.length>=25);
});
test('diretório inclui os tribunais configurados sem presumir acesso a autos',()=>{
 const rows=configuredCourtSources({TJSP_SESSOES_URL:'https://esaj.tjsp.jus.br/',TJMG_SESSOES_URL:'https://google.com/'});
 assert.equal(rows.length,1);assert.equal(rows[0].court,'TJSP');
});
test('endpoint requer login do escritório e página renderiza alternativas',()=>{
 const api=rd('app/api/office/courts/route.js'),ui=rd('components/office-integrations.jsx');
 assert.match(api,/officeAuth/);assert.match(api,/configuredCourtSources/);
 assert.match(ui,/\/api\/office\/courts/);
 assert.match(ui,/Fontes dos tribunais/);
});
