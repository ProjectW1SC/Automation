import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('manual scanner has enough Vercel runtime for parallel independent official sources',()=>{
 const scanner=read('app/api/scanner/route.js');
 const official=read('app/api/processos/consulta/route.js');
 assert.match(scanner,/maxDuration=90/);
 assert.match(official,/maxDuration=90/);
 assert.match(scanner,/Promise\.all\(\[/);
 assert.match(official,/result=await datajud\(number\)/);
});
test('official source HTTP 403, 429 and timeouts preserve accurate status to scanner',()=>{
 const source=read('app/api/processos/consulta/route.js');
 assert.match(source,/upstreamStatus=Number\(error\?\.status\)/);
 assert.match(source,/\[403,429,502,503,504\]\.includes\(upstreamStatus\)/);
 assert.match(source,/timeout\?504/);
 assert.match(source,/code:error\?\.code\|\|null/);
 assert.doesNotMatch(source,/badInput\?400:502\);\s*\}/);
});
