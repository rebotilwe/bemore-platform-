import Application from '../models/Application.js';
import { APPLICATION_STATUSES } from '../constants/enums.js';
import * as appService from '../services/applicationService.js';
import { track } from '../services/analyticsService.js';
import { sendSubmissionConfirmation, sendStatusNotification } from '../utils/mailer.js';

export async function submit(req, res, next) {
  try {
    const app = await appService.createApplication(req.body);

    track('application.submitted', 'application', {
      actor: { type: 'applicant', email: app.personal.email },
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

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const apps = await appService.getAllApplications();
    const headers = ['Ref Number', 'Type', 'Status', 'First Name', 'Surname', 'Email', 'Phone', 'Company', 'Tags', 'Submitted'];
    const rows = apps.map(a => [
      a.refNumber, a.userType, a.status,
      a.personal.firstName, a.personal.surname, a.personal.email, a.personal.phone,
      a.personal.companyName || '', a.tags.join('; '), a.submittedAt,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    track('export.csv', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      meta: { count: apps.length },
      req,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bemore-applications.csv');
    res.send([headers.join(','), ...rows].join('\n'));
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
