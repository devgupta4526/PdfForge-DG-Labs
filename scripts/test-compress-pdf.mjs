#!/usr/bin/env node
/**
 * Smoke test for the server-side compress pipeline.
 *
 * 1. Builds a sample PDF with an embedded JPEG image using pdf-lib.
 * 2. Calls `compressPdf(bytes, level)` for low/medium/high.
 * 3. Asserts:
 *      - output is a valid PDF that re-loads cleanly
 *      - output is smaller than (or equal to) the original
 *      - stats fields are populated
 *      - high level flattens forms + strips metadata
 *
 * Run via:  npx tsx scripts/test-compress-pdf.mjs
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

const compressMod = await import(
  pathToFileURL(path.resolve('./apps/api/src/lib/pdf/compress.ts')).href
);

const { compressPdf, COMPRESSION_LEVELS, PdfCompressionError } = compressMod;

let passes = 0;
let failures = 0;
const ok = (msg) => {
  passes += 1;
  console.log(`✓ ${msg}`);
};
const bad = (msg, err) => {
  failures += 1;
  console.error(`✖ ${msg}`);
  if (err) console.error('  ', err.message ?? err);
};

async function buildSamplePdf() {
  // Generate a 2000x1500 photographic-ish JPEG (gradient + noise) so that
  // re-encoding at lower quality yields a real reduction.
  const width = 2000;
  const height = 1500;
  const channels = 3;
  const buf = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      // Smooth gradient + per-pixel noise to defeat trivial compression.
      const noise = Math.floor(Math.random() * 80);
      buf[i] = (x % 256) ^ noise;
      buf[i + 1] = (y % 256) ^ noise;
      buf[i + 2] = ((x + y) % 256) ^ noise;
    }
  }
  const jpegBytes = await sharp(buf, { raw: { width, height, channels } })
    .jpeg({ quality: 95 })
    .toBuffer();

  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(jpegBytes);
  const page = doc.addPage([612, 792]); // US Letter
  const { width: imgW, height: imgH } = image.scaleToFit(550, 700);
  page.drawImage(image, {
    x: (612 - imgW) / 2,
    y: (792 - imgH) / 2,
    width: imgW,
    height: imgH,
  });
  doc.setTitle('Sample compress test');
  doc.setAuthor('PDF Forge tests');
  doc.setProducer('PDF Forge tests');
  return doc.save();
}

const pdfBytes = await buildSamplePdf();
ok(`built sample PDF (${pdfBytes.byteLength} bytes)`);

for (const level of /** @type {const} */ (['low', 'medium', 'high'])) {
  try {
    const result = await compressPdf(pdfBytes, level);
    const { stats } = result;

    if (stats.level !== level) bad(`stats.level mismatch for ${level}`);
    if (stats.originalSize !== pdfBytes.byteLength)
      bad(`stats.originalSize mismatch for ${level}`);
    if (stats.compressedSize !== result.bytes.byteLength)
      bad(`stats.compressedSize mismatch for ${level}`);
    if (stats.imagesScanned < 1) bad(`expected at least 1 image scanned for ${level}`);
    if (stats.imagesRecompressed < 1)
      bad(`expected at least 1 image recompressed for ${level}`);
    if (result.bytes.byteLength > pdfBytes.byteLength)
      bad(`compressed (${result.bytes.byteLength}) larger than original (${pdfBytes.byteLength}) for ${level}`);

    // Result must re-parse cleanly.
    try {
      const reparsed = await PDFDocument.load(result.bytes);
      if (reparsed.getPageCount() !== 1) bad(`re-parsed page count != 1 for ${level}`);
    } catch (err) {
      bad(`compressed output failed to re-parse for ${level}`, err);
    }

    if (level === 'medium' || level === 'high') {
      if (!stats.metadataStripped) bad(`expected metadataStripped=true for ${level}`);
    }
    if (level === 'low') {
      if (stats.metadataStripped) bad('expected metadataStripped=false for low');
    }
    if (level === 'high') {
      // formsFlattened is true if pdf-lib was able to call flatten() — even
      // empty forms count, so this should be true.
      if (!stats.formsFlattened) bad('expected formsFlattened=true for high');
    }

    ok(
      `compress level=${level} → ${result.bytes.byteLength} bytes (-${stats.reductionPercent.toFixed(
        1,
      )}%, ${stats.imagesRecompressed}/${stats.imagesScanned} images)`,
    );
  } catch (err) {
    bad(`compress level=${level} threw`, err);
  }
}

// Settings shape sanity check.
for (const level of /** @type {const} */ (['low', 'medium', 'high'])) {
  const cfg = COMPRESSION_LEVELS[level];
  if (!cfg) {
    bad(`COMPRESSION_LEVELS[${level}] missing`);
    continue;
  }
  if (cfg.quality < 0 || cfg.quality > 100) bad(`quality out of range for ${level}`);
  if (cfg.maxImageDimensionPx <= 0) bad(`maxImageDimensionPx invalid for ${level}`);
}
ok('COMPRESSION_LEVELS shape valid');

// Empty PDF rejection.
try {
  await compressPdf(new Uint8Array(0), 'medium');
  bad('expected empty input to throw EMPTY_PDF');
} catch (err) {
  if (err instanceof PdfCompressionError && err.code === 'EMPTY_PDF') ok('empty input rejected');
  else bad('empty input wrong error', err);
}

// Garbage input.
try {
  await compressPdf(new TextEncoder().encode('not a pdf at all'), 'medium');
  bad('expected garbage input to throw CORRUPT_PDF');
} catch (err) {
  if (err instanceof PdfCompressionError && err.code === 'CORRUPT_PDF') ok('garbage input rejected');
  else bad('garbage input wrong error', err);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
