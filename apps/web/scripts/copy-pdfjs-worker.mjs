#!/usr/bin/env node
/**
 * Copies the `pdfjs-dist` worker into apps/web/public/pdfjs/.
 *
 * Why a script?
 *  - pdfjs-dist v4 ships its worker as an ESM module under `build/pdf.worker.min.mjs`.
 *  - Next.js cannot reliably bundle that file as a Web Worker (the runtime needs a
 *    real URL it can `fetch()`), so we serve it from /public.
 *  - Running this on `postinstall` keeps the worker version locked to the version of
 *    `pdfjs-dist` declared in package.json.
 *
 * If `pdfjs-dist` is not installed yet (rare CI race), the script logs and exits 0
 * so installs are not blocked.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const targetDir = path.join(webRoot, 'public', 'pdfjs');
const targetFile = path.join(targetDir, 'pdf.worker.min.mjs');

async function main() {
  const require = createRequire(import.meta.url);
  let workerSrc;
  try {
    workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs', {
      paths: [webRoot],
    });
  } catch (err) {
    console.warn(
      '[copy-pdfjs-worker] pdfjs-dist worker not found; skipping. Reason:',
      err && err.message ? err.message : err,
    );
    return;
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(workerSrc, targetFile);

  const stat = await fs.stat(targetFile);
  console.log(
    `[copy-pdfjs-worker] copied → ${path.relative(webRoot, targetFile)} (${stat.size} bytes)`,
  );
}

main().catch((err) => {
  console.error('[copy-pdfjs-worker] failed:', err);
  process.exit(1);
});
