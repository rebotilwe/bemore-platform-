import Application from '../models/Application.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { APPLICATION_STATUSES } from '../constants/enums.js';
import * as appService from '../services/applicationService.js';
import { track } from '../services/analyticsService.js';
import { sendSubmissionConfirmation, sendStatusNotification, sendSummitReminder } from '../utils/mailer.js';
import { redactEmail, redactPhone } from '../utils/redactPII.js';
import logger from '../utils/logger.js';
import { finaliseUpload, cvPath, cvStat, deleteCvFile } from '../services/uploadService.js';
import { verifySignedLink } from '../utils/signedLinks.js';
import fs from 'node:fs';

// ── Public: CV upload — spec §8.1 ──
// Returns { filename, storedAs, size, mimeType }. No DB write here.
export async function uploadCv(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, code: 'NO_FILE', message: 'No file in request' });
    }
    const payload = await finaliseUpload(req.file);
    res.status(200).json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
}

export async function submit(req, res, next) {
  try {
    const app = await appService.createApplication(req.body);

    track('application.submitted', 'application', {
      actor: { type: 'applicant', email: redactEmail(app.personal.email) },
      target: { model: 'Application', id: app._id.toString(), refNumber: app.refNumber },
      meta: { userType: app.userType, tags: app.tags },
      req,
    });

    sendSubmissionConfirmation(app.personal.email, app.refNumber, app.personal.firstName)
      .catch(err => logger.error('Submission confirm email failed', { error: err.message, refNumber: app.refNumber }));

    res.status(201).json({ success: true, data: { refNumber: app.refNumber } });
  } catch (err) {
    // Spec §8.2 — surface attachment validation codes directly.
    if (err.code === 'ATTACHMENT_NOT_FOUND' || err.code === 'ATTACHMENT_FIELD_INVALID') {
      return res.status(400).json({ success: false, code: err.code, message: err.message });
    }
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const result = await appService.listApplications(req.query);

    track('applications.listed', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      meta: { filters: req.query, resultCount: result.pagination.total },
      req,
    });

    // Log to AdminAuditLog
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'application_view',
      meta: { action: 'list', filters: req.query, resultCount: result.pagination.total },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const app = await appService.getApplicationById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Not found' });

    track('application.viewed', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      target: { model: 'Application', id: app._id.toString(), refNumber: app.refNumber },
      req,
    });

    // Log to AdminAuditLog
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'application_view',
      target: { model: 'Application', id: app._id, refNumber: app.refNumber },
      details: { action: 'view' },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const updates = appService.sanitizeUpdate(req.body);
    const app = await appService.updateApplication(req.params.id, updates);
    if (!app) return res.status(404).json({ success: false, message: 'Not found' });

    track('application.updated', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      target: { model: 'Application', id: app._id.toString(), refNumber: app.refNumber },
      meta: { fields: Object.keys(updates).filter(k => k !== 'updatedAt'), newStatus: updates.status },
      req,
    });

    // Log to AdminAuditLog
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'status_update',
      target: { model: 'Application', id: app._id, refNumber: app.refNumber },
      details: { fields: Object.keys(updates).filter(k => k !== 'updatedAt'), newStatus: updates.status },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

    // Send email notification on status change
    if (updates.status && app.personal?.email) {
      sendStatusNotification(app.personal.email, app.refNumber, app.personal.firstName, updates.status)
        .catch(err => logger.error('Status notification email failed', { error: err.message, refNumber: app.refNumber, status: updates.status }));
    }

    res.json({ success: true, data: app });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
}

