import Application from '../models/Application.js';
import { APPLICATION_STATUSES, FUNDER_NAMES, SORTABLE_FIELDS } from '../constants/enums.js';
import { sendSubmissionConfirmation } from '../utils/mailer.js';

// ── Public: submit application ──
export async function submit(req, res, next) {
  try {
    const app = new Application(req.body);
    await app.save();

    // Fire-and-forget confirmation email
    sendSubmissionConfirmation(
      app.personal.email,
      app.refNumber,
      app.personal.firstName,
    ).catch(() => {});

    res.status(201).json({ success: true, data: { refNumber: app.refNumber } });
  } catch (err) {
    next(err);
  }
}

// ── Admin: list applications with filters, search, sort, pagination ──
export async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.userType && req.query.userType !== 'all') filter.userType = req.query.userType;
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.tags) filter.tags = req.query.tags;
    if (req.query.search) {
      const q = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { 'personal.firstName': q },
        { 'personal.surname': q },
        { 'personal.email': q },
        { refNumber: q },
      ];
    }

    // Sort
    let sort = { submittedAt: -1 };
    if (req.query.sortBy && SORTABLE_FIELDS.includes(req.query.sortBy)) {
      sort = { [req.query.sortBy]: req.query.order === 'asc' ? 1 : -1 };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const total = await Application.countDocuments(filter);
    const data = await Application.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ── Admin: get single application ──
export async function getOne(req, res, next) {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
}

// ── Admin: update application (allowlisted fields only) ──
const ALLOWED_UPDATE_FIELDS = ['status', 'dealRoom', 'adminNotes'];

export async function update(req, res, next) {
  try {
    const updates = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Validate status
    if (updates.status && !APPLICATION_STATUSES.includes(updates.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Validate funder names
    if (updates.dealRoom?.funders) {
      if (!updates.dealRoom.funders.every(f => FUNDER_NAMES.includes(f))) {
        return res.status(400).json({ success: false, message: 'Invalid funder name' });
      }
    }

    updates.updatedAt = new Date();

    const app = await Application.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!app) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
}

// ── Admin: aggregate stats ──
export async function stats(_req, res, next) {
  try {
    const total = await Application.countDocuments();
    const [byType, byStatus, byTag, recentApps] = await Promise.all([
      Application.aggregate([{ $group: { _id: '$userType', count: { $sum: 1 } } }]),
      Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Application.aggregate([{ $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }]),
      Application.find().sort({ submittedAt: -1 }).limit(8),
    ]);
    res.json({ success: true, data: { total, byType, byStatus, byTag, recentApps } });
  } catch (err) {
    next(err);
  }
}

// ── Admin: CSV export ──
export async function exportCsv(_req, res, next) {
  try {
    const apps = await Application.find().sort({ submittedAt: -1 });
    const headers = ['Ref Number', 'Type', 'Status', 'First Name', 'Surname', 'Email', 'Phone', 'Company', 'Tags', 'Submitted'];
    const rows = apps.map(a => [
      a.refNumber, a.userType, a.status,
      a.personal.firstName, a.personal.surname, a.personal.email, a.personal.phone,
      a.personal.companyName || '', a.tags.join('; '), a.submittedAt,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bemore-applications.csv');
    res.send([headers.join(','), ...rows].join('\n'));
  } catch (err) {
    next(err);
  }
}
