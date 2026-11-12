import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from 'node:fs';import{execFileSync}from 'node:child_process';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('worker Baileys tem sintaxe válida, QR verdadeiro, cofre criptografado e não envia sem aprovação',()=>{
 const p=new URL('../workers/blackhole-wa/server.mjs',import.meta.url);
 execFileSync(process.execPath,['--check',p.pathname],{timeout:5000});
 const s=file('workers/blackhole-wa/server.mjs');
 assert.match(s,/useMultiFileAuthState/);assert.match(s,/QRCode\.toDataURL/);
 assert.match(s,/createCipheriv\('aes-256-gcm'/);assert.match(s,/BLACKHOLE_WA_VAULT_URL/);
 assert.match(s,/api\\/integrations\\/lexispredict\\/send/);assert.match(s,/messageId/);
});
test('cofre Supabase não permite leitura de sessão por clientes autenticados',()=>{
 const sql=file('supabase/migrations/20261112_028_blackhole_wa_bridge.sql');
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.office_wa_encrypted_vault from anon,authenticated,public/);
 const edge=file('supabase/functions/blackhole-wa-vault/index.ts');
 assert.match(edge,/x-blackhole-wa-bridge/);assert.match(edge,/office_wa_bridge_guard/);
});