export async function stats(req, res, next) {
  try {
    const data = await appService.getStats();

    track('stats.viewed', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      req,
    });

    // Log to AdminAuditLog
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'application_view',
      meta: { action: 'stats' },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// Spec §6.8 — per-profile column groups. Only emitted when at least one
// application of that profile exists in the export set.
const PROFILE_COLUMN_GROUPS = {
  developer: [
    { header: 'Development Stage', key: 'developmentStage' },
    { header: 'Project Value', key: 'projectValue' },
    { header: 'Funding Position', key: 'fundingPosition' },
    { header: 'Biggest Constraint', key: 'biggestConstraint' },
  ],
  landowner: [
    { header: 'Land Location', key: 'landLocation' },
    { header: 'Land Size', key: 'landSize' },
    { header: 'Land Outcome', key: 'landOutcome' },
    { header: 'Zoning', key: 'zoning' },
  ],
  investor: [
    { header: 'Investment Range', key: 'investmentRange' },
    { header: 'Investment Approach', key: 'investmentApproach' },
    { header: 'Capital Deployment', key: 'capitalDeployment' },
  ],
  student: [
    { header: 'Portfolio Size', key: 'portfolioSize' },
    { header: 'Occupancy Level', key: 'occupancyLevel' },
    { header: 'Op Challenge', key: 'opChallenge' },
  ],
  professional: [
    { header: 'Primary Role', key: 'primaryRole' },
    { header: 'Experience Level', key: 'experienceLevel' },
    { header: 'Provinces', key: 'provinces' },
    { header: 'Avg Project Size', key: 'avgProjectSize' },
    { header: 'Has CV', key: '__hasCv' }, // computed from attachments[]
  ],
  aspiring: [
    { header: 'Has Land Access', key: 'hasLandAccess' },
    { header: 'Holding Back', key: 'holdingBack' },
    { header: 'Realistic Start', key: 'realisticStart' },
  ],
};

function csvEscape(v) {
  let s = String(v ?? '');
  if (Array.isArray(v)) s = v.join('; ');
  s = s.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // Prevent CSV formula injection
  return `"${s}"`;
}

export async function exportCsv(req, res, next) {
  try {
    // Spec §6.8 — pre-detect which profile groups have data so we only emit
    // those per-profile columns (keeps the CSV narrow when only some profiles
    // appear in the export set).
    const profilesPresent = new Set(await Application.distinct('userType'));
    const activeGroups = Object.entries(PROFILE_COLUMN_GROUPS)
      .filter(([profile]) => profilesPresent.has(profile));

    // Universal columns (spec §6.8) + admin utility columns (Source, Company,
    // Follow-up, Admin Notes) retained for operator workflow.
    const universalHeaders = [
      'Ref Number', 'Type', 'Status', 'Classification', 'Activity Level',
      'First Name', 'Surname', 'Email', 'Phone', 'Company',
      'Source', 'Tags', 'Feedback',
      'Follow-Up Required', 'Follow-Up Due', 'Follow-Up Notes',
      'Admin Notes', 'Created At', 'Submitted',
    ];
    const profileHeaders = activeGroups.flatMap(([, cols]) => cols.map((c) => c.header));
    const headers = [...universalHeaders, ...profileHeaders];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bemore-applications.csv');
    res.write(headers.join(',') + '\n');

    // Stream with cursor — doesn't load all records into memory
    const cursor = Application.find()
      .sort({ submittedAt: -1 })
      .select('refNumber userType status classification engagementSource personal formData tags followUp adminNotes submittedAt attachments')
      .lean()
      .cursor();

    let count = 0;
    for await (const a of cursor) {
      const fd = a.formData || {};
      const universalRow = [
        a.refNumber, a.userType, a.status,
        a.classification || 'unclassified',
        fd.activityLevel || '',
        a.personal?.firstName, a.personal?.surname,
        redactEmail(a.personal?.email || ''), redactPhone(a.personal?.phone || ''),
        a.personal?.companyName || '',
        a.engagementSource || 'direct',
        (a.tags || []).join('; '),
        fd.feedback || '',
        a.followUp?.required ? 'Yes' : 'No', a.followUp?.dueDate || '', a.followUp?.notes || '',
        a.adminNotes || '',
        a.submittedAt ? new Date(a.submittedAt).toISOString() : '',
        a.submittedAt ? new Date(a.submittedAt).toISOString().split('T')[0] : '',
      ];
      const profileCells = activeGroups.flatMap(([profile, cols]) => {
        // Only this row's profile contributes its values; other groups render empty.
        if (a.userType !== profile) return cols.map(() => '');
        return cols.map((c) => {
          if (c.key === '__hasCv') {
            return Array.isArray(a.attachments) && a.attachments.some((x) => x.field === 'cv') ? 'Yes' : 'No';
          }
          const v = fd[c.key];
          return Array.isArray(v) ? v.join('; ') : (v ?? '');
        });
      });
      const row = [...universalRow, ...profileCells].map(csvEscape).join(',');
      res.write(row + '\n');
      count++;
    }

    track('export.csv', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      meta: { count },
      req,
    });

    // Log to AdminAuditLog
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'data_export',
      meta: { count, type: 'csv' },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

    res.end();
  } catch (err) {
    next(err);
  }
}

