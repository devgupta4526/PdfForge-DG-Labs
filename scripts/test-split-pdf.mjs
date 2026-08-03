#!/usr/bin/env node
/**
 * Smoke test for the Split PDF library.
 *
 * Dynamically imports the TS source via tsx. Builds a synthetic 10-page
 * PDF with pdf-lib, then exercises every public split helper plus all the
 * validation paths in `parsePageRanges`.
 *
 * Usage: node scripts/test-split-pdf.mjs
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Run via:  npx tsx scripts/test-split-pdf.mjs
// tsx hooks ESM resolution so we can `import()` the .ts source directly.
const splitMod = await import(
  pathToFileURL(
    path.resolve('./apps/web/src/app/(tools)/split-pdf/lib/pdf-split.ts'),
  ).href
);

const { PDFDocument } = await import('pdf-lib');

const {
  parsePageRanges,
  splitByRanges,
  splitEveryN,
  extractPages,
  nameForPageGroup,
  getPageCount,
  PdfSplitError,
} = splitMod;

let failures = 0;
let passes = 0;

function ok(msg) {
  passes += 1;
  console.log(`✓ ${msg}`);
}
function bad(msg, err) {
  failures += 1;
  console.error(`✖ ${msg}`);
  if (err) console.error('  ', err.message ?? err);
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function buildSamplePdf(pageCount) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i += 1) {
    const page = doc.addPage([400, 600]);
    page.drawText(`Page ${i}`, { x: 60, y: 540, size: 36 });
  }
  return doc.save();
}

const PDF_BYTES = await buildSamplePdf(10);

/* ──────────────── parsePageRanges ──────────────── */

try {
  const r = parsePageRanges('1-3, 5, 8-10', 10);
  if (deepEqual(r, [[1, 2, 3], [5], [8, 9, 10]])) ok('parsePageRanges: "1-3, 5, 8-10"');
  else bad(`parsePageRanges canonical case: got ${JSON.stringify(r)}`);
} catch (err) {
  bad('parsePageRanges canonical case threw', err);
}

try {
  const r = parsePageRanges('  1 - 4 ,  9 ', 10);
  if (deepEqual(r, [[1, 2, 3, 4], [9]])) ok('parsePageRanges: whitespace tolerated');
  else bad(`parsePageRanges whitespace: got ${JSON.stringify(r)}`);
} catch (err) {
  bad('parsePageRanges whitespace threw', err);
}

try {
  parsePageRanges('', 10);
  bad('parsePageRanges("") should throw EMPTY_RANGE');
} catch (err) {
  if (err instanceof PdfSplitError && err.code === 'EMPTY_RANGE') ok('parsePageRanges: rejects empty input');
  else bad('parsePageRanges("") wrong error', err);
}

try {
  parsePageRanges('abc', 10);
  bad('parsePageRanges("abc") should throw INVALID_RANGE_FORMAT');
} catch (err) {
  if (err instanceof PdfSplitError && err.code === 'INVALID_RANGE_FORMAT')
    ok('parsePageRanges: rejects non-numeric tokens');
  else bad('parsePageRanges("abc") wrong error', err);
}

try {
  parsePageRanges('5-2', 10);
  bad('parsePageRanges("5-2") should throw INVERTED_RANGE');
} catch (err) {
  if (err instanceof PdfSplitError && err.code === 'INVERTED_RANGE')
    ok('parsePageRanges: rejects inverted ranges');
  else bad('parsePageRanges("5-2") wrong error', err);
}

try {
  parsePageRanges('1-99', 10);
  bad('parsePageRanges("1-99") should throw OUT_OF_BOUNDS');
} catch (err) {
  if (err instanceof PdfSplitError && err.code === 'OUT_OF_BOUNDS')
    ok('parsePageRanges: rejects out-of-bounds ranges');
  else bad('parsePageRanges("1-99") wrong error', err);
}

try {
  parsePageRanges('0', 10);
  bad('parsePageRanges("0") should throw OUT_OF_BOUNDS');
} catch (err) {
  if (err instanceof PdfSplitError && err.code === 'OUT_OF_BOUNDS')
    ok('parsePageRanges: rejects page 0');
  else bad('parsePageRanges("0") wrong error', err);
}

/* ──────────────── nameForPageGroup ──────────────── */

if (nameForPageGroup([5]) === 'page-5.pdf') ok('nameForPageGroup: single page');
else bad(`nameForPageGroup single page: got ${nameForPageGroup([5])}`);

if (nameForPageGroup([1, 2, 3]) === 'pages-1-3.pdf') ok('nameForPageGroup: contiguous');
else bad(`nameForPageGroup contiguous: got ${nameForPageGroup([1, 2, 3])}`);

