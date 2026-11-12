import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const file=readFileSync(new URL('../supabase/migrations/20261112_025_hermes_background_activate.sql',import.meta.url),'utf8');
test('agendamento real é incremental e utiliza Vault sem publicar segredos no URL',()=>{
 assert.match(file,/cron\.schedule/);
 assert.match(file,/blackhole-hermes-official-scan/);
 assert.match(file,/net\.http_post/);
 assert.match(file,/vault\.decrypted_secrets/);
 assert.match(file,/functions\/v1\/blackhole-hermes-scan/);
 assert.match(file,/\"limit\":1/);
 assert.doesNotMatch(file,/Bearer (sk_|eyJ)/);
});