// ── Admin: bulk status update ──
export async function bulkUpdateStatus(req, res, next) {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    if (!status || !APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (ids.length > 100) {
      return res.status(400).json({ success: false, message: 'Maximum 100 items per bulk action' });
    }

    const result = await Application.updateMany(
      { _id: { $in: ids } },
      { $set: { status, updatedAt: new Date() } },
    );

    track('application.bulk_status', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      meta: { count: result.modifiedCount, newStatus: status, ids },
      req,
    });

    // Log to AdminAuditLog
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'bulk_status_update',
      meta: { count: result.modifiedCount, newStatus: status },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

    // Send email notifications for significant status changes
    if (['shortlisted', 'invited', 'funded'].includes(status)) {
      const apps = await Application.find({ _id: { $in: ids } }).select('personal refNumber');
      for (const app of apps) {
        if (app.personal?.email) {
          sendStatusNotification(app.personal.email, app.refNumber, app.personal.firstName, status)
            .catch(err => logger.error('Bulk status notification failed', { error: err.message, refNumber: app.refNumber }));
        }
      }
    }

    res.json({ success: true, data: { updated: result.modifiedCount } });
  } catch (err) {
    next(err);
  }
}

// ──────────────────────────────────────────────────────────────
// Attachments — spec §8.3, §8.4, §8.5
// ──────────────────────────────────────────────────────────────

/** Find an attachment entry by storedAs on a loaded Application doc/lean obj. */
function findAttachment(app, storedAs) {
  if (!app?.attachments) return null;
  return app.attachments.find((a) => a.storedAs === storedAs) || null;
}

/** Helper: return 404 if app is null, 404 if attachment missing, 410 if file gone. */
async function loadAppAndAttachment(refNumber, storedAs) {
  const app = await Application.findOne({ refNumber }).lean();
  if (!app) return { error: { status: 404, code: 'APPLICATION_NOT_FOUND', message: 'Application not found' } };
  const att = findAttachment(app, storedAs);
  if (!att) return { error: { status: 404, code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment not found' } };
  const stat = await cvStat(storedAs);
  if (!stat.exists) return { app, att, error: { status: 410, code: 'FILE_MISSING_ON_DISK', message: 'File no longer exists on disk' } };
  return { app, att, path: stat.path };
}

/** Stream a file as an attachment download with Content-Disposition. */
function streamFile(res, absPath, originalFilename, mimeType) {
  // RFC 5987 / RFC 6266 — quote the filename, strip quotes from filename itself.
  const safeName = String(originalFilename || 'attachment').replace(/"/g, '');
  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  const stream = fs.createReadStream(absPath);
  stream.on('error', (err) => {
    logger.error('Attachment stream error', { error: err.message, path: absPath });
    if (!res.headersSent) res.status(500).end();
    else res.destroy(err);
  });
  stream.pipe(res);
}

// ── Admin: GET /api/applications/:refNumber/attachment/:storedAs — spec §8.3 ──
export async function downloadAttachment(req, res, next) {
  try {
    const { refNumber, storedAs } = req.params;
    const result = await loadAppAndAttachment(refNumber, storedAs);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, code: result.error.code, message: result.error.message });
    }
    const { app, att, path: absPath } = result;

    // Audit log first (so failed streams still record the access attempt).
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'attachment.download',
      target: { model: 'Application', id: app._id, refNumber: app.refNumber },
      details: { storedAs: att.storedAs, filename: att.filename },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch((err) => logger.error('Audit log failed', { error: err.message }));

    streamFile(res, absPath, att.filename, att.mimeType);
  } catch (err) {
    next(err);
  }
}

