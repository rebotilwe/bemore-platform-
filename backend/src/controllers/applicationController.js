import Application from '../models/Application.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { APPLICATION_STATUSES } from '../constants/enums.js';
import * as appService from '../services/applicationService.js';
import { track } from '../services/analyticsService.js';
import { 
  sendSubmissionConfirmation, 
  sendStatusNotification, 
  sendSummitReminder,
  sendDepartmentNotification 
} from '../utils/mailer.js';
import { redactEmail, redactPhone } from '../utils/redactPII.js';
import logger from '../utils/logger.js';
import { finaliseUpload, finaliseUploads, cvStat, deleteCvFile, readFileBuffer } from '../services/uploadService.js';
import { verifySignedLink } from '../utils/signedLinks.js';
import {
  isProfessionalAtCapacity,
  assignProjectToProfessional,
  completeProjectForProfessional,
  getProfessionalWorkloadSummary,
} from '../services/routingService.js';

// ── Public: CV upload — spec §8.1 ──
// Returns { filename, storedAs, size, mimeType }. No DB write here.
// ── Public: CV upload ──
export async function uploadCv(req, res, next) {
  try {
    console.log('🟢 uploadCv controller hit');
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    
    if (!file) {
      return res.status(400).json({ success: false, code: 'NO_FILE', message: 'No file in request' });
    }
    const payload = await finaliseUpload(file);
    res.status(200).json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
}

// ── Public: Multi-document upload ──
export async function uploadDocument(req, res, next) {
  try {
    console.log('🟢 uploadDocument controller hit');
    console.log('Field:', req.body?.field);
    console.log('Files count:', req.files?.length);

    const uploadedFile = (req.files && req.files.length > 0 ? req.files[0] : null) || req.file || null;

    if (!uploadedFile) {
      return res.status(400).json({ success: false, code: 'NO_FILE', message: 'No file in request' });
    }

    const field = req.body?.field || uploadedFile.fieldname || 'cv';

    const allowedFields = ['cv', 'company_registration', 'tax_clearance', 'bee_certificate', 'professional_indemnity'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_FIELD',
        message: `Invalid document type. Allowed: ${allowedFields.join(', ')}`,
      });
    }

    uploadedFile.fieldname = field;

    const results = await finaliseUploads([uploadedFile]);
    const result = results[0];

    if (!result || !result.valid) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: result?.error || 'File validation failed',
      });
    }

    return res.status(200).json({
      success: true,
      file: {
        field: result.field,
        filename: result.filename,
        storedAs: result.storedAs,
        size: result.size,
        mimeType: result.mimeType,
        expiryDate: result.expiryDate ?? null,
      },
    });
  } catch (err) {
    logger.error('Document upload error:', err);
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

    sendDepartmentNotification(app)
      .catch(err => logger.error('Department notification failed', { error: err.message, refNumber: app.refNumber }));

    res.status(201).json({ success: true, data: { refNumber: app.refNumber } });
  } catch (err) {
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

const PROFILE_COLUMN_GROUPS = {
  developer: [
    { header: 'Development Stage', key: 'developmentStage' },
    { header: 'Project Value', key: 'projectValue' },
    { header: 'Funding Position', key: 'fundingPosition' },
    { header: 'Biggest Constraint', key: 'biggestConstraint' },
    { header: 'Portfolio Size', key: 'portfolioSize' },
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
    { header: 'Accreditation', key: 'accreditation' },
  ],
  professional: [
    { header: 'Primary Role', key: 'primaryRole' },
    { header: 'Experience Level', key: 'experienceLevel' },
    { header: 'Provinces', key: 'provinces' },
    { header: 'Avg Project Size', key: 'avgProjectSize' },
    { header: 'Has CV', key: '__hasCv' },
    { header: 'Docs Verified', key: '__docsVerified' },
  ],
  aspiring: [
    { header: 'Has Land Access', key: 'hasLandAccess' },
    { header: 'Holding Back', key: 'holdingBack' },
    { header: 'Realistic Start', key: 'realisticStart' },
    { header: 'Equity Available', key: 'equityAmount' },
  ],
};

function csvEscape(v) {
  let s = String(v ?? '');
  if (Array.isArray(v)) s = v.join('; ');
  s = s.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s}"`;
}

