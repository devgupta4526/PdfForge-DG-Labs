#!/usr/bin/env node
/**
 * Smoke tests for the client-side Rotate + Delete pdf-lib helpers.
 *
 * Run via:  npx tsx scripts/test-rotate-delete.mjs
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { PDFDocument, degrees } from 'pdf-lib';

const rotateMod = await import(
  pathToFileURL(
    path.resolve('./apps/web/src/app/(tools)/rotate-pdf/lib/pdf-rotate.ts'),
  ).href
);
const deleteMod = await import(
  pathToFileURL(
    path.resolve('./apps/web/src/app/(tools)/delete-pages/lib/pdf-delete.ts'),
  ).href
);

const {
  normaliseRotation,
  combineRotations,
  buildBulkDeltas,
  readPageRotations,
  rotatePdfPages,
  PdfRotateError,
} = rotateMod;
const { planDeletion, deletePdfPages, PdfDeleteError } = deleteMod;

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

async function buildSample(pageCount, baseRotations = []) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    const page = doc.addPage([400, 600]);
    page.drawText(`Page ${i + 1}`, { x: 60, y: 540, size: 36 });
    const r = baseRotations[i] ?? 0;
    if (r) page.setRotation(degrees(r));
  }
  return doc.save();
}

/* ──────────────── normaliseRotation / combineRotations ──────────────── */

if (normaliseRotation(0) === 0) ok('normaliseRotation(0) === 0');
else bad('normaliseRotation(0)');
if (normaliseRotation(90) === 90) ok('normaliseRotation(90) === 90');
else bad('normaliseRotation(90)');
if (normaliseRotation(450) === 90) ok('normaliseRotation(450) === 90');
else bad('normaliseRotation(450)');
if (normaliseRotation(-90) === 270) ok('normaliseRotation(-90) === 270');
else bad('normaliseRotation(-90)');

try {
  normaliseRotation(45);
  bad('normaliseRotation(45) should throw INVALID_ANGLE');
} catch (err) {
  if (err instanceof PdfRotateError && err.code === 'INVALID_ANGLE')
    ok('normaliseRotation rejects 45°');
  else bad('normaliseRotation(45) wrong error', err);
}

if (combineRotations(90, 90) === 180) ok('combineRotations(90, 90) === 180');
else bad('combineRotations(90, 90)');
if (combineRotations(270, 180) === 90) ok('combineRotations(270, 180) === 90');
else bad('combineRotations(270, 180)');

/* ──────────────── readPageRotations ──────────────── */

const sample10 = await buildSample(10, [0, 90, 180, 270, 0, 90, 0, 0, 0, 0]);
const infos = await readPageRotations(sample10);
if (infos.length === 10) ok('readPageRotations: 10 entries');
else bad(`readPageRotations length: got ${infos.length}`);
if (infos[0].baseRotation === 0 && infos[3].baseRotation === 270)
  ok('readPageRotations: captures source rotations');
else bad('readPageRotations: source rotations wrong');

/* ──────────────── rotatePdfPages ──────────────── */

try {
  await rotatePdfPages({ pdfBytes: sample10, deltas: new Map() });
  bad('rotatePdfPages should throw NO_CHANGES on empty deltas');
} catch (err) {
  if (err instanceof PdfRotateError && err.code === 'NO_CHANGES')
    ok('rotatePdfPages: rejects empty deltas');
  else bad('rotatePdfPages empty deltas wrong error', err);
}

try {
  await rotatePdfPages({ pdfBytes: sample10, deltas: new Map([[99, 90]]) });
  bad('rotatePdfPages should throw OUT_OF_BOUNDS for invalid page');
} catch (err) {
  if (err instanceof PdfRotateError && err.code === 'OUT_OF_BOUNDS')
    ok('rotatePdfPages: rejects out-of-range page');
  else bad('rotatePdfPages OOB wrong error', err);
}

