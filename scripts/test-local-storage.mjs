// Smoke test for the local storage pipeline.
// Hits the API to: (1) build a presigned upload, (2) POST a tiny PDF to the
// signed URL via multipart, (3) verify the file lives at the expected path,
// (4) build a presigned download URL and GET it back, (5) hit /api/health.
//
// Run with: node scripts/test-local-storage.mjs

import { promises as fs } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import path from 'node:path';

const API = 'http://localhost:4000';
const SECRET = 'dev-only-insecure-secret-do-not-use-in-production';
// `npm run dev --workspace=@pdf-forge/api` runs with CWD=apps/api so
// LOCAL_STORAGE_DIR=./storage resolves there.
const STORAGE_DIR = path.resolve('./apps/api/storage');

const fail = (msg) => {
  console.error('✖', msg);
  process.exit(1);
};
const ok = (msg) => console.log('✓', msg);

// 1. Sanity — health endpoint
{
  const res = await fetch(`${API}/api/health`);
  if (res.status !== 200) fail(`health: expected 200, got ${res.status}`);
  const body = await res.json();
  if (body.status !== 'ok') fail(`health: status not 'ok': ${JSON.stringify(body)}`);
  ok(`health: status=${body.status} env=${body.environment} version=${body.version}`);
}

// 2. Build a tiny but VALID PDF (header + xref + trailer + %%EOF)
const tinyPdf = Buffer.from(
  '%PDF-1.4\n' +
    '1 0 obj <<>> endobj\n' +
    'xref\n0 1\n0000000000 65535 f \n' +
    'trailer <<>>\n' +
    'startxref\n9\n%%EOF',
  'utf8',
);

// 3. Compute a presigned-upload token the same way the local driver does
const key = `temp/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.pdf`;
const contentType = 'application/pdf';
const maxSize = 1024 * 1024;
const exp = Math.floor(Date.now() / 1000) + 600; // 10 min
const token = createHmac('sha256', SECRET)
  .update(`upload:${key}|${contentType}|${maxSize}|${exp}`)
  .digest('hex');

// 4. POST the file to /api/storage/upload via multipart/form-data
const form = new FormData();
form.set('key', key);
form.set('Content-Type', contentType);
form.set('X-Max-Size', String(maxSize));
form.set('X-Expires', String(exp));
form.set('X-Token', token);
form.set('file', new Blob([tinyPdf], { type: contentType }), 'tiny.pdf');

{
  const res = await fetch(`${API}/api/storage/upload`, { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (res.status !== 200 || !body.ok) fail(`upload: status=${res.status} body=${JSON.stringify(body)}`);
  if (body.key !== key) fail(`upload: returned key mismatch ${body.key} vs ${key}`);
  if (body.kind !== 'pdf') fail(`upload: kind not pdf: ${body.kind}`);
  ok(`upload: ${body.sizeBytes} bytes accepted, key=${key}`);
}

// 5. Verify the file landed on disk
{
  const fp = path.join(STORAGE_DIR, key);
  const stat = await fs.stat(fp).catch(() => null);
  if (!stat) fail(`disk: file missing at ${fp}`);
  if (stat.size !== tinyPdf.length) fail(`disk: size ${stat.size} vs expected ${tinyPdf.length}`);
  const bytes = await fs.readFile(fp);
  if (!bytes.equals(tinyPdf)) fail('disk: bytes do not match what we sent');
  ok(`disk: ${stat.size} bytes at ${fp}`);
}

// 6. Issue a download token + fetch it through the API
{
  const dlExp = Math.floor(Date.now() / 1000) + 600;
  const dlToken = createHmac('sha256', SECRET).update(`download:${key}|${dlExp}`).digest('hex');
  const url = `${API}/api/storage/download/${encodeURI(key)}?token=${dlToken}&exp=${dlExp}`;
  const res = await fetch(url);
  if (res.status !== 200) fail(`download: status=${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.equals(tinyPdf)) fail('download: bytes do not match');
  ok(`download: ${buf.length} bytes streamed back identically`);
}

// 7. Negative test — bad token must be rejected
{
  const url = `${API}/api/storage/download/${encodeURI(key)}?token=deadbeef&exp=${exp}`;
  const res = await fetch(url);
  if (res.status !== 403) fail(`download (bad token): expected 403, got ${res.status}`);
  ok('download: bad token rejected with 403');
}

// 8. Negative test — oversize upload must be rejected by the token cap
{
  const tinyKey = `temp/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.pdf`;
  const tinyMax = 16; // 16 bytes max
  const tinyExp = Math.floor(Date.now() / 1000) + 600;
  const tinyTok = createHmac('sha256', SECRET)
    .update(`upload:${tinyKey}|${contentType}|${tinyMax}|${tinyExp}`)
    .digest('hex');
  const f = new FormData();
  f.set('key', tinyKey);
  f.set('Content-Type', contentType);
  f.set('X-Max-Size', String(tinyMax));
  f.set('X-Expires', String(tinyExp));
  f.set('X-Token', tinyTok);
  f.set('file', new Blob([tinyPdf], { type: contentType }), 'tiny.pdf');
  const res = await fetch(`${API}/api/storage/upload`, { method: 'POST', body: f });
  if (res.status !== 413) fail(`oversize: expected 413, got ${res.status}`);
  ok('oversize upload rejected with 413');
}

console.log('\nAll local-storage smoke tests passed.');