export async function exportCsv(req, res, next) {
  try {
    const profilesPresent = new Set(await Application.distinct('userType'));
    const activeGroups = Object.entries(PROFILE_COLUMN_GROUPS)
      .filter(([profile]) => profilesPresent.has(profile));

    const universalHeaders = [
      'Ref Number', 'Type', 'Status', 'Classification', 'Activity Level',
      'First Name', 'Surname', 'Email', 'Phone', 'Company',
      'Source', 'Tags', 'Feedback',
      'Follow-Up Required', 'Follow-Up Due', 'Follow-Up Notes',
      'Admin Notes', 'Created At', 'Submitted',
      'Department', 'Lead Type', 'Routing Status',
    ];
    const profileHeaders = activeGroups.flatMap(([, cols]) => cols.map((c) => c.header));
    const headers = [...universalHeaders, ...profileHeaders];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bemore-applications.csv');
    res.write(headers.join(',') + '\n');

    const cursor = Application.find()
      .sort({ submittedAt: -1 })
      .select('refNumber userType status classification engagementSource personal formData tags followUp adminNotes submittedAt attachments routing')
      .lean()
      .cursor();

    let count = 0;
    for await (const a of cursor) {
      const fd = a.formData || {};
      const routing = a.routing || {};
      
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
        routing.department || 'unassigned',
        routing.leadType || 'general',
        routing.status || 'pending',
      ];
      
      const profileCells = activeGroups.flatMap(([profile, cols]) => {
        if (a.userType !== profile) return cols.map(() => '');
        return cols.map((c) => {
          if (c.key === '__hasCv') {
            return Array.isArray(a.attachments) && a.attachments.some((x) => x.field === 'cv') ? 'Yes' : 'No';
          }
          if (c.key === '__docsVerified') {
            const docFields = ['company_registration', 'tax_clearance', 'bee_certificate', 'professional_indemnity'];
            const uploaded = a.attachments?.filter(x => docFields.includes(x.field)) || [];
            const verified = uploaded.filter(x => x.isVerified).length;
            return uploaded.length > 0 ? `${verified}/${uploaded.length}` : 'No docs';
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

    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'bulk_status_update',
      meta: { count: result.modifiedCount, newStatus: status },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

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

export async function bulkAssignDepartment(req, res, next) {
  try {
    const { ids, department } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    if (!department || !['pormat_sales', 'pormat_management', 'muma_consulting'].includes(department)) {
      return res.status(400).json({ success: false, message: 'Invalid department' });
    }
    if (ids.length > 100) {
      return res.status(400).json({ success: false, message: 'Maximum 100 items per bulk action' });
    }

    const result = await Application.updateMany(
      { _id: { $in: ids } },
      { $set: { 'routing.department': department, 'routing.status': 'assigned', updatedAt: new Date() } },
    );

    track('application.bulk_department', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      meta: { count: result.modifiedCount, department, ids },
      req,
    });

    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'bulk_department_assign',
      meta: { count: result.modifiedCount, department },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

    res.json({ success: true, data: { updated: result.modifiedCount } });
  } catch (err) {
    next(err);
  }
}

// ──────────────────────────────────────────────────────────────
// Attachments — spec §8.3, §8.4, §8.5
// ──────────────────────────────────────────────────────────────

function findAttachment(app, storedAs) {
  if (!app?.attachments) return null;
  return app.attachments.find((a) => a.storedAs === storedAs) || null;
}

async function loadAppAndAttachment(refNumber, storedAs) {
  const app = await Application.findOne({ refNumber }).lean();
  if (!app) return { error: { status: 404, code: 'APPLICATION_NOT_FOUND', message: 'Application not found' } };
  const att = findAttachment(app, storedAs);
  if (!att) return { error: { status: 404, code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment not found' } };
  const stat = await cvStat(storedAs, att.field);
  if (!stat.exists) return { app, att, error: { status: 410, code: 'FILE_MISSING', message: 'File no longer exists in storage' } };
  return { app, att };
}

async function sendAttachment(res, storedAs, field, originalFilename, mimeType) {
  const safeName = String(originalFilename || 'attachment').replace(/"/g, '');
  const buffer = await readFileBuffer(storedAs, field);
  if (!buffer) {
    logger.error('Attachment fetch from storage failed', { storedAs, field });
    if (!res.headersSent) res.status(502).json({ success: false, message: 'Failed to retrieve file from storage' });
    return;
  }
  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.end(buffer);
}

export async function downloadAttachment(req, res, next) {
  try {
    const { refNumber, storedAs } = req.params;
    const result = await loadAppAndAttachment(refNumber, storedAs);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, code: result.error.code, message: result.error.message });
    }
    const { app, att } = result;

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

    await sendAttachment(res, att.storedAs, att.field, att.filename, att.mimeType);
  } catch (err) {
    next(err);
  }
}

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

    const diskOk = await deleteCvFile(storedAs, att.field);
    if (!diskOk) {
      logger.warn('Attachment storage delete failed (orphan left for sweeper)', { refNumber, storedAs });
    }

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

export async function verifyAttachment(req, res, next) {
  try {
    const { refNumber, storedAs } = req.params;
    const { approved, rejectionReason } = req.body;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({ success: false, message: 'approved (boolean) is required' });
    }
    if (approved === false && !rejectionReason) {
      return res.status(400).json({ success: false, message: 'rejectionReason is required when rejecting a document' });
    }

    const app = await Application.findOne({ refNumber });
    if (!app) {
      return res.status(404).json({ success: false, code: 'APPLICATION_NOT_FOUND', message: 'Application not found' });
    }
    const att = findAttachment(app, storedAs);
    if (!att) {
      return res.status(404).json({ success: false, code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment not found' });
    }

    att.isVerified = approved;
    att.verifiedAt = new Date();
    att.verifiedBy = redactEmail(req.admin?.email) || 'unknown';
    att.rejectionReason = approved ? undefined : rejectionReason;
    await app.save();

    track('attachment.verified', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      target: { model: 'Application', id: app._id.toString(), refNumber: app.refNumber },
      meta: { storedAs, field: att.field, approved },
      req,
    });

    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: approved ? 'attachment.verify' : 'attachment.reject',
      target: { model: 'Application', id: app._id, refNumber: app.refNumber },
      details: { storedAs, field: att.field, filename: att.filename, rejectionReason: att.rejectionReason },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch((err) => logger.error('Audit log failed', { error: err.message }));

    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
}


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
    const { app, att } = result;

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

    await sendAttachment(res, att.storedAs, att.field, att.filename, att.mimeType);
  } catch (err) {
    next(err);
  }
}

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

export async function getRoutingStats(req, res, next) {
  try {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: {
            department: '$routing.department',
            status: '$routing.status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.department',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count',
            },
          },
          total: { $sum: '$count' },
        },
      },
    ]);

    track('routing.stats', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      req,
    });

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}
// ── Public: Status lookup ──
export async function lookupStatus(req, res, next) {
  try {
    const { refNumber, email } = req.body;
    if (!refNumber || !email) {
      return res.status(400).json({ success: false, message: 'refNumber and email required' });
    }
    const app = await Application.findOne({
      refNumber: refNumber.toUpperCase(),
      'personal.email': email.toLowerCase(),
    }).lean();
    if (!app) {
      return res.status(404).json({ success: false, message: 'No application found. Please check your reference number and email.' });
    }
    return res.json({
      success: true,
      data: {
        refNumber: app.refNumber,
        firstName: app.personal.firstName,
        userType: app.userType,
        status: app.status,
        tags: app.tags,
        summitAccess: app.dealRoom?.summitAccess || false,
        allocatedProjects: app.allocatedProjects || [],
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── Public: POPIA data export ──
export async function exportMyData(req, res, next) {
  try {
    const { refNumber, email } = req.body;
    const app = await Application.findOne({
      refNumber: refNumber?.toUpperCase(),
      'personal.email': email?.toLowerCase(),
    }).lean();
    if (!app) {
      return res.status(404).json({ success: false, message: 'No application found' });
    }
    return res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
}

// ── Admin: Professional workload summary ──
// Returns capacity/availability across all Built Environment Professionals,
// plus a per-professional breakdown for the admin workload view.
export async function professionalsWorkload(req, res, next) {
  try {
    const professionals = await Application.find({ userType: 'professional' }).lean();

    const summary = getProfessionalWorkloadSummary(professionals);

    const breakdown = professionals.map((app) => ({
      id: app._id,
      refNumber: app.refNumber,
      name: `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim(),
      status: app.status,
      activeProjects: app.workload?.activeProjects || 0,
      maxProjects: app.workload?.maxProjects || 5,
      atCapacity: (app.workload?.activeProjects || 0) >= (app.workload?.maxProjects || 5),
      allocatedProjects: app.allocatedProjects || [],
    }));

    track('professionals.workload_viewed', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      req,
    });

    res.json({ success: true, data: { summary, professionals: breakdown } });
  } catch (err) {
    next(err);
  }
}

// ── Admin: Assign a project to a Built Environment Professional ──
// Only allowed once the professional has been onboarded to the panel
// (status must be 'invited'/"Onboarded" or 'funded'). Enforces the 5-project cap.
export async function assignProject(req, res, next) {
  try {
    const { projectId } = req.body;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Not found' });

    if (app.userType !== 'professional') {
      return res.status(400).json({ success: false, message: 'Application is not a Built Environment Professional' });
    }

    if (!['invited', 'funded'].includes(app.status)) {
      return res.status(400).json({
        success: false,
        message: 'Professional must be onboarded to the panel before a project can be assigned',
      });
    }

    if (isProfessionalAtCapacity(app)) {
      return res.status(400).json({
        success: false,
        message: `Professional is at capacity (${app.workload?.maxProjects || 5} projects max)`,
      });
    }

    if ((app.allocatedProjects || []).includes(projectId)) {
      return res.status(400).json({ success: false, message: 'Project already assigned to this professional' });
    }

    assignProjectToProfessional(app, projectId);
    await app.save();

    track('professional.project_assigned', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      target: { model: 'Application', id: app._id.toString(), refNumber: app.refNumber },
      meta: { projectId, activeProjects: app.workload.activeProjects },
      req,
    });

    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'professional_project_assigned',
      target: { model: 'Application', id: app._id, refNumber: app.refNumber },
      details: { projectId, activeProjects: app.workload.activeProjects },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

    res.json({ success: true, data: app });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
}

// ── Admin: Mark a project complete for a Built Environment Professional ──
// Frees up one of their 5 slots.
export async function completeProject(req, res, next) {
  try {
    const { projectId } = req.body;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Not found' });

    if (app.userType !== 'professional') {
      return res.status(400).json({ success: false, message: 'Application is not a Built Environment Professional' });
    }

    if (!(app.allocatedProjects || []).includes(projectId)) {
      return res.status(400).json({ success: false, message: 'Project is not currently assigned to this professional' });
    }

    completeProjectForProfessional(app, projectId);
    await app.save();

    track('professional.project_completed', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      target: { model: 'Application', id: app._id.toString(), refNumber: app.refNumber },
      meta: { projectId, activeProjects: app.workload.activeProjects },
      req,
    });

    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'professional_project_completed',
      target: { model: 'Application', id: app._id, refNumber: app.refNumber },
      details: { projectId, activeProjects: app.workload.activeProjects },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message }));

    res.json({ success: true, data: app });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
}

// ── Public: POPIA data delete ──
export async function deleteMyData(req, res, next) {
  try {
    const { refNumber, email, confirm } = req.body;
    if (confirm !== 'DELETE') {
      return res.status(400).json({ success: false, message: 'Must confirm deletion with "DELETE"' });
    }
    const result = await Application.deleteOne({
      refNumber: refNumber?.toUpperCase(),
      'personal.email': email?.toLowerCase(),
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'No application found' });
    }
    return res.json({ success: true, message: 'Your data has been permanently deleted' });
  } catch (err) {
    next(err);
  }
}