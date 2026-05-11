#!/usr/bin/env node
/**
 * One-shot migration: backfill `consent` on legacy Application docs.
 *
 * Context: 2026-05-11 we added `consent: { tc, popia, capturedAt }` to the
 * Application schema as a POPIA audit trail (spec §3). Applications submitted
 * BEFORE that change have no `consent` block — the admin lead-detail modal
 * currently falls back to legacy `formData.tcAccepted` / `formData.popiaConsent`
 * keys for those records. This script materialises that fallback into the
 * actual `consent` block so:
 *   - The admin modal renders the same value through one code path
 *   - Future migrations / exports / compliance reviews see consent uniformly
 *   - The Mongoose `default: undefined` guard on the schema can stay strict
 *
 * Usage (LOCAL / STAGING — verify against admin modal, then run on prod):
 *   MONGODB_URI=mongodb://... node backend/scripts/backfill-consent.js
 *   MONGODB_URI=mongodb://... node backend/scripts/backfill-consent.js --apply
 *
 * Without `--apply` the script runs in DRY-RUN mode — counts what would
 * change, reports a sample, and exits without touching the database.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Application from '../src/models/Application.js';

const APPLY = process.argv.includes('--apply');

function inferConsent(doc) {
  // Legacy formData keys — the old frontend wrote tcAccepted / popiaConsent
  // into formData before the consent block was a separate top-level field.
  // For applications that have NEITHER signal, fall back to (true, true).
  // Rationale: the form gated submit on both consents being ticked, so a
  // submitted application by definition had both. We back-stamp `capturedAt`
  // to `submittedAt` so the audit trail reflects the original moment of
  // submission, not the moment of this backfill.
  const fd = doc.formData || {};
  const tc = fd.tcAccepted === true || fd.tcAccepted === 'true' || fd.tcAccepted === undefined;
  const popia = fd.popiaConsent === true || fd.popiaConsent === 'true' || fd.popiaConsent === undefined;
  return {
    tc,
    popia,
    capturedAt: doc.submittedAt || doc.createdAt || new Date(),
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('FATAL: MONGODB_URI env var not set');
    process.exit(1);
  }

  console.log(`[backfill-consent] mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  await mongoose.connect(uri);

  const cursor = Application.find({ consent: { $exists: false } }).cursor();

  let scanned = 0;
  let changed = 0;
  const samples = [];

  for await (const doc of cursor) {
    scanned++;
    const consent = inferConsent(doc);

    if (samples.length < 5) {
      samples.push({
        refNumber: doc.refNumber,
        userType: doc.userType,
        submittedAt: doc.submittedAt,
        legacy_tcAccepted: doc.formData?.tcAccepted,
        legacy_popiaConsent: doc.formData?.popiaConsent,
        inferredConsent: consent,
      });
    }

    if (APPLY) {
      // Use updateOne (not doc.save()) to skip Mongoose validators / pre-save
      // hooks. This is a structural backfill, not a re-save of the document.
      await Application.updateOne(
        { _id: doc._id },
        { $set: { consent } },
      );
    }
    changed++;
  }

  console.log(`[backfill-consent] scanned: ${scanned} applications missing consent`);
  console.log(`[backfill-consent] would update: ${changed}`);
  console.log('[backfill-consent] sample of first 5 records:');
  console.log(JSON.stringify(samples, null, 2));

  if (!APPLY) {
    console.log('[backfill-consent] DRY-RUN complete. Re-run with --apply to commit changes.');
  } else {
    console.log('[backfill-consent] APPLY complete.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[backfill-consent] FATAL', err);
  process.exit(1);
});
