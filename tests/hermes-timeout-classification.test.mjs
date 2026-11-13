import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../supabase/functions/blackhole-hermes-scan/index.ts',import.meta.url),'utf8');
test('Hermes recognizes Supabase "Signal timed out." as timeout, not generic unavailable',()=>{
 assert.match(s,/timed\\s\*out/);
 assert.match(s,/abort\(\?:ed\)\?/);
});
