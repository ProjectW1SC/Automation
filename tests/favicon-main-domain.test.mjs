import test from 'node:test';
import assert from 'node:assert/strict';

test('favicon.ico redirects permanently to the existing INFINITUM symbol', async () => {
  const { GET } = await import('../app/favicon.ico/route.js');
  const result = await GET(new Request('https://projectw1sc-crm.vercel.app/favicon.ico'));
  assert.equal(result.status, 308);
  assert.equal(result.headers.get('location'), 'https://projectw1sc-crm.vercel.app/branding/projectw1sc-symbol.svg');
});