try {
  // Page 1 base=0 + delta 90  → expect 90
  // Page 2 base=90 + delta 90 → expect 180
  // Page 4 base=270 + delta 90 → expect 0 (full circle)
  // Page 5 base=0  + delta 270 → expect 270
  const rotated = await rotatePdfPages({
    pdfBytes: sample10,
    deltas: new Map([
      [1, 90],
      [2, 90],
      [4, 90],
      [5, 270],
    ]),
  });
  const reread = await readPageRotations(rotated);
  const expectations = {
    1: 90,
    2: 180,
    3: 180, // unchanged
    4: 0,
    5: 270,
    6: 90, // unchanged
    10: 0, // unchanged
  };
  let allOk = true;
  for (const [pn, expected] of Object.entries(expectations)) {
    const actual = reread[Number(pn) - 1].baseRotation;
    if (actual !== expected) {
      allOk = false;
      bad(`rotatePdfPages: page ${pn} expected ${expected}°, got ${actual}°`);
    }
  }
  if (allOk) ok('rotatePdfPages: composes deltas with source rotations correctly');
} catch (err) {
  bad('rotatePdfPages happy path threw', err);
}

const bulk = buildBulkDeltas(5, 'cw');
if (bulk.size === 5 && [...bulk.values()].every((v) => v === 90))
  ok('buildBulkDeltas(cw): every page +90');
else bad('buildBulkDeltas(cw)');

const bulkFlip = buildBulkDeltas(3, 'flip');
if (bulkFlip.size === 3 && [...bulkFlip.values()].every((v) => v === 180))
  ok('buildBulkDeltas(flip): every page +180');
else bad('buildBulkDeltas(flip)');

/* ──────────────── planDeletion ──────────────── */

try {
  planDeletion(10, []);
  bad('planDeletion empty selection should throw NO_SELECTION');
} catch (err) {
  if (err instanceof PdfDeleteError && err.code === 'NO_SELECTION')
    ok('planDeletion: rejects empty selection');
  else bad('planDeletion empty wrong error', err);
}

try {
  planDeletion(3, [1, 2, 3]);
  bad('planDeletion all-pages should throw WOULD_DELETE_ALL');
} catch (err) {
  if (err instanceof PdfDeleteError && err.code === 'WOULD_DELETE_ALL')
    ok('planDeletion: rejects "delete every page"');
  else bad('planDeletion all-pages wrong error', err);
}

try {
  planDeletion(5, [99]);
  bad('planDeletion OOB should throw');
} catch (err) {
  if (err instanceof PdfDeleteError && err.code === 'OUT_OF_BOUNDS')
    ok('planDeletion: rejects out-of-bounds');
  else bad('planDeletion OOB wrong error', err);
}

const plan = planDeletion(10, [3, 1, 7, 1]); // duplicate ignored
if (
  plan.remove.length === 3 &&
  plan.remove[0] === 1 &&
  plan.remove[1] === 3 &&
  plan.remove[2] === 7
)
  ok('planDeletion: dedupes and sorts remove list');
else bad(`planDeletion remove: got ${JSON.stringify(plan.remove)}`);

if (plan.keep.length === 7) ok('planDeletion: 7 kept (10 - 3)');
else bad(`planDeletion keep length: got ${plan.keep.length}`);

/* ──────────────── deletePdfPages ──────────────── */

const sampleForDelete = await buildSample(5);

try {
  const result = await deletePdfPages({
    pdfBytes: sampleForDelete,
    pagesToDelete: [2, 4],
  });
  if (result.removedPages.length === 2 && result.keptPages.length === 3)
    ok('deletePdfPages: removed 2, kept 3');
  else
    bad(
      `deletePdfPages counts: removed=${result.removedPages.length}, kept=${result.keptPages.length}`,
    );
  const reparsed = await PDFDocument.load(result.bytes);
  if (reparsed.getPageCount() === 3) ok('deletePdfPages: result has 3 pages');
  else bad(`deletePdfPages re-parsed pages: ${reparsed.getPageCount()}`);
} catch (err) {
  bad('deletePdfPages happy path threw', err);
}

try {
  // Single-page document edge case: if user selects "all", we must reject.
  const single = await buildSample(1);
  await deletePdfPages({ pdfBytes: single, pagesToDelete: [1] });
  bad('deletePdfPages single-page-all should throw WOULD_DELETE_ALL');
} catch (err) {
  if (err instanceof PdfDeleteError && err.code === 'WOULD_DELETE_ALL')
    ok('deletePdfPages: single-page "delete all" rejected');
  else bad('deletePdfPages single-page wrong error', err);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
