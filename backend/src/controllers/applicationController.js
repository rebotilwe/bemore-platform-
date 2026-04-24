import Application from '../models/Application.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { APPLICATION_STATUSES } from '../constants/enums.js';
import * as appService from '../services/applicationService.js';
import { track } from '../services/analyticsService.js';
import { sendSubmissionConfirmation, sendStatusNotification, sendSummitReminder } from '../utils/mailer.js';
import { redactEmail, redactPhone } from '../utils/redactPII.js';

export async function submit(req, res, next) {
  try {
    const app = await appService.createApplication(req.body);

    track('application.submitted', 'application', {
      actor: { type: 'applicant', email: redactEmail(app.personal.email) },
      target: { model: 'Application', id: app._id.toString(), refNumber: app.refNumber },
      meta: { userType: app.userType, tags: app.tags },
      req,
    });

    sendSubmissionConfirmation(app.personal.email, app.refNumber, app.personal.firstName).catch(() => {});

    res.status(201).json({ success: true, data: { refNumber: app.refNumber } });
  } catch (err) {
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
    }).catch(err => console.error('Audit log failed:', err.message));

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
    }).catch(err => console.error('Audit log failed:', err.message));

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
    }).catch(err => console.error('Audit log failed:', err.message));

    // Send email notification on status change
    if (updates.status && app.personal?.email) {
      sendStatusNotification(app.personal.email, app.refNumber, app.personal.firstName, updates.status).catch(() => {});
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
    }).catch(err => console.error('Audit log failed:', err.message));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const headers = ['Ref Number', 'Type', 'Status', 'Classification', 'Source', 'First Name', 'Surname', 'Email', 'Phone', 'Company', 'Est. Value', 'Project Stage', 'Land Status', 'Tags', 'Follow-Up Required', 'Follow-Up Due', 'Follow-Up Notes', 'Admin Notes', 'Submitted'];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bemore-applications.csv');
    res.write(headers.join(',') + '\n');

    // Stream with cursor — doesn't load all records into memory
    const cursor = Application.find()
      .sort({ submittedAt: -1 })
      .select('refNumber userType status classification engagementSource personal formData tags followUp adminNotes submittedAt')
      .lean()
      .cursor();

    let count = 0;
    for await (const a of cursor) {
      const row = [
        a.refNumber, a.userType, a.status,
        a.classification || 'unclassified', a.engagementSource || 'direct',
        a.personal?.firstName, a.personal?.surname, redactEmail(a.personal?.email || ''), redactPhone(a.personal?.phone || ''),
        a.personal?.companyName || '',
        a.formData?.estimatedValue || '', a.formData?.projectStage || '', a.formData?.landStatus || '',
        (a.tags || []).join('; '),
        a.followUp?.required ? 'Yes' : 'No', a.followUp?.dueDate || '', a.followUp?.notes || '',
        a.adminNotes || '', a.submittedAt ? new Date(a.submittedAt).toISOString().split('T')[0] : '',
      ].map(v => {
        let s = String(v ?? '').replace(/"/g, '""');
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // Prevent CSV formula injection
        return `"${s}"`;
      }).join(',');
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
    }).catch(err => console.error('Audit log failed:', err.message));

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
    }).catch(err => console.error('Audit log failed:', err.message));

    // Send email notifications for significant status changes
    if (['shortlisted', 'invited', 'funded'].includes(status)) {
      const apps = await Application.find({ _id: { $in: ids } }).select('personal refNumber');
      for (const app of apps) {
        if (app.personal?.email) {
          sendStatusNotification(app.personal.email, app.refNumber, app.personal.firstName, status).catch(() => {});
        }
      }
    }

    res.json({ success: true, data: { updated: result.modifiedCount } });
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
        sendSummitReminder(app.personal.email, app.refNumber, app.personal.firstName).catch(() => {});
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
    }).catch(err => console.error('Audit log failed:', err.message));

    res.json({ success: true, data: { sent } });
  } catch (err) {
    next(err);
  }
}