// ── Admin: DELETE /api/applications/:refNumber/attachment/:storedAs — spec §8.4 ──
export async function deleteAttachment(req, res, next) {
  try {
    const { refNumber, storedAs } = req.params;
    const app = await Application.findOne({ refNumber });
    if (!app) {
      return res.status(404).json({ success: false, code: 'APPLICATION_NOT_FOUND', message: 'Application not found' });
    }
    const att = findAttachment(app, storedAs);
    if (!att) {
      return res.status(404).json({ success: false, code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment not found' });
    }

    // Disk delete is best-effort. Failure must not block DB delete.
    const diskOk = await deleteCvFile(storedAs);
    if (!diskOk) {
      logger.warn('Attachment disk delete failed (orphan left for sweeper)', { refNumber, storedAs });
    }

    // Remove from DB regardless of disk outcome.
    app.attachments = app.attachments.filter((a) => a.storedAs !== storedAs);
    await app.save();

    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'attachment.delete',
      target: { model: 'Application', id: app._id, refNumber: app.refNumber },
      details: { storedAs, filename: att.filename, diskDeleted: diskOk },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch((err) => logger.error('Audit log failed', { error: err.message }));

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ── Public: GET /api/applications/:refNumber/attachment/:storedAs/signed — spec §8.5 ──
// No auth, no CSRF. Verifies HMAC signature + expiry from query string.
export async function downloadSignedAttachment(req, res, next) {
  try {
    const { refNumber, storedAs } = req.params;
    const { expires, sig } = req.query;

    const verdict = verifySignedLink(refNumber, storedAs, expires, sig);
    if (!verdict.ok) {
      const status = verdict.code === 'LINK_EXPIRED' ? 410 : 403;
      return res.status(status).json({ success: false, code: verdict.code, message: verdict.code === 'LINK_EXPIRED' ? 'Signed link has expired' : 'Bad signature' });
    }

    const result = await loadAppAndAttachment(refNumber, storedAs);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, code: result.error.code, message: result.error.message });
    }
    const { app, att, path: absPath } = result;

    await AdminAuditLog.create({
      admin: { id: null, email: 'self-service' },
      action: 'attachment.signed-download',
      target: { model: 'Application', id: app._id, refNumber: app.refNumber },
      details: { storedAs: att.storedAs, filename: att.filename, actor: 'self-service' },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch((err) => logger.error('Audit log failed', { error: err.message }));

    streamFile(res, absPath, att.filename, att.mimeType);
  } catch (err) {
    next(err);
  }
}

// ── Admin: send summit reminders ──
export async function sendReminders(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    if (ids.length > 100) {
      return res.status(400).json({ success: false, message: 'Maximum 100 items per batch' });
    }

    const apps = await Application.find({ _id: { $in: ids } }).select('personal refNumber');
    let sent = 0;
    for (const app of apps) {
      if (app.personal?.email) {
        sendSummitReminder(app.personal.email, app.refNumber, app.personal.firstName)
          .catch(err => logger.error('Summit reminder email failed', { error: err.message, refNumber: app.refNumber }));
        sent++;
      }
    }

    track('email.summit_reminder', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      meta: { count: sent, ids },
      req,
    });

    // Log to AdminAuditLog
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'email_reminder_sent',
      meta: { count: sent },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

    res.json({ success: true, data: { sent } });
  } catch (err) {
    next(err);
  }
}