if (nameForPageGroup([1, 3, 5]) === 'pages-1,3,5.pdf') ok('nameForPageGroup: non-contiguous');
else bad(`nameForPageGroup non-contiguous: got ${nameForPageGroup([1, 3, 5])}`);

/* ──────────────── splitByRanges ──────────────── */

try {
  const out = await splitByRanges(PDF_BYTES, [[1, 2, 3], [5], [8, 9, 10]]);
  if (out.length === 3) ok('splitByRanges: produced 3 outputs');
  else bad(`splitByRanges count: got ${out.length}`);

  if (out[0].name === 'pages-1-3.pdf' && out[1].name === 'page-5.pdf' && out[2].name === 'pages-8-10.pdf')
    ok('splitByRanges: filenames match spec');
  else bad(`splitByRanges names: got ${out.map((o) => o.name).join(', ')}`);

  const counts = await Promise.all(out.map((o) => getPageCount(o.bytes)));
  if (deepEqual(counts, [3, 1, 3])) ok('splitByRanges: page counts per output correct');
  else bad(`splitByRanges page counts: got ${JSON.stringify(counts)}`);
} catch (err) {
  bad('splitByRanges happy path threw', err);
}

try {
  await splitByRanges(PDF_BYTES, []);
  bad('splitByRanges([]) should throw NO_PAGES_SELECTED');
} catch (err) {
  if (err instanceof PdfSplitError && err.code === 'NO_PAGES_SELECTED')
    ok('splitByRanges: rejects empty ranges array');
  else bad('splitByRanges([]) wrong error', err);
}

try {
  await splitByRanges(PDF_BYTES, [[1, 99]]);
  bad('splitByRanges with out-of-range page should throw');
} catch (err) {
  if (err instanceof PdfSplitError && err.code === 'OUT_OF_BOUNDS')
    ok('splitByRanges: rejects out-of-range page in range');
  else bad('splitByRanges OOR wrong error', err);
}

/* ──────────────── splitEveryN ──────────────── */

try {
  const out = await splitEveryN(PDF_BYTES, 3);
  if (out.length === 4) ok('splitEveryN(10, n=3): 4 outputs');
  else bad(`splitEveryN count: got ${out.length}`);

  if (
    out[0].name === 'pages-1-3.pdf' &&
    out[1].name === 'pages-4-6.pdf' &&
    out[2].name === 'pages-7-9.pdf' &&
    out[3].name === 'page-10.pdf'
  )
    ok('splitEveryN: chunked filenames correct (incl. remainder)');
  else bad(`splitEveryN names: got ${out.map((o) => o.name).join(', ')}`);

  const counts = await Promise.all(out.map((o) => getPageCount(o.bytes)));
  if (deepEqual(counts, [3, 3, 3, 1])) ok('splitEveryN: page counts per chunk correct');
  else bad(`splitEveryN page counts: got ${JSON.stringify(counts)}`);
} catch (err) {
  bad('splitEveryN happy path threw', err);
}

try {
  await splitEveryN(PDF_BYTES, 0);
  bad('splitEveryN(0) should throw INVALID_N');
} catch (err) {
  if (err instanceof PdfSplitError && err.code === 'INVALID_N')
    ok('splitEveryN: rejects n=0');
  else bad('splitEveryN(0) wrong error', err);
}

try {
  await splitEveryN(PDF_BYTES, 99);
  bad('splitEveryN(99) should throw INVALID_N');
} catch (err) {
  if (err instanceof PdfSplitError && err.code === 'INVALID_N')
    ok('splitEveryN: rejects n > totalPages');
  else bad('splitEveryN(99) wrong error', err);
}

/* ──────────────── extractPages ──────────────── */

try {
  const out = await extractPages(PDF_BYTES, [3, 1, 7]);
  if (out.name === 'pages-1,3,7.pdf') ok('extractPages: name uses sorted non-contiguous list');
  else bad(`extractPages name: got ${out.name}`);

  const count = await getPageCount(out.bytes);
  if (count === 3) ok('extractPages: combined output has correct page count');
  else bad(`extractPages count: got ${count}`);
} catch (err) {
  bad('extractPages happy path threw', err);
}

try {
  await extractPages(PDF_BYTES, []);
  bad('extractPages([]) should throw NO_PAGES_SELECTED');
} catch (err) {
  if (err instanceof PdfSplitError && err.code === 'NO_PAGES_SELECTED')
    ok('extractPages: rejects empty selection');
  else bad('extractPages([]) wrong error', err);
}

/* ──────────────── summary ──────────────── */

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
